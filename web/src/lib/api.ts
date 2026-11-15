import { supabase } from './supabase';
import type { AppUserRow, OrgDetailRow, TreeEdgeRow, TreeNodeRow } from './types';

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Current app_users row; null when the signed-in account is not provisioned. */
export async function fetchAppUser(): Promise<AppUserRow | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from('app_users')
    .select('id,email')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (error) throw new ApiError(`读取 app_users 失败: ${error.message}`);
  if (!data) return null;
  return {
    ...(data as { id: string; email: string }),
    role: (auth.user.app_metadata?.role as string | undefined) ?? undefined,
  };
}

export interface TreeData {
  nodes: TreeNodeRow[];
  edges: TreeEdgeRow[];
}

export async function fetchTree(): Promise<TreeData> {
  const [nodes, edges] = await Promise.all([
    supabase.from('tree_nodes').select('*').order('name'),
    supabase.from('tree_edges').select('*'),
  ]);
  if (nodes.error) throw new ApiError(`读取 tree_nodes 失败: ${nodes.error.message}`);
  if (edges.error) throw new ApiError(`读取 tree_edges 失败: ${edges.error.message}`);
  // tree_nodes joins edges for depth/parent_count, which fans out one row per
  // parent edge (Boston Dynamics, Franka Emika). Collapse to one row per org.
  const byId = new Map<string, TreeNodeRow>();
  for (const n of (nodes.data ?? []) as TreeNodeRow[]) {
    if (!byId.has(n.id)) byId.set(n.id, n);
  }
  return { nodes: [...byId.values()], edges: edges.data as TreeEdgeRow[] };
}

/**
 * One org with its published facts and sources, for the S-02 detail drawer
 * (T-006). Returns null when the id is unknown or hidden by RLS — the caller
 * must not guess another object (ux.md, URL state).
 */
export async function fetchOrgDetail(id: string): Promise<OrgDetailRow | null> {
  const { data, error } = await supabase
    .from('org_detail')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new ApiError(`读取 org_detail 失败: ${error.message}`);
  return (data as OrgDetailRow | null) ?? null;
}
