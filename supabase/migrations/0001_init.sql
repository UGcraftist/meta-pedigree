-- 0001_init.sql — core schema for Meta Pedigree (T-002)
-- Source of truth: docs/design/data-model.md (entities, temporal rules, ER)
-- Decisions: DR-0003 (fact-centered, registry-driven, 5 precisions), DR-0005 (Supabase + RLS)
--
-- Conventions
--   * plural table names (PostgREST convention); docs use the singular entity names
--   * every temporal value carries a precision tag (NFR-014); a date column is NULL
--     exactly when its precision is 'unknown'
--   * reads go through PostgREST views (T-004); writes through SECURITY DEFINER RPCs
--     (T-007). R1 has no anon data access: every read policy requires an editor JWT.

-- ── Enumerations ─────────────────────────────────────────────────────────────

create type public.org_kind as enum ('company', 'lab', 'program', 'team', 'government', 'other');

create type public.fact_status as enum ('draft', 'in_review', 'published', 'disputed', 'superseded');

create type public.visibility as enum ('public', 'hidden');

create type public.certainty as enum ('exact', 'circa', 'before', 'after', 'between', 'unknown');

create type public.date_precision as enum ('day', 'month', 'year', 'unknown');

create type public.source_kind as enum ('article', 'interview', 'book', 'filing', 'dataset', 'video', 'other');

create type public.audit_action as enum ('create', 'update', 'submit', 'publish', 'retire', 'merge', 'seed');

-- ── Helpers ──────────────────────────────────────────────────────────────────

-- UUIDv7: 48-bit millisecond timestamp + random tail, version nibble 7, variant 10.
-- Used as the default key so rows sort by creation time (keyset pagination, api.md).
-- A SQL function instead of gen_random_uuid() because PostgreSQL 16 has no uuidv7().
create or replace function public.uuidv7() returns uuid
language plpgsql
volatile
as $$
declare
  ts_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  b bytea;
begin
  b := overlay(uuid_send(gen_random_uuid()) placing substring(int8send(ts_ms) from 3) from 1 for 6);
  b := set_byte(b, 6, (get_byte(b, 6) & 15) | 112);  -- version 7
  b := set_byte(b, 8, (get_byte(b, 8) & 63) | 128);  -- variant RFC 4122
  return encode(b, 'hex')::uuid;
end;
$$;

-- R1 role check: the editor role lives in the Auth JWT (DR-0005), not in a table,
-- so there is one place to grant it (Supabase Auth user metadata).
create or replace function public.is_editor() returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'editor';
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── Controlled vocabulary (registry, extensible without migration: US-024) ───

create table public.relation_types (
  code text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  label_zh text not null,
  label_en text not null,
  -- which entity kinds may appear on each end; empty = any
  subject_kinds text[] not null default '{}',
  object_kinds text[] not null default '{}',
  -- true => this relation draws parent→child in the pedigree tree (US-004)
  implied_parent boolean not null default false,
  -- per-relation extra attributes (e.g. control percentage) declared as JSON Schema
  attrs_schema jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.stance_axes (
  code text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  label_zh text not null,
  label_en text not null,
  scale_min numeric(4, 2) not null,
  scale_max numeric(4, 2) not null,
  anchors jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint stance_axes_scale check (scale_min < scale_max)
);

-- ── Entities ─────────────────────────────────────────────────────────────────

create table public.orgs (
  id uuid primary key default public.uuidv7(),
  name text not null check (btrim(name) <> ''),
  kind public.org_kind not null default 'company',
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  founded_date date,
  founded_precision public.date_precision not null default 'unknown',
  dissolved_date date,
  dissolved_precision public.date_precision not null default 'unknown',
  visibility public.visibility not null default 'public',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orgs_founded_precision check (
    (founded_precision = 'unknown' and founded_date is null)
    or (founded_precision <> 'unknown' and founded_date is not null)
  ),
  constraint orgs_dissolved_precision check (
    (dissolved_precision = 'unknown' and dissolved_date is null)
    or (dissolved_precision <> 'unknown' and dissolved_date is not null)
  )
);

create table public.persons (
  id uuid primary key default public.uuidv7(),
  name text not null check (btrim(name) <> ''),
  aliases text[] not null default '{}',
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  birth_date date,
  birth_precision public.date_precision not null default 'unknown',
  death_date date,
  death_precision public.date_precision not null default 'unknown',
  visibility public.visibility not null default 'public',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint persons_birth_precision check (
    (birth_precision = 'unknown' and birth_date is null)
    or (birth_precision <> 'unknown' and birth_date is not null)
  ),
  constraint persons_death_precision check (
    (death_precision = 'unknown' and death_date is null)
    or (death_precision <> 'unknown' and death_date is not null)
  )
);

create table public.app_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

-- ── Facts (the single store for relations, roles and events) ────────────────

create table public.facts (
  id uuid primary key default public.uuidv7(),
  subject_kind text not null check (subject_kind in ('org', 'person')),
  subject_id uuid not null,
  predicate_code text not null references public.relation_types (code),
  object_kind text check (object_kind in ('org', 'person')),
  object_id uuid,
  start_date date,
  start_precision public.date_precision not null default 'unknown',
  end_date date,
  end_precision public.date_precision not null default 'unknown',
  qualifier public.certainty not null default 'exact',
  -- e.g. percentage of control (FR-015); free-form extras in attrs (FR-013)
  amount numeric(6, 2) check (amount is null or (amount >= 0 and amount <= 100)),
  attrs jsonb not null default '{}'::jsonb,
  certainty public.certainty not null default 'exact',
  status public.fact_status not null default 'draft',
  visibility public.visibility not null default 'public',
  -- revision chain: this row replaces the row referenced here (old row -> superseded)
  revision_of uuid references public.facts (id),
  no_source boolean not null default false,
  created_by uuid references public.app_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint facts_object_pair check (
    (object_kind is null and object_id is null)
    or (object_kind is not null and object_id is not null)
  ),
  constraint facts_amount_scope check (amount is null or predicate_code = 'controlled_by'),
  constraint facts_start_precision check (
    (start_precision = 'unknown' and start_date is null)
    or (start_precision <> 'unknown' and start_date is not null)
  ),
  constraint facts_end_precision check (
    (end_precision = 'unknown' and end_date is null)
    or (end_precision <> 'unknown' and end_date is not null)
  ),
  constraint facts_period_order check (
    start_date is null or end_date is null or start_date < end_date
  ),
  constraint facts_qualifier_needs_unknown check (
    qualifier <> 'unknown' or (start_date is null and end_date is null)
  )
);

-- ── Sources and their link to facts ──────────────────────────────────────────

create table public.sources (
  id uuid primary key default public.uuidv7(),
  kind public.source_kind not null default 'article',
  title text not null check (btrim(title) <> ''),
  author text,
  url text check (url is null or url ~ '^https?://'),
  page text,
  quote text,
  published_at date,
  accessed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.fact_sources (
  fact_id uuid not null references public.facts (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete restrict,
  locator text,
  primary key (fact_id, source_id)
);

-- ── Party stances (domain-neutral slots; R1 test set leaves them empty) ─────

create table public.stances (
  id uuid primary key default public.uuidv7(),
  party_org_id uuid not null references public.orgs (id),
  axis_code text not null references public.stance_axes (code),
  value numeric(4, 2) not null,
  target_org_id uuid references public.orgs (id),
  start_date date,
  start_precision public.date_precision not null default 'unknown',
  end_date date,
  end_precision public.date_precision not null default 'unknown',
  status public.fact_status not null default 'draft',
  visibility public.visibility not null default 'public',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stances_start_precision check (
    (start_precision = 'unknown' and start_date is null)
    or (start_precision <> 'unknown' and start_date is not null)
  ),
  constraint stances_end_precision check (
    (end_precision = 'unknown' and end_date is null)
    or (end_precision <> 'unknown' and end_date is not null)
  )
);

-- Value must sit on the axis scale; checked in a trigger because the bound lives
-- on stance_axes (a CHECK cannot read another table).
create or replace function public.check_stance_value() returns trigger
language plpgsql
as $$
declare
  ax public.stance_axes;
begin
  select * into ax from public.stance_axes where code = new.axis_code;
  if ax.code is null then
    raise exception 'unknown stance axis %', new.axis_code using errcode = '23503';
  end if;
  if new.value < ax.scale_min or new.value > ax.scale_max then
    raise exception 'stance value % outside axis % range [%, %]',
      new.value, ax.code, ax.scale_min, ax.scale_max using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger stances_check_value
  before insert or update on public.stances
  for each row execute function public.check_stance_value();

-- ── Audit (append-only) ─────────────────────────────────────────────────────

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.app_users (id),
  actor_email text,
  entity text not null,
  entity_id uuid,
  action public.audit_action not null,
  summary jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

create or replace function public.audit_log_append_only() returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log is append-only' using errcode = '42501';
end;
$$;

create trigger audit_log_no_update
  before update or delete on public.audit_log
  for each row execute function public.audit_log_append_only();

-- ── Triggers and indexes ────────────────────────────────────────────────────

create trigger orgs_touch before update on public.orgs
  for each row execute function public.touch_updated_at();
create trigger persons_touch before update on public.persons
  for each row execute function public.touch_updated_at();
create trigger facts_touch before update on public.facts
  for each row execute function public.touch_updated_at();
create trigger stances_touch before update on public.stances
  for each row execute function public.touch_updated_at();

create index facts_subject_idx on public.facts (subject_id, predicate_code);
create index facts_object_idx on public.facts (object_id) where object_id is not null;
create index facts_published_idx on public.facts (subject_id) where status = 'published';
create index facts_status_idx on public.facts (status);
create index orgs_visibility_kind_idx on public.orgs (visibility, kind);
create index orgs_name_idx on public.orgs (name);
create index sources_url_idx on public.sources (url) where url is not null;
create index stances_party_axis_idx on public.stances (party_org_id, axis_code);
create index audit_entity_idx on public.audit_log (entity, entity_id, at desc);

-- ── Row Level Security (R1: authenticated editor only, no anon access) ──────

alter table public.orgs enable row level security;
alter table public.persons enable row level security;
alter table public.facts enable row level security;
alter table public.sources enable row level security;
alter table public.fact_sources enable row level security;
alter table public.relation_types enable row level security;
alter table public.stance_axes enable row level security;
alter table public.stances enable row level security;
alter table public.audit_log enable row level security;
alter table public.app_users enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.orgs, public.persons, public.facts, public.sources,
  public.fact_sources, public.relation_types, public.stance_axes, public.stances
  to authenticated;
grant select on public.audit_log, public.app_users to authenticated;

-- Editors read everything (hidden included); visitors get nothing until R2.
create policy orgs_editor_read on public.orgs for select to authenticated using (public.is_editor());
create policy persons_editor_read on public.persons for select to authenticated using (public.is_editor());
create policy facts_editor_read on public.facts for select to authenticated using (public.is_editor());
create policy sources_editor_read on public.sources for select to authenticated using (public.is_editor());
create policy fact_sources_editor_read on public.fact_sources for select to authenticated using (public.is_editor());
create policy relation_types_editor_read on public.relation_types for select to authenticated using (public.is_editor());
create policy stance_axes_editor_read on public.stance_axes for select to authenticated using (public.is_editor());
create policy stances_editor_read on public.stances for select to authenticated using (public.is_editor());
create policy audit_log_editor_read on public.audit_log for select to authenticated using (public.is_editor());
create policy app_users_editor_read on public.app_users for select to authenticated using (public.is_editor());

-- Writes: no table-level policy. T-007 adds the SECURITY DEFINER RPCs that perform
-- validate → close old revision → insert → audit_log in one transaction.
