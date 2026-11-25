/**
 * Pure S-07 helpers (T-010): grouping facts for conflict display and building
 * one-line citations. Kept out of the component so vitest pins the rules.
 */
import type { OrgFactRow, OrgSourceRow } from '../../lib/types';

export interface FactGroup {
  key: string;
  facts: OrgFactRow[];
  /** true when the same conflict_key carries more than one row (FR-004). */
  conflict: boolean;
}

function orderKey(fact: OrgFactRow): [string, string] {
  return [fact.start_date ?? '\uffff', fact.id];
}

function before(a: OrgFactRow, b: OrgFactRow): number {
  const [ad, ai] = orderKey(a);
  const [bd, bi] = orderKey(b);
  if (ad !== bd) return ad < bd ? -1 : 1;
  return ai < bi ? -1 : ai > bi ? 1 : 0;
}

/**
 * Group by the view's opaque `conflict_key` (never by predicate+counterpart:
 * the counterpart may be gated to null). Groups and the rows inside them are
 * ordered by the view's own rule (`start_date nulls last, id`), never by array
 * position, so a reload cannot reshuffle what the reader compares.
 */
export function groupFacts(facts: OrgFactRow[]): FactGroup[] {
  const groups = new Map<string, OrgFactRow[]>();
  for (const fact of facts) {
    const key = fact.conflict_key || fact.id;
    const list = groups.get(key);
    if (list) list.push(fact);
    else groups.set(key, [fact]);
  }
  return [...groups.entries()]
    .map(([key, rows]) => ({ key, facts: [...rows].sort(before), conflict: rows.length > 1 }))
    .sort((a, b) => before(a.facts[0], b.facts[0]));
}

/**
 * One-line citation (FR-002): author → title → locator → url, then the access
 * date. Never empty parentheses, never a newline, and `quote` stays out
 * (NFR-008 excerpt only). `无来源` facts get no citation at all.
 */
export function citationLine(source: OrgSourceRow): string {
  const parts: string[] = [];
  if (source.author) parts.push(source.author);
  parts.push(source.title);
  if (source.page) parts.push(source.page);
  if (source.locator) parts.push(source.locator);
  if (source.url) parts.push(source.url);
  const head = parts.map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' · ');
  if (source.accessed_at) return `${head}（访问 ${source.accessed_at.slice(0, 10)}）`;
  return head;
}
