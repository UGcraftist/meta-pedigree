-- 0002_read_model — read-only views for the pedigree tree screens (T-004).
--
-- Why views and not RPC: PostgREST cannot execute recursive CTEs, so the tree
-- shape is materialized here. security_invoker keeps the base tables' RLS
-- authoritative: the caller's own grantees/policies decide what rows they see.
--
-- Migration name in the SQL-editor ledger: meta-pedigree-dev:0002_read_model
-- (DR-0006: applied from the dashboard SQL editor; never pushed from a shell).

-- ── tree_edges: one row per published parent→child relation ─────────────────
-- Direction: implied_parent means "subject is the parent, object is the child"
-- (acquired, merged_into, split_from, controlled_by). The child then renders
-- below its parent (US-004).

create view public.tree_edges
  with (security_invoker = true) as
select
  f.id              as fact_id,
  f.subject_id      as parent_org_id,
  f.object_id       as child_org_id,
  f.predicate_code,
  f.start_date      as relation_date,
  f.start_precision,
  f.end_date,
  f.end_precision,
  f.qualifier,
  f.amount
from public.facts f
join public.relation_types rt on rt.code = f.predicate_code
where f.subject_kind = 'org'
  and f.object_kind = 'org'
  and f.status = 'published'
  and f.visibility = 'public'
  and rt.implied_parent
  and rt.is_active;

comment on view public.tree_edges is
  'Published parent→child pedigree edges; base-table RLS applies (security_invoker).';

-- ── tree_nodes: every visible org with its depth from the nearest root ──────
-- Roots are orgs that appear in no edge as a child (e.g. Hyundai, DLR).
-- depth is 0 for roots and grows down the acquired/sub-company chain; the
-- recursion cap (20) protects against accidental cycles. Orgs cut off by a
-- cycle keep depth = null and child_count/parent_count, so nothing disappears.

create view public.tree_nodes
  with (security_invoker = true) as
with recursive walk (id, depth) as (
  select o.id, 0
  from public.orgs o
  where not exists (
    select 1 from public.tree_edges e where e.child_org_id = o.id
  )
  union all
  select e.child_org_id, walk.depth + 1
  from walk
  join public.tree_edges e on e.parent_org_id = walk.id
  where walk.depth < 20
)
select
  o.id,
  o.name,
  o.kind,
  o.country_code,
  o.founded_date,
  o.founded_precision,
  walk.depth,
  (walk.depth = 0) as is_root,
  (select count(*) from public.tree_edges e where e.parent_org_id = o.id) as child_count,
  (select count(*) from public.tree_edges e where e.child_org_id = o.id) as parent_count
from public.orgs o
left join walk on walk.id = o.id
where o.visibility = 'public';

comment on view public.tree_nodes is
  'Visible orgs with pedigree depth from roots (recursive over tree_edges).';

-- ── org_detail: org row + published facts with their sources, as JSON ───────
-- The detail panel (S-01/S-10) renders facts + sources from one request; the
-- facts array is ordered chronologically (null dates last).

create view public.org_detail
  with (security_invoker = true) as
select
  o.id,
  o.name,
  o.kind,
  o.country_code,
  o.founded_date,
  o.founded_precision,
  o.notes,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', f.id,
        'predicate', f.predicate_code,
        'label_zh', rt.label_zh,
        'label_en', rt.label_en,
        'object_kind', f.object_kind,
        'object_id', f.object_id,
        'start_date', f.start_date,
        'start_precision', f.start_precision,
        'end_date', f.end_date,
        'end_precision', f.end_precision,
        'qualifier', f.qualifier,
        'amount', f.amount,
        'certainty', f.certainty,
        'no_source', f.no_source,
        'sources', coalesce((
          select jsonb_agg(jsonb_build_object(
            'title', s.title,
            'url', s.url,
            'kind', s.kind,
            'quote', s.quote,
            'locator', fs.locator
          ) order by s.title)
          from public.fact_sources fs
          join public.sources s on s.id = fs.source_id
          where fs.fact_id = f.id
        ), '[]'::jsonb)
      )
      order by f.start_date nulls last, f.id
    )
    from public.facts f
    join public.relation_types rt on rt.code = f.predicate_code
    where (f.subject_id = o.id or f.object_id = o.id)
      and f.status = 'published'
      and f.visibility = 'public'
  ), '[]'::jsonb) as facts
from public.orgs o
where o.visibility = 'public';

comment on view public.org_detail is
  'Org row + chronologically ordered published facts with sources (S-01/S-10).';

-- ── Grants ──────────────────────────────────────────────────────────────────
-- Views do not inherit table grants. Editors read through their JWT; the
-- anonymous public share (FR-027) is added in T-015, not here.

grant select on public.tree_edges, public.tree_nodes, public.org_detail
  to authenticated;
