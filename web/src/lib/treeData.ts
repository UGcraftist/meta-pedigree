import type { TreeEdgeRow, TreeNodeRow } from './types';

/**
 * Defensive client-side collapse of `tree_nodes` to one row per org. The view
 * already dedupes by `min(depth)` server-side (`0004_tree_nodes_dedup.sql`), so
 * this only matters if the view regresses to the old per-parent-edge fan-out.
 * First row in PostgREST order wins, which can differ from the view's min-depth
 * choice — tracked as BUG-001 in docs/product/stories.md.
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
