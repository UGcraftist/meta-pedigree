import { describe, expect, it } from 'vitest';
import { dedupeNodes, toTreeData } from './treeData';
import type { TreeNodeRow } from './types';

function row(id: string, name: string, depth: number): TreeNodeRow {
  return {
    id,
    name,
    kind: 'company',
    country_code: 'US',
    founded_date: '2000-01-01',
    founded_precision: 'year',
    depth,
    is_root: depth === 0,
    child_count: 0,
    parent_count: 0,
  };
}

// BUG-001 (docs/product/stories.md): current behaviour is "first row wins",
// while the view dedupes by min(depth). This test pins the client side of that
// contract so a change of either side is caught; it does not bless the choice.
describe('dedupeNodes', () => {
  it('collapses a tree_nodes fan-out to one row per org, keeping the first row', () => {
    const rows = [row('f', 'Franka Emika', 2), row('f', 'Franka Emika', 0), row('b', 'Boston Dynamics', 0)];
    expect(dedupeNodes(rows).map((n) => [n.id, n.depth])).toEqual([
      ['f', 2],
      ['b', 0],
    ]);
  });

  it('keeps the input order of first appearances', () => {
    const rows = [row('a', 'Agile', 0), row('b', 'Boston', 0), row('a', 'Agile', 1)];
    expect(dedupeNodes(rows).map((n) => n.name)).toEqual(['Agile', 'Boston']);
  });
});

describe('toTreeData', () => {
  it('wires the dedupe and passes edges through untouched', () => {
    const nodes = [row('f', 'Franka Emika', 1), row('f', 'Franka Emika', 1), row('b', 'Boston Dynamics', 0)];
    const edges = [
      {
        fact_id: 'e1',
        parent_org_id: 'b',
        child_org_id: 'f',
        predicate_code: 'acquired',
        relation_date: '2023-11-02',
        start_precision: 'day',
        end_date: null,
        end_precision: 'unknown',
        qualifier: 'exact',
        amount: null,
      },
    ];
    const data = toTreeData(nodes, edges);
    expect(data.nodes.map((n) => n.id)).toEqual(['f', 'b']);
    expect(data.edges).toBe(edges);
  });
});
