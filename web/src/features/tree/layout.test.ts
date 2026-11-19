import { describe, expect, it } from 'vitest';
import { buildForest } from './layout';
import type { TreeEdgeRow, TreeNodeRow } from '../../lib/types';

function org(id: string, name: string): TreeNodeRow {
  return {
    id,
    name,
    kind: 'company',
    country_code: 'US',
    founded_date: '2000-01-01',
    founded_precision: 'year',
    depth: 0,
    is_root: true,
    child_count: 0,
    parent_count: 0,
  };
}
function edge(child: string, parent: string, predicate: string, date: string): TreeEdgeRow {
  return {
    fact_id: `${child}-${predicate}`,
    parent_org_id: parent,
    child_org_id: child,
    predicate_code: predicate,
    relation_date: date,
    start_precision: 'day',
    end_date: null,
    end_precision: 'unknown',
    qualifier: 'exact',
    amount: null,
  };
}

describe('buildForest', () => {
  it('renders a DAG with one primary parent per child, control beating origin', () => {
    const nodes = [org('f', 'Franka'), org('a', 'Agile'), org('d', 'DLR')];
    const edges = [edge('f', 'd', 'split_from', '2016-01-01'), edge('f', 'a', 'acquired', '2023-11-02')];
    const forest = buildForest(nodes, edges);
    const franka = forest.all.get('f')!;
    expect(franka.parents.map((p) => p.parentName)).toEqual(['Agile', 'DLR']);
    expect(forest.all.get('a')!.children.map((c) => c.name)).toEqual(['Franka']);
    expect(forest.all.get('d')!.children).toEqual([]);
    expect(forest.roots.map((r) => r.name).sort()).toEqual(['Agile', 'DLR']);
  });

  // No requirement row covers cycles: this records buildForest's assumption
  // (a cycle has no root, so every node in it is surfaced as a root, and a
  // dangling parent id is dropped from the forest but still counted raw).
  it('ignores dangling edges and surfaces every node of a cycle as a root', () => {
    const nodes = [org('x', 'X'), org('y', 'Y')];
    const edges = [
      edge('x', 'missing', 'acquired', '2020-01-01'),
      edge('x', 'y', 'controlled_by', '2021-01-01'),
      edge('y', 'x', 'controlled_by', '2021-01-01'),
    ];
    const forest = buildForest(nodes, edges);
    expect(forest.edgeCount).toBe(3); // raw edge count, dangling edge included
    expect(forest.all.has('missing')).toBe(false);
    expect(forest.all.get('x')!.parents.map((p) => p.parentName)).toEqual(['Y']);
    expect(forest.all.get('y')!.parents.map((p) => p.parentName)).toEqual(['X']);
    expect(forest.all.get('x')!.children.map((c) => c.name)).toEqual(['Y']);
    expect(forest.roots.map((r) => r.name)).toEqual(['X', 'Y']);
  });
});
