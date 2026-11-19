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
