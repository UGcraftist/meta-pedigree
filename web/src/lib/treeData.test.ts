import { describe, expect, it } from 'vitest';
import { dedupeNodes } from './treeData';
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
