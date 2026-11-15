// Pure render plan for one fact as a subject · predicate · object triple.
// Kept out of the component so vitest can pin the ORDER (subject first, always)
// and the hidden/focusable rules without React or a browser.
import type { OrgFactRow } from '../../lib/types';

export interface FactEnd {
  kind: 'org' | 'person' | null;
  /** null when the end does not exist (no object) or is not public to the caller. */
  id: string | null;
  name: string | null;
}

export interface FactSegment {
  role: 'subject' | 'object';
  end: FactEnd;
  /** resolved display name, or HIDDEN_END for a real but non-public end */
  text: string;
  /** kind !== null && name === null: an end that exists but is gated */
  hidden: boolean;
  /** only a public org can be navigated to; persons have no tree screen (S-02) */
  focusable: boolean;
  /** the org currently open in the drawer */
  emphasized: boolean;
}

export interface FactView {
  /** always the fact's subject end, even when the viewed org is the object */
  subject: FactSegment;
  /** null when the fact has no object end at all (e.g. `founded`) */
  object: FactSegment | null;
}

export const HIDDEN_END = '（未公开的对象）';


function segment(role: 'subject' | 'object', end: FactEnd, orgId: string): FactSegment {
  return {
    role,
    end,
    text: end.name ?? HIDDEN_END,
    hidden: end.kind !== null && end.name === null,
    focusable: end.kind === 'org' && end.id !== null,
    emphasized: end.id === orgId,
  };
}

/**
 * Render plan for one fact. Order is fixed here (subject, then object) so the
 * drawer cannot invert it: viewing Boston Dynamics must still read
 * "Boston Dynamics · 受控于 · Hyundai Motor Group", not the reverse.
 * A fact with no object end renders the predicate alone — no hidden-object tail.
 */
export function factView(fact: OrgFactRow, orgId: string): FactView {
  const subjectEnd: FactEnd = {
    kind: fact.subject_kind,
    id: fact.subject_id,
    name: fact.subject_name,
  };
  const objectEnd: FactEnd = {
    kind: fact.object_kind,
    id: fact.object_id,
    name: fact.object_name,
  };
  return {
    subject: segment('subject', subjectEnd, orgId),
    object: fact.object_kind === null ? null : segment('object', objectEnd, orgId),
  };
}

