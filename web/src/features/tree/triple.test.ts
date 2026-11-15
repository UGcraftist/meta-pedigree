import { describe, expect, it } from 'vitest';
import type { OrgFactRow } from '../../lib/types';
import { factView, HIDDEN_END } from './triple';

// The seed fact: "Boston Dynamics · controlled_by · Hyundai Motor Group".
// Boston Dynamics is the SUBJECT; viewing Hyundai means the viewed org is the
// OBJECT end. The drawer must still render subject first.
const bdControlledByHyundai: OrgFactRow = {
  id: 'f1',
  predicate: 'controlled_by',
  label_zh: '受控于',
  label_en: null,
  subject_kind: 'org',
  subject_id: 'bd',
  subject_name: 'Boston Dynamics',
  object_kind: 'org',
  object_id: 'hyundai',
  object_name: 'Hyundai Motor Group',
  start_date: '2021-06-01',
  start_precision: 'month',
  end_date: null,
  end_precision: null,
  qualifier: 'exact',
  amount: 80,
  certainty: 'exact',
  no_source: false,
  sources: [],
};

describe('factView order', () => {
  it('renders the subject first even when the viewed org is the object end (BD | Hyundai)', () => {
    const view = factView(bdControlledByHyundai, 'hyundai');
    expect(view.subject.role).toBe('subject');
    expect(view.subject.text).toBe('Boston Dynamics');
    expect(view.subject.emphasized).toBe(false);
    expect(view.object?.role).toBe('object');
    expect(view.object?.text).toBe('Hyundai Motor Group');
    expect(view.object?.emphasized).toBe(true);
  });

  it('keeps the same order when the viewed org is the subject end', () => {
    const view = factView(bdControlledByHyundai, 'bd');
    expect(view.subject.text).toBe('Boston Dynamics');
    expect(view.subject.emphasized).toBe(true);
    expect(view.object?.text).toBe('Hyundai Motor Group');
  });
});

describe('factView ends', () => {
  it('has no object segment when the fact has no object end (founded)', () => {
    const view = factView(
      { ...bdControlledByHyundai, predicate: 'founded', object_kind: null, object_id: null, object_name: null },
      'bd',
    );
    expect(view.object).toBeNull();
  });

  it('marks a gated object end hidden and non-focusable, with explicit text', () => {
    const view = factView({ ...bdControlledByHyundai, object_id: null, object_name: null }, 'bd');
    expect(view.object).not.toBeNull();
    expect(view.object?.hidden).toBe(true);
    expect(view.object?.text).toBe(HIDDEN_END);
    expect(view.object?.focusable).toBe(false);
  });

  it('marks a gated subject end hidden when the viewed org is the object side', () => {
    const view = factView({ ...bdControlledByHyundai, subject_id: null, subject_name: null }, 'hyundai');
    expect(view.subject.hidden).toBe(true);
    expect(view.subject.text).toBe(HIDDEN_END);
  });

  it('a person counterpart is not navigable from the tree', () => {
    const view = factView(
      { ...bdControlledByHyundai, subject_kind: 'person', subject_id: 'p1', subject_name: 'Marc Raibert' },
      'hyundai',
    );
    expect(view.subject.focusable).toBe(false);
    expect(view.object?.focusable).toBe(true);
  });

  it('only a public org with an id is focusable', () => {
    const view = factView(bdControlledByHyundai, 'bd');
    expect(view.subject.focusable).toBe(true);
    expect(view.object?.focusable).toBe(true);
  });
});
