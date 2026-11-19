-- 0003_tree_direction — fix the parent/child polarity of tree_edges (T-004 gap).
--
-- 0002 assumed "subject is always the parent" for implied_parent relations.
-- The registry says otherwise for three predicates (data-model.md):
--   split_from   (拆分自):     subject = child  (Franka split_from DLR)
--   controlled_by(受控于):     subject = child  (KUKA controlled_by Midea)
--   merged_into  (并入):       subject = child  (X merged_into Y)
-- For acquired / parent_of / subsidiary_of the subject is the parent.
--
-- tree_edges now normalizes both polarities to parent_org_id / child_org_id,
-- so the recursive walk in tree_nodes renders the pedigree correctly.
--
-- Migration name in the SQL-editor ledger: meta-pedigree-dev:0003_tree_direction
-- (DR-0006: applied from the dashboard SQL editor; never pushed from a shell).

-- tree_nodes depends on tree_edges; drop child first.
drop view if exists public.tree_nodes;
drop view if exists public.tree_edges;

create view public.tree_edges
  with (security_invoker = true) as
select
  f.id              as fact_id,
  case
    when f.predicate_code in ('split_from', 'controlled_by', 'merged_into') then f.object_id
    else f.subject_id
  end               as parent_org_id,
  case
    when f.predicate_code in ('split_from', 'controlled_by', 'merged_into') then f.subject_id
    else f.object_id
  end               as child_org_id,
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
  'Published pedigree edges, normalized to parent→child for both polarities; base-table RLS applies (security_invoker).';

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
