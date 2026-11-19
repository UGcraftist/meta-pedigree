-- 0004 — tree_nodes returns one row per organisation (no fan-out).
--
-- 0003 built tree_nodes by left-joining orgs to the recursive walk, so an org
-- reached from two parent edges (Boston Dynamics, Franka Emika) produced two
-- rows. The web app dedupes defensively, but the view is the read-model
-- contract: fix it here by reducing the walk to one depth per org (min depth
-- wins, so an org renders under its shallowest ancestor).
--
-- Also restores the SELECT grants that 0003's drop/create dropped: views do
-- not inherit table grants.
--
-- Migration name in the SQL-editor ledger: meta-pedigree-dev:0004_tree_nodes_dedup
-- (DR-0006: applied from the dashboard SQL editor; never pushed from a shell).

drop view if exists public.tree_nodes;

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
),
best_depth as (
  select id, min(depth) as depth
  from walk
  group by id
)
select
  o.id,
  o.name,
  o.kind,
  o.country_code,
  o.founded_date,
  o.founded_precision,
  bd.depth,
  (bd.depth = 0) as is_root,
  (select count(*) from public.tree_edges e where e.parent_org_id = o.id) as child_count,
  (select count(*) from public.tree_edges e where e.child_org_id = o.id) as parent_count
from public.orgs o
left join best_depth bd on bd.id = o.id
where o.visibility = 'public';

comment on view public.tree_nodes is
  'One visible org per row with pedigree depth from roots; min depth wins (recursive over tree_edges).';

grant select on public.tree_nodes to authenticated;
