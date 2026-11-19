/**
 * T-006 minimal URL state: the focused object lives in `?focus=<id>`.
 * Full state (view/time/filters/compare) arrives with T-009; this module is
 * the single place that knows the query-string format so the hook can replace
 * it without touching the screens.
 */

export const FOCUS_PARAM = 'focus';

/** Read `?focus=` from a query string (`''` or `'?...'`); blank means no focus. */
export function readFocus(search: string): string | null {
  const value = new URLSearchParams(search).get(FOCUS_PARAM);
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

/** Return the query string carrying exactly one focus (leading `?`, or empty). */
export function withFocus(search: string, id: string | null): string {
  const params = new URLSearchParams(search);
  const next = id?.trim() ?? '';
  if (next === '') params.delete(FOCUS_PARAM);
  else params.set(FOCUS_PARAM, next);
  const query = params.toString();
  return query === '' ? '' : `?${query}`;
}

/** Absolute, copyable deep link to one object; `null` means the current view. */
export function focusLink(
  location: Pick<Location, 'origin' | 'pathname' | 'search'>,
  id: string | null,
): string {
  return `${location.origin}${location.pathname}${withFocus(location.search, id)}`;
}

/**
 * Update the address bar without a navigation or a reload. The resulting string
 * is what the drawer's "复制链接" button copies and what a reload restores.
 */
export function applyFocus(id: string | null): void {
  const { pathname, search, hash } = window.location;
  window.history.replaceState(null, '', `${pathname}${withFocus(search, id)}${hash}`);
}
