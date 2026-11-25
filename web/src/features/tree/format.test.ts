import { describe, expect, it } from 'vitest';
import { formatDate, formatFactWhen, formatSpan, precisionSpan } from './format';

describe('formatDate', () => {
  it('renders a year at year precision', () => {
    expect(formatDate('1992-01-01', 'year')).toBe('1992');
  });

  it('renders a month at month precision', () => {
    expect(formatDate('1992-11-30', 'month')).toBe('1992-11');
  });

  it('renders the full day at day precision', () => {
    expect(formatDate('1992-11-30', 'day')).toBe('1992-11-30');
  });

  it('renders nothing without a date', () => {
    expect(formatDate(null, 'unknown')).toBe('');
  });
});

describe('formatSpan', () => {
  it('says the time is unknown instead of leaving a blank', () => {
    expect(formatSpan(null, 'unknown', null, null)).toBe('时间未知');
  });

  it('renders a single start date when the fact has no end', () => {
    expect(formatSpan('1992-01-01', 'year', null, null)).toBe('1992');
  });

  it('renders a start–end span at mixed precisions', () => {
    expect(formatSpan('1992-01-01', 'year', '2013-06-01', 'month')).toBe('1992–2013-06');
  });
});

describe('precisionSpan', () => {
  it('turns a year-only date into the whole year', () => {
    expect(precisionSpan('1998-01-01', 'year')).toEqual({ from: '1998-01-01', to: '1998-12-31' });
  });

  it('ends a month on its real last day', () => {
    expect(precisionSpan('1998-02-01', 'month')).toEqual({ from: '1998-02-01', to: '1998-02-28' });
    expect(precisionSpan('2000-02-01', 'month')).toEqual({ from: '2000-02-01', to: '2000-02-29' });
  });

  it('keeps a day a point and refuses unknown', () => {
    expect(precisionSpan('1998-03-15', 'day')).toEqual({ from: '1998-03-15', to: '1998-03-15' });
    expect(precisionSpan(null, 'unknown')).toBeNull();
    expect(precisionSpan('1998-01-01', 'unknown')).toBeNull();
  });
});

describe('formatFactWhen', () => {
  it('reads a year-only fact as the whole year, never as a bare day', () => {
    expect(formatFactWhen('1998-01-01', 'year', null, null)).toBe('1998（全年）');
  });

  it('keeps a range and falls back to the start date', () => {
    expect(formatFactWhen('1998-01-01', 'year', '2001-01-01', 'year')).toBe('1998–2001');
    expect(formatFactWhen(null, 'unknown', null, null)).toBe('时间未知');
  });
});
