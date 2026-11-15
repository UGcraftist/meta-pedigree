/** Row shapes of the read-model views (0002/0003) after security_invoker RLS. */

export interface TreeNodeRow {
  id: string;
  name: string;
  kind: 'company' | 'laboratory' | 'university' | 'fund' | 'other' | 'person';
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

export interface AppUserRow {
  id: string;
  email: string;
  /** editor/admin come from auth.users.app_metadata.role (is_editor), not this row. */
  role: 'admin' | 'editor' | 'reader' | string | undefined;
}
