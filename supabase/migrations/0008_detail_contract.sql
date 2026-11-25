-- 0008_detail_contract.sql
-- T-010 (CR-010): the S-07 object detail needs more than 0005 exposed.
--   * conflicts cannot be derived client-side: 0005 kept only status='published',
--     so a disputed row never left the database. The view now emits `status`
--     and an opaque `conflict_key`.
--   * `conflict_key` is md5 of the *oriented full triple* from DR-0003:33
--     (subject_kind, subject_id, predicate, object_kind, object_id) computed
--     from the RAW ids, before the visibility gate nulls a hidden counterpart.
--     Two facts about two different hidden orgs therefore stay separate, and a
--     `founded` fact is not confused with another org's `founded`.
--   * source provenance: author / page / published_at / accessed_at are exposed
--     separately; `published_at` (出版) and `accessed_at` (访问) are different
--     facts and must not be coalesced into one "as-of" (FR-001).
--   * the fact JSON lives in `facts_for(uuid)` so T-024's person screen reuses
--     one shaping expression instead of redefining `org_detail` again.
-- Grants: a drop/create in `public` re-triggers Supabase default privileges
-- (anon ALL, authenticated ALL). The block below is re-issued here verbatim;
-- `role_table_grants` must be re-run after applying (CR-006 precedent).
begin;

create or replace function public.facts_for(p_object_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'predicate', f.predicate_code,
      'label_zh', rt.label_zh,
      'label_en', rt.label_en,
      'status', f.status,
      'conflict_key', md5(concat_ws('|',
        f.subject_kind,
        f.subject_id::text,
        f.predicate_code,
        coalesce(f.object_kind, '∅'),
        coalesce(f.object_id::text, '∅'))),
      -- subject end: id/name only when that end is itself public
      'subject_kind', f.subject_kind,
      'subject_id', case f.subject_kind
        when 'org' then (select c.id from public.orgs c
                         where c.id = f.subject_id and c.visibility = 'public')
        when 'person' then (select p.id from public.persons p
                            where p.id = f.subject_id and p.visibility = 'public')
      end,
      'subject_name', case f.subject_kind
        when 'org' then (select c.name from public.orgs c
                         where c.id = f.subject_id and c.visibility = 'public')
        when 'person' then (select p.name from public.persons p
                            where p.id = f.subject_id and p.visibility = 'public')
      end,
      -- object end: same gating; NULL when the fact has no object
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
          'author', s.author,
          'page', s.page,
          'published_at', s.published_at,
          'accessed_at', s.accessed_at,
          'locator', fs.locator
        ) order by s.title)
        from public.fact_sources fs
        join public.sources s on s.id = fs.source_id
        where fs.fact_id = f.id
      ), '[]'::jsonb)
    ) order by f.start_date nulls last, f.id
  ), '[]'::jsonb)
  from public.facts f
  join public.relation_types rt on rt.code = f.predicate_code
  where (f.subject_id = p_object_id or f.object_id = p_object_id)
    and f.status in ('published', 'disputed')
    and f.visibility = 'public';
$$;

comment on function public.facts_for(uuid) is
  'Published/disputed public facts for one org or person, shaped once for S-07: oriented conflict_key (raw triple, pre-visibility), status, subject/object ends gated on public visibility, sources with author/page/published_at/accessed_at/locator. Used by org_detail and (T-024) the person screen.';

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
  public.facts_for(o.id) as facts
from public.orgs o
where o.visibility = 'public';

comment on view public.org_detail is
  'One public org + its published and disputed facts as JSON (T-010). Each fact carries status, an opaque conflict_key, both ends gated on public visibility, and sources with author/page/published_at/accessed_at/locator. The fact JSON comes from facts_for(uuid), shared with the person screen (T-024). Service/authenticated read model; anon is denied by grant.';

revoke all on public.org_detail, public.tree_edges, public.tree_nodes from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.org_detail, public.tree_edges, public.tree_nodes from authenticated;
grant select on public.org_detail, public.tree_edges, public.tree_nodes to authenticated;

-- the view is security_invoker, so callers execute facts_for themselves
revoke execute on function public.facts_for(uuid) from public, anon;
grant execute on function public.facts_for(uuid) to authenticated, service_role;

commit;
