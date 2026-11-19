import type { TreeEdgeRow, TreeNodeRow } from '../../lib/types';

/**
 * The pedigree is a DAG, not a tree: Franka Emika was split from DLR (2016)
 * and later acquired by Agile Robots (2023), so it has two parent edges.
 * S-01 renders one primary edge per child (control beats origin) and keeps
 * the extra edges on the node for the detail panel and the table view.
 */

export const PREDICATE_LABEL: Record<string, string> = {
  acquired: '收购',
  split_from: '拆分自',
  controlled_by: '受控于',
  merged_into: '并入',
  parent_of: '母公司',
  subsidiary_of: '子公司',
  spin_out_of: '分拆自',
};

const PRIORITY = ['controlled_by', 'acquired', 'merged_into', 'parent_of', 'subsidiary_of', 'split_from', 'spin_out_of'];

function rank(predicate: string): number {
  const i = PRIORITY.indexOf(predicate);
  return i < 0 ? PRIORITY.length : i;
}

export interface EdgeInfo {
  predicate: string;
  date: string | null;
  amount: number | null;
  parentName: string;
}

export interface ForestNode {
  id: string;
  name: string;
  kind: string;
  country: string | null;
  founded: string | null;
  foundedPrecision: string;
  children: ForestNode[];
  /** all parent edges for this child (primary first), used for tooltips/table */
  parents: EdgeInfo[];
}

export interface Forest {
  roots: ForestNode[];
  /** every node by id (including disconnected/cycle ones) */
  all: Map<string, ForestNode>;
  edgeCount: number;
}

export function buildForest(nodes: TreeNodeRow[], edges: TreeEdgeRow[]): Forest {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const byChild = new Map<string, TreeEdgeRow[]>();
  for (const e of edges) {
    if (!byId.has(e.parent_org_id) || !byId.has(e.child_org_id)) continue;
    const list = byChild.get(e.child_org_id) ?? [];
    list.push(e);
    byChild.set(e.child_org_id, list);
  }

  const parentEdgeOf = new Map<string, TreeEdgeRow>();
  for (const [child, list] of byChild) {
    const sorted = [...list].sort((a, b) => {
      const r = rank(a.predicate_code) - rank(b.predicate_code);
      if (r !== 0) return r;
      return (b.relation_date ?? '').localeCompare(a.relation_date ?? '');
    });
    parentEdgeOf.set(child, sorted[0]);
  }

  const all = new Map<string, ForestNode>();
  const order = [...nodes].sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  for (const n of order) {
    all.set(n.id, {
      id: n.id,
      name: n.name,
      kind: n.kind,
      country: n.country_code,
      founded: n.founded_date,
      foundedPrecision: n.founded_precision,
      children: [],
      parents: (byChild.get(n.id) ?? [])
        .sort((a, b) => (b.relation_date ?? '').localeCompare(a.relation_date ?? ''))
        .map((e) => ({
          predicate: e.predicate_code,
          date: e.relation_date,
          amount: e.amount,
          parentName: byId.get(e.parent_org_id)?.name ?? e.parent_org_id,
        })),
    });
  }

  for (const [child, edge] of parentEdgeOf) {
    all.get(edge.parent_org_id)?.children.push(all.get(child)!);
  }

  const isChild = new Set(parentEdgeOf.keys());
  const roots = order.filter((n) => !isChild.has(n.id)).map((n) => all.get(n.id)!);

  // A cycle would leave nodes unreachable from any root; surface them as roots.
  const reachable = new Set<string>();
  const walk = (n: ForestNode) => {
    if (reachable.has(n.id)) return;
    reachable.add(n.id);
    n.children.forEach(walk);
  };
  roots.forEach(walk);
  for (const n of all.values()) {
    if (!reachable.has(n.id)) roots.push(n);
  }

  return { roots, all, edgeCount: edges.length };
}
