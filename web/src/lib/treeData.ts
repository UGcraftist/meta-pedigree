import type { TreeEdgeRow, TreeNodeRow } from './types';

/**
 * `tree_nodes` fans out one row per parent edge (Boston Dynamics, Franka Emika),
 * so the client collapses to one row per org. First row in PostgREST order wins;
 * the view itself already dedupes by `min(depth)` server-side
 * (`0004_tree_nodes_dedup.sql`). If the two disagree the client can keep a
 * non-min-depth row — tracked as BUG-001 in docs/product/stories.md.
 */
export function dedupeNodes(rows: TreeNodeRow[]): TreeNodeRow[] {
  const byId = new Map<string, TreeNodeRow>();
  for (const n of rows) {
    if (!byId.has(n.id)) byId.set(n.id, n);
  }
  return [...byId.values()];
}

export interface TreeData {
  nodes: TreeNodeRow[];
  edges: TreeEdgeRow[];
}

export function toTreeData(nodes: TreeNodeRow[], edges: TreeEdgeRow[]): TreeData {
  return { nodes: dedupeNodes(nodes), edges };
}
