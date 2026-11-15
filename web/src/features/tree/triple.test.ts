import { describe, expect, it } from 'vitest';
import type { OrgFactRow } from '../../lib/types';
import { counterpartLabel, counterpartOf, HIDDEN_COUNTERPART, selfEndOf } from './triple';

const base: OrgFactRow = {
  id: 'f1',
  predicate: 'subsidiary_of',
  label_zh: '收购',
  label_en: null,
  subject_kind: 'org',
  subject_id: 'hyundai',
  subject_name: 'Hyundai',
  object_kind: 'org',
  object_id: 'bd',
  object_name: 'Boston Dynamics',
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

describe('counterpartOf', () => {
  it('returns the object side when the viewed org is the subject (Hyundai → BD)', () => {
    expect(counterpartOf(base, 'hyundai')).toEqual({
      kind: 'org',
      id: 'bd',
      name: 'Boston Dynamics',
    });
  });

  it('returns the subject side when the viewed org is the object side', () => {
    expect(counterpartOf(base, 'bd')).toEqual({ kind: 'org', id: 'hyundai', name: 'Hyundai' });
  });
});

describe('selfEndOf', () => {
  it('is the subject when the viewed org is the subject side', () => {
    expect(selfEndOf(base, 'hyundai').name).toBe('Hyundai');
  });

  it('is the object when the viewed org is the object side', () => {
    expect(selfEndOf(base, 'bd').name).toBe('Boston Dynamics');
  });
});

describe('counterpartLabel', () => {
  it('never drops a hidden counterpart silently', () => {
    expect(
      counterpartLabel(counterpartOf({ ...base, object_kind: 'org', object_id: null, object_name: null }, 'hyundai')),
    ).toBe(HIDDEN_COUNTERPART);
  });

  it('uses the server-side name for a visible counterpart', () => {
    expect(counterpartLabel(counterpartOf(base, 'bd'))).toBe('Hyundai');
  });
});
