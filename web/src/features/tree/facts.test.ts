import { describe, expect, it } from 'vitest';
import { citationLine, groupFacts } from './facts';
import type { OrgFactRow, OrgSourceRow } from '../../lib/types';

function fact(patch: Partial<OrgFactRow> = {}): OrgFactRow {
  return {
    id: 'f1',
    predicate: 'founded',
    label_zh: '创立',
    label_en: 'founded',
    status: 'published',
    conflict_key: 'k1',
    subject_kind: 'org',
    subject_id: 's1',
    subject_name: 'Org',
    object_kind: null,
    object_id: null,
    object_name: null,
    start_date: '1992-01-01',
    start_precision: 'year',
    end_date: null,
    end_precision: null,
    qualifier: 'exact',
    amount: null,
    certainty: 'exact',
    no_source: false,
    sources: [],
    ...patch,
  };
}

function source(patch: Partial<OrgSourceRow> = {}): OrgSourceRow {
  return {
    title: 'Boston Dynamics – Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Boston_Dynamics',
    kind: 'other',
    quote: 'founded in 1992',
    locator: 'infobox: Founded',
    author: 'Wikipedia contributors',
    page: 'Boston Dynamics',
    published_at: '2026-01-01',
    accessed_at: '2026-11-19T10:20:30Z',
    ...patch,
  };
}

describe('groupFacts', () => {
  it('puts the two disputed years of one triple in one conflict group', () => {
    const groups = groupFacts([
      fact({ id: 'a', status: 'published', start_date: '1992-01-01' }),
      fact({ id: 'b', status: 'disputed', start_date: '1993-01-01' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].conflict).toBe(true);
    expect(groups[0].facts.map((f) => f.status)).toEqual(['published', 'disputed']);
  });

  it('never merges different conflict_keys (hidden counterparts keep null ids)', () => {
    const groups = groupFacts([
      fact({ id: 'a', conflict_key: 'k1' }),
      fact({ id: 'b', conflict_key: 'k2' }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => !g.conflict)).toBe(true);
  });

  it('orders by start_date with nulls last, then id — not by array position', () => {
    const groups = groupFacts([
      fact({ id: '3', conflict_key: 'k3', start_date: null }),
      fact({ id: '2', conflict_key: 'k2', start_date: '2000-01-01' }),
      fact({ id: '1', conflict_key: 'k1', start_date: '1990-01-01' }),
    ]);
    expect(groups.map((g) => g.facts[0].id)).toEqual(['1', '2', '3']);
  });
});

describe('citationLine', () => {
  it('renders one line: author · title · page · locator · url, then the access date', () => {
    expect(citationLine(source())).toBe(
      'Wikipedia contributors · Boston Dynamics – Wikipedia · Boston Dynamics · infobox: Founded · https://en.wikipedia.org/wiki/Boston_Dynamics（访问 2026-11-19）',
    );
  });

  it('never leaves empty separators or a dangling —', () => {
    expect(citationLine(source({ author: null, locator: null, page: null, accessed_at: null }))).toBe(
      'Boston Dynamics – Wikipedia · https://en.wikipedia.org/wiki/Boston_Dynamics',
    );
  });

  it('keeps the quote out and collapses whitespace/newlines', () => {
    const line = citationLine(source({ title: 'A\n  report', author: null, page: null, locator: null }));
    expect(line).not.toContain('founded in 1992');
    expect(line).not.toContain('\n');
    expect(line.startsWith('A report ·')).toBe(true);
  });
});
