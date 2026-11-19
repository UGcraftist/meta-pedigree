-- 0005_org_detail_subject.sql
-- T-006: the S-02 drawer must show both ends of a fact, with human names, so
-- that "收购" reads as "Hyundai · 收购 · Boston Dynamics" and the counterpart is
-- correct even when the focused org is the object side (e.g. Boston Dynamics
-- ← Hyundai). Two rules from the reviews:
--   * names and both ids are resolved here, not in the browser: nameById is
--     built from tree_nodes (tree-only) and misses persons, hidden orgs and
--     anything opened from search (T-013 on).
--   * BOTH ends are gated on the counterpart's own visibility = 'public'
--     (security.md:33: visibility is filtered in the query layer). A raw id for
--     a hidden counterpart would otherwise be inherited by the T-015 anon share.
-- Grants: Supabase's default privileges grant ALL on every new object in
-- public to anon/authenticated/service_role, so 0003's drop/create silently
-- re-exposed all three views (checked with role_table_grants on dev:
-- anon had SELECT+write on all three). Revoke anon entirely (the public share
-- arrives with T-015) and leave authenticated SELECT-only here.
begin;

drop view if exists public.org_detail;

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
        -- subject end: id only when the subject is itself visible to the caller
        'subject_kind', f.subject_kind,
        'subject_id', case f.subject_kind
          when 'org' then (select c.id from public.orgs c
                           where c.id = f.subject_id and c.visibility = 'public')
          else (select p.id from public.persons p
                where p.id = f.subject_id and p.visibility = 'public')
        end,
        'subject_name', case f.subject_kind
          when 'org' then (select c.name from public.orgs c
                           where c.id = f.subject_id and c.visibility = 'public')
          else (select p.name from public.persons p
                where p.id = f.subject_id and p.visibility = 'public')
        end,
        -- object end: same gating, and NULL when the fact has no object
        'object_kind', f.object_kind,
        'object_id', case f.object_kind
          when 'org' then (select c.id from public.orgs c
                           where c.id = f.object_id and c.visibility = 'public')
          when 'person' then (select p.id from public.persons p
                              where p.id = f.object_id and p.visibility = 'public')
        end,
        'object_name', case f.object_kind
          when 'org' then (select c.name from public.orgs c
                           where c.id = f.object_id and c.visibility = 'public')
          when 'person' then (select p.name from public.persons p
                              where p.id = f.object_id and p.visibility = 'public')
        end,
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
  'One public org + its published facts as JSON. T-006: each fact carries subject_kind/subject_id/subject_name and object_kind/object_id/object_name, both ends resolved server-side and NULL when the counterpart is not public (security.md:33); relations_type.label_zh is the localized predicate label (e.g. 受控于) while predicate_code is the raw code, so callers render the full subject-predicate-object triple. Service/authenticated read model; anon is denied by grant.';

revoke all on public.org_detail, public.tree_edges, public.tree_nodes from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.org_detail, public.tree_edges, public.tree_nodes from authenticated;
grant select on public.org_detail, public.tree_edges, public.tree_nodes to authenticated;

commit;
