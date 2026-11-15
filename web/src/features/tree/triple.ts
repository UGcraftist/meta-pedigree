// Pure helpers for rendering one fact as a subject · predicate · object triple.
// Kept out of the component so vitest can pin the two-end logic without React
// or a browser; the drawer maps the returned names onto the emphasised triple.
import type { OrgFactRow } from '../../lib/types';

export interface FactEnd {
  kind: 'org' | 'person' | null;
  /** null when the end does not exist (no object) or is not public to the caller. */
  id: string | null;
  name: string | null;
}

/** The end of the fact that is NOT the org being viewed. */
export function counterpartOf(fact: OrgFactRow, orgId: string): FactEnd {
  if (fact.subject_id === orgId) {
    return { kind: fact.object_kind, id: fact.object_id, name: fact.object_name };
  }
  return { kind: fact.subject_kind, id: fact.subject_id, name: fact.subject_name };
}

/** The end of the fact that IS the org being viewed (for the emphasised label). */
export function selfEndOf(fact: OrgFactRow, orgId: string): FactEnd {
  if (fact.subject_id === orgId) {
    return { kind: fact.subject_kind, id: fact.subject_id, name: fact.subject_name };
  }
  return { kind: fact.object_kind, id: fact.object_id, name: fact.object_name };
}

export const HIDDEN_COUNTERPART = '（未公开或未加载的对象）';

/** Display name for the counterpart end: explicit fallback, never a silent drop. */
export function counterpartLabel(end: FactEnd): string {
  return end.name ?? HIDDEN_COUNTERPART;
}
