import { supabase } from './supabase';
import { toTreeData, type TreeData } from './treeData';
import type { AppUserRow, OrgDetailRow, TreeEdgeRow, TreeNodeRow } from './types';

export type { TreeData } from './treeData';

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
  const { data, error } = await supabase.from('app_users').select('id,email').eq('id', auth.user.id).maybeSingle();
  if (error) throw new ApiError(`读取 app_users 失败: ${error.message}`);
  if (!data) return null;
  return {
    ...(data as { id: string; email: string }),
    role: (auth.user.app_metadata?.role as string | undefined) ?? undefined,
  };
}

export async function fetchTree(): Promise<TreeData> {
  const [nodes, edges] = await Promise.all([
    supabase.from('tree_nodes').select('*').order('name'),
    supabase.from('tree_edges').select('*'),
  ]);
  if (nodes.error) throw new ApiError(`读取 tree_nodes 失败: ${nodes.error.message}`);
  if (edges.error) throw new ApiError(`读取 tree_edges 失败: ${edges.error.message}`);
  return toTreeData((nodes.data ?? []) as TreeNodeRow[], edges.data as TreeEdgeRow[]);
}

/**
 * One org with its published and disputed facts and sources, for the S-07 detail drawer
 * (T-006). Returns null when the id is unknown or hidden by RLS — the caller
 * must not guess another object (ux.md, URL state).
 */
export async function fetchOrgDetail(id: string): Promise<OrgDetailRow | null> {
  const { data, error } = await supabase.from('org_detail').select('*').eq('id', id).maybeSingle();
  if (error) throw new ApiError(`读取 org_detail 失败: ${error.message}`);
  return (data as OrgDetailRow | null) ?? null;
}
