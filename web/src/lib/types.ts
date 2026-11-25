/** Row shapes of the read-model views (0002/0003) after security_invoker RLS. */

export interface TreeNodeRow {
  id: string;
  name: string;
  kind: 'company' | 'lab' | 'program' | 'team' | 'government' | 'other';
  country_code: string | null;
  founded_date: string | null;
  founded_precision: 'day' | 'month' | 'year' | 'unknown';
  depth: number | null;
  is_root: boolean | null;
  child_count: number;
  parent_count: number;
}

export interface TreeEdgeRow {
  fact_id: string;
  parent_org_id: string;
  child_org_id: string;
  predicate_code: string;
  relation_date: string | null;
  start_precision: string;
  end_date: string | null;
  end_precision: string;
  qualifier: string;
  amount: number | null;
}

/** One source attached to a fact (org_detail.facts[].sources[]). */
export interface OrgSourceRow {
  title: string;
  url: string | null;
  kind: string | null;
  quote: string | null;
  locator: string | null;
  /** 出版 (source date) and 访问 (when we read it) are distinct provenance facts. */
  author: string | null;
  page: string | null;
  published_at: string | null;
  accessed_at: string | null;
}

/** One published fact where the org is subject or object (org_detail.facts[]). */
export interface OrgFactRow {
  id: string;
  predicate: string;
  label_zh: string | null;
  label_en: string | null;
  /** published / disputed (0008); `superseded` rows never leave the view. */
  status: 'published' | 'disputed' | string;
  /** md5 of the raw oriented triple, computed before the visibility gate. */
  conflict_key: string;
  subject_kind: 'org' | 'person' | null;
  /** null when the subject end is not public (gated in the view, security.md:33). */
  subject_id: string | null;
  subject_name: string | null;
  object_kind: 'org' | 'person' | null;
  /** null when the object end is absent or not public. */
  object_id: string | null;
  object_name: string | null;
  start_date: string | null;
  start_precision: string;
  end_date: string | null;
  end_precision: string | null;
  qualifier: string | null;
  amount: number | null;
  certainty: string | null;
  no_source: boolean;
  sources: OrgSourceRow[];
}

/** Row of the org_detail view: org + its chronology of published facts. */
export interface OrgDetailRow {
  id: string;
  name: string;
  kind: string;
  country_code: string | null;
  founded_date: string | null;
  founded_precision: string;
  notes: string | null;
  facts: OrgFactRow[];
}

export interface AppUserRow {
  id: string;
  email: string;
  /** editor/admin come from auth.users.app_metadata.role (is_editor), not this row. */
  role: 'admin' | 'editor' | 'reader' | string | undefined;
}
