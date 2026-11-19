import { describe, expect, it } from 'vitest';
import { formatDate, formatSpan } from './format';

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
