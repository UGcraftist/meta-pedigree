/** Date and precision rendering shared by the canvas and the detail drawer (FR-014). */

export const PRECISION_LABEL: Record<string, string> = {
  day: '日',
  month: '月',
  year: '年',
  unknown: '未知',
};

/** Render a visible date at the precision it was recorded with: 1992 / 1992-11 / 1992-11-02. */
export function formatDate(date: string | null, precision: string | null): string {
  if (!date) return '';
  if (precision === 'month') return date.slice(0, 7);
  if (precision === 'day') return date;
  return date.slice(0, 4);
}

/** Start–end span; an unknown start is said out loud instead of rendered as a gap. */
export function formatSpan(
  startDate: string | null,
  startPrecision: string | null,
  endDate: string | null,
  endPrecision: string | null,
): string {
  const start = formatDate(startDate, startPrecision);
  if (!start) return '时间未知';
  if (!endDate) return start;
  return `${start}–${formatDate(endDate, endPrecision)}`;
}

/**
 * The interval a recorded date actually denotes (FR-003: a year-only value is a
 * band, never a point silently shown as a day). Pure so the drawer and, later,
 * the timeline (T-011) share one definition.
 */
export interface DateSpan {
  from: string;
  to: string;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function precisionSpan(date: string | null, precision: string | null): DateSpan | null {
  if (!date) return null;
  const [y, m] = date.split('-').map((n) => Number.parseInt(n, 10));
  if (precision === 'year') return { from: `${y}-01-01`, to: `${y}-12-31` };
  if (precision === 'month') {
    const last = String(lastDayOfMonth(y, m)).padStart(2, '0');
    return { from: `${date.slice(0, 7)}-01`, to: `${date.slice(0, 7)}-${last}` };
  }
  if (precision === 'day') return { from: date, to: date };
  return null;
}

/** Drawer display: a year-only fact reads "1998（全年）", not a bare point. */
export function formatFactWhen(
  startDate: string | null,
  startPrecision: string | null,
  endDate: string | null,
  endPrecision: string | null,
): string {
  if (!startDate) return '时间未知';
  if (endDate) return `${formatDate(startDate, startPrecision)}–${formatDate(endDate, endPrecision)}`;
  // The interval the precision denotes is shown as text (FR-003), not as a bare point.
  const span = precisionSpan(startDate, startPrecision);
  if (span && startPrecision === 'year') return `${startDate.slice(0, 4)}（全年）`;
  if (span && startPrecision === 'month') return `${startDate.slice(0, 7)}（整月）`;
  return formatDate(startDate, startPrecision);
}
