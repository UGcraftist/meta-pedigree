-- 0006_write_rpc: the only write path (T-007, FR-006/007/008/009, DR-0003)
--
-- R1 has no application server (DR-0005): edits arrive through PostgREST RPCs.
-- Every function is SECURITY DEFINER with a pinned search_path, checks the
-- editor role in the JWT itself, and is executable only by authenticated.
-- No table-level write policy is added: writes happen only here.
--
-- Migration-numbered in docs/design/data-model.md; content follows
-- docs/design/api.md. Re-runnable (create or replace).

-- ── Helpers ─────────────────────────────────────────────────────────────────

-- Normalized URL for source dedupe (docs/design/api.md, merge_source rules):
-- trim; lowercase scheme+host; strip fragment; drop default :80/:443;
-- no trailing slash on an empty path. Path/query case is preserved.
create or replace function public.normalize_url(p_url text) returns text
language plpgsql
immutable
as $$
declare
  v text;
  m text[];
  scheme text;
  authority text;
  rest text;
begin
  if p_url is null then
    return null;
  end if;
  v := regexp_replace(btrim(p_url), '#.*$', '');
  -- only http(s) URLs are normalized; anything else is returned trimmed
  if v !~* '^https?://' then
    return v;
  end if;
  m := regexp_match(v, '^([Hh][Tt][Tt][Pp][Ss]?)://([^/?]*)(.*)$');
  if m is null then
    return v;
  end if;
  scheme := lower(m[1]);
  authority := lower(m[2]);
  rest := m[3];
  if scheme = 'http' then
    authority := regexp_replace(authority, ':80$', '');
  else
    authority := regexp_replace(authority, ':443$', '');
  end if;
  if rest = '/' then
    rest := '';
  end if;
  return scheme || '://' || authority || rest;
end;
$$;

-- The audit trail and facts.created_by reference app_users, but nothing else in
-- the schema ever provisions a row there. Every write RPC calls this first, so
-- a signed-in editor is always a known actor (FR-007).
create or replace function public.ensure_app_user() returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  insert into public.app_users (id, email)
  select auth.uid(), nullif(auth.jwt() ->> 'email', '')
  where auth.uid() is not null
  on conflict (id) do nothing;
end;
$$;

-- ── upsert_fact ─────────────────────────────────────────────────────────────

-- Create a draft, or revise an existing fact (in place while draft/in_review).
-- payload: subject_kind, subject_id, predicate_code, object_kind?, object_id?,
--          start_date/precision?, end_date/precision?, amount?, attrs?,
--          visibility?, no_source?, revision_of?, id? (in-place edit),
--          sources?: [{url, kind?, title?, author?, page?, quote?,
--                      published_at?, accessed_at?, locator?}]
create or replace function public.upsert_fact(payload jsonb) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_fact_id uuid;
  v_existing_id uuid := nullif(payload ->> 'id', '')::uuid;
  v_subject_kind text := payload ->> 'subject_kind';
  v_subject_id uuid := nullif(payload ->> 'subject_id', '')::uuid;
  v_object_kind text := nullif(payload ->> 'object_kind', '');
  v_object_id uuid := nullif(payload ->> 'object_id', '')::uuid;
  v_predicate text := payload ->> 'predicate_code';
  v_status public.fact_status;
  v_rt public.relation_types;
  v_src jsonb;
  v_url text;
  v_sid uuid;
begin
  if not public.is_editor() then
    raise exception 'editor role required' using errcode = '42501';
  end if;
  perform public.ensure_app_user();

  -- predicate must be registered and active (FR-009 registry, no code change)
  select * into v_rt from public.relation_types where code = v_predicate;
  if not found then
    raise exception 'unknown predicate %', v_predicate using errcode = '23503';
  end if;
  if not v_rt.is_active then
    raise exception 'predicate % is inactive', v_predicate using errcode = '23514';
  end if;

  -- both ends must exist; a dangling id is named in the error (NFR UX)
  if v_subject_kind = 'org' then
    if not exists (select 1 from public.orgs where id = v_subject_id) then
      raise exception 'dangling subject org %', v_subject_id using errcode = '23503';
    end if;
  elsif v_subject_kind = 'person' then
    if not exists (select 1 from public.persons where id = v_subject_id) then
      raise exception 'dangling subject person %', v_subject_id using errcode = '23503';
    end if;
  else
    raise exception 'subject_kind must be org or person' using errcode = '23514';
  end if;

  if v_object_id is not null then
    if v_object_kind = 'org' then
      if not exists (select 1 from public.orgs where id = v_object_id) then
        raise exception 'dangling object org %', v_object_id using errcode = '23503';
      end if;
    elsif v_object_kind = 'person' then
      if not exists (select 1 from public.persons where id = v_object_id) then
        raise exception 'dangling object person %', v_object_id using errcode = '23503';
      end if;
    else
      raise exception 'object_kind must be org or person when object_id is set'
        using errcode = '23514';
    end if;
  end if;

  -- registry says which entity kinds may sit on each end (empty = any)
  if v_rt.subject_kinds is not null and array_length(v_rt.subject_kinds, 1) > 0
     and not (v_subject_kind = any (v_rt.subject_kinds)) then
    raise exception 'predicate % does not accept % subjects', v_predicate, v_subject_kind
      using errcode = '23514';
  end if;
  if v_rt.object_kinds is not null and array_length(v_rt.object_kinds, 1) > 0
     and v_object_kind is not null
     and not (v_object_kind = any (v_rt.object_kinds)) then
    raise exception 'predicate % does not accept % objects', v_predicate, v_object_kind
      using errcode = '23514';
  end if;

  -- amount only on controlled_by, date/precision pairing: enforced by table
  -- CHECKs (0001) on purpose — no duplicated validation here.
  -- attrs content is NOT validated against relation_types.attrs_schema in R1:
  -- pg_jsonschema is not installed; the column schema is declared now and
  -- enforced by T-014's UI validation until R2.

  if v_existing_id is not null then
    select status into v_status from public.facts where id = v_existing_id;
    if not found then
      raise exception 'dangling fact %', v_existing_id using errcode = '23503';
    end if;
    if v_status not in ('draft', 'in_review') then
      raise exception 'fact % is % and cannot be edited in place',
        v_existing_id, v_status using errcode = '23514';
    end if;
    update public.facts set
      subject_kind = v_subject_kind,
      subject_id = v_subject_id,
      predicate_code = v_predicate,
      object_kind = v_object_kind,
      object_id = v_object_id,
      start_date = nullif(payload ->> 'start_date', '')::date,
      start_precision = coalesce(
        nullif(payload ->> 'start_precision', '')::public.date_precision, 'unknown'),
      end_date = nullif(payload ->> 'end_date', '')::date,
      end_precision = coalesce(
        nullif(payload ->> 'end_precision', '')::public.date_precision, 'unknown'),
      amount = nullif(payload ->> 'amount', '')::numeric,
      attrs = coalesce(payload -> 'attrs', '{}'::jsonb),
      visibility = coalesce(
        nullif(payload ->> 'visibility', '')::public.visibility, 'public'),
      no_source = coalesce((payload ->> 'no_source')::boolean, false)
    where id = v_existing_id;
    v_fact_id := v_existing_id;
  else
    insert into public.facts (
      subject_kind, subject_id, predicate_code, object_kind, object_id,
      start_date, start_precision, end_date, end_precision, amount, attrs,
      visibility, no_source, revision_of, created_by
    ) values (
      v_subject_kind, v_subject_id, v_predicate, v_object_kind, v_object_id,
      nullif(payload ->> 'start_date', '')::date,
      coalesce(nullif(payload ->> 'start_precision', '')::public.date_precision, 'unknown'),
      nullif(payload ->> 'end_date', '')::date,
      coalesce(nullif(payload ->> 'end_precision', '')::public.date_precision, 'unknown'),
      nullif(payload ->> 'amount', '')::numeric,
      coalesce(payload -> 'attrs', '{}'::jsonb),
      coalesce(nullif(payload ->> 'visibility', '')::public.visibility, 'public'),
      coalesce((payload ->> 'no_source')::boolean, false),
      nullif(payload ->> 'revision_of', '')::uuid,
      auth.uid()
    ) returning id into v_fact_id;
  end if;

  -- sources travel with the fact in the same transaction; dedupe by normalized URL
  if payload ? 'sources' and jsonb_typeof(payload -> 'sources') = 'array' then
    for v_src in select * from jsonb_array_elements(payload -> 'sources') loop
      v_url := nullif(v_src ->> 'url', '');
      v_sid := null;
      if v_url is not null then
        select id into v_sid from public.sources
        where public.normalize_url(url) = public.normalize_url(v_url)
        limit 1;
      end if;
      if v_sid is null then
        insert into public.sources (
          kind, title, author, url, page, quote, published_at, accessed_at
        ) values (
          coalesce(nullif(v_src ->> 'kind', '')::public.source_kind, 'article'),
          coalesce(nullif(v_src ->> 'title', ''), v_url, 'untitled'),
          nullif(v_src ->> 'author', ''),
          v_url,
          nullif(v_src ->> 'page', ''),
          nullif(v_src ->> 'quote', ''),
          nullif(v_src ->> 'published_at', '')::date,
          nullif(v_src ->> 'accessed_at', '')::timestamptz
        ) returning id into v_sid;
      end if;
      insert into public.fact_sources (fact_id, source_id, locator)
      values (v_fact_id, v_sid, nullif(v_src ->> 'locator', ''))
      on conflict (fact_id, source_id) do nothing;
    end loop;
  end if;

  return v_fact_id;
end;
$$;

-- ── submit_fact ─────────────────────────────────────────────────────────────

-- Draft → published in one transaction: require a source (or explicit
-- no_source), close the superseded revision, audit old→new with actor id+email.
-- R1 collapses the in_review state (FR-031 is R2); see api.md.
create or replace function public.submit_fact(p_fact uuid) returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_fact public.facts;
begin
  if not public.is_editor() then
    raise exception 'editor role required' using errcode = '42501';
  end if;
  perform public.ensure_app_user();

  select * into v_fact from public.facts where id = p_fact;
  if not found then
    raise exception 'unknown fact %', p_fact using errcode = '23503';
  end if;
  if v_fact.status = 'published' then
    raise exception 'fact % is already published', p_fact using errcode = '23514';
  end if;
  if v_fact.status = 'superseded' then
    raise exception 'fact % is superseded', p_fact using errcode = '23514';
  end if;
  if not v_fact.no_source
     and not exists (select 1 from public.fact_sources where fact_id = p_fact) then
    raise exception 'fact % needs a source or no_source=true', p_fact
      using errcode = '23514';
  end if;

  if v_fact.revision_of is not null then
    update public.facts set status = 'superseded', updated_at = now()
    where id = v_fact.revision_of;
  end if;
  update public.facts set status = 'published', updated_at = now() where id = p_fact;

  insert into public.audit_log (actor_id, actor_email, entity, entity_id, action, summary)
  values (
    auth.uid(),
    nullif(auth.jwt() ->> 'email', ''),
    'fact',
    p_fact,
    'publish',
    jsonb_build_object(
      'from_status', v_fact.status,
      'to_status', 'published',
      'revision_of', v_fact.revision_of
    )
  );
end;
$$;

-- ── upsert_stance ────────────────────────────────────────────────────────────

create or replace function public.upsert_stance(payload jsonb) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_stance_id uuid := nullif(payload ->> 'id', '')::uuid;
  v_party uuid := nullif(payload ->> 'party_org_id', '')::uuid;
  v_axis text := payload ->> 'axis_code';
  v_existing public.stances;
begin
  if not public.is_editor() then
    raise exception 'editor role required' using errcode = '42501';
  end if;
  perform public.ensure_app_user();

  if not exists (select 1 from public.orgs where id = v_party) then
    raise exception 'dangling party org %', v_party using errcode = '23503';
  end if;
  if not exists (select 1 from public.stance_axes where code = v_axis) then
    raise exception 'unknown stance axis %', v_axis using errcode = '23503';
  end if;

  if v_stance_id is not null then
    select * into v_existing from public.stances where id = v_stance_id;
    if not found then
      raise exception 'dangling stance %', v_stance_id using errcode = '23503';
    end if;
    if v_existing.status not in ('draft', 'in_review') then
      raise exception 'stance % is % and cannot be edited in place',
        v_stance_id, v_existing.status using errcode = '23514';
    end if;
    update public.stances set
      party_org_id = v_party,
      axis_code = v_axis,
      value = (payload ->> 'value')::numeric,
      target_org_id = nullif(payload ->> 'target_org_id', '')::uuid,
      start_date = nullif(payload ->> 'start_date', '')::date,
      start_precision = coalesce(
        nullif(payload ->> 'start_precision', '')::public.date_precision, 'unknown'),
      end_date = nullif(payload ->> 'end_date', '')::date,
      end_precision = coalesce(
        nullif(payload ->> 'end_precision', '')::public.date_precision, 'unknown'),
      notes = nullif(payload ->> 'notes', '')
    where id = v_stance_id;
    return v_stance_id;
  end if;

  insert into public.stances (
    party_org_id, axis_code, value, target_org_id,
    start_date, start_precision, end_date, end_precision, notes
  ) values (
    v_party, v_axis, (payload ->> 'value')::numeric,
    nullif(payload ->> 'target_org_id', '')::uuid,
    nullif(payload ->> 'start_date', '')::date,
    coalesce(nullif(payload ->> 'start_precision', '')::public.date_precision, 'unknown'),
    nullif(payload ->> 'end_date', '')::date,
    coalesce(nullif(payload ->> 'end_precision', '')::public.date_precision, 'unknown'),
    nullif(payload ->> 'notes', '')
  ) returning id into v_stance_id;
  return v_stance_id;
end;
$$;

-- ── merge_source ─────────────────────────────────────────────────────────────

-- Destructive and one-way: only equal normalized URLs may merge. Re-links
-- fact_sources (keeping the locator when there is no conflict), deletes the
-- duplicate row, and audits the merge.
create or replace function public.merge_source(p_from uuid, p_into uuid) returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_from public.sources;
  v_into public.sources;
begin
  if not public.is_editor() then
    raise exception 'editor role required' using errcode = '42501';
  end if;
  perform public.ensure_app_user();

  select * into v_from from public.sources where id = p_from;
  if not found then
    raise exception 'unknown source %', p_from using errcode = '23503';
  end if;
  select * into v_into from public.sources where id = p_into;
  if not found then
    raise exception 'unknown source %', p_into using errcode = '23503';
  end if;
  if p_from = p_into then
    raise exception 'cannot merge source into itself' using errcode = '22023';
  end if;
  if public.normalize_url(v_from.url) is distinct from public.normalize_url(v_into.url) then
    raise exception 'sources are not duplicates by normalized URL' using errcode = '22023';
  end if;

  insert into public.fact_sources (fact_id, source_id, locator)
  select fact_id, p_into, locator from public.fact_sources where source_id = p_from
  on conflict (fact_id, source_id) do nothing;
  delete from public.fact_sources where source_id = p_from;
  delete from public.sources where id = p_from;

  insert into public.audit_log (actor_id, actor_email, entity, entity_id, action, summary)
  values (
    auth.uid(),
    nullif(auth.jwt() ->> 'email', ''),
    'source',
    p_into,
    'merge',
    jsonb_build_object('merged_from', p_from, 'merged_into', p_into)
  );
end;
$$;

-- ── Grants: authenticated only, no PUBLIC default ───────────────────────────

revoke all on function public.normalize_url(text) from public, anon;
revoke all on function public.ensure_app_user() from public, anon;
revoke all on function public.upsert_fact(jsonb) from public, anon;
revoke all on function public.submit_fact(uuid) from public, anon;
revoke all on function public.upsert_stance(jsonb) from public, anon;
revoke all on function public.merge_source(uuid, uuid) from public, anon;

grant execute on function public.normalize_url(text) to authenticated;
grant execute on function public.upsert_fact(jsonb) to authenticated;
grant execute on function public.submit_fact(uuid) to authenticated;
grant execute on function public.upsert_stance(jsonb) to authenticated;
grant execute on function public.merge_source(uuid, uuid) to authenticated;

comment on function public.upsert_fact(jsonb) is
  'T-007: create draft / revise fact; sources[] written in the same transaction; editor only';
comment on function public.submit_fact(uuid) is
  'T-007: publish with source-or-no_source, supersede the old revision, one audit row (R1 collapses in_review)';
comment on function public.merge_source(uuid, uuid) is
  'T-007: destructive source dedupe, equal normalized URLs only, re-links fact_sources';
