/**
 * T-009: the address bar carries the whole picture — view, focus, time window,
 * active filters and the compare set — on one route, in the query string.
 * The hash is never touched. Parsing never throws and never guesses:
 *   - a value that cannot be parsed is dropped, naming its key and raw text;
 *   - a value for a view/window/filter that M1 does not render yet is preserved
 *     byte-for-byte and reported as "not applied yet", never rewritten;
 *   - a repeated key is dropped as a whole (never first-wins).
 * Writing uses `replaceState` (no history entry in M1; the back-button view
 * history is M2, FR-024/T-012) and only when the canonical string changes.
 */

export type View = 'tree' | 'timeline' | 'network';

export const VIEWS: readonly View[] = ['tree', 'timeline', 'network'];

export interface UrlState {
  view: View;
  focus: string | null;
  /** Raw `t` value, preserved byte-for-byte until T-011 applies it. */
  time: string | null;
  /** Raw `f` value, preserved byte-for-byte until T-013 applies it. */
  filters: string | null;
  compare: string[];
}

export interface UrlDrop {
  key: string;
  raw: string;
  reason: 'unparseable' | 'duplicate';
}

export type NoticeKey = 'view' | 'focus' | 't' | 'f' | 'compare' | 'unknown';

export interface UrlNotice {
  key: NoticeKey;
  text: string;
}

export interface ParsedUrlState {
  state: UrlState;
  drops: UrlDrop[];
  /** One human line per dropped or not-yet-applied value; shown above the canvas. */
  notices: UrlNotice[];
}

export const DEFAULT_URL_STATE: UrlState = {
  view: 'tree',
  focus: null,
  time: null,
  filters: null,
  compare: [],
};

const KNOWN_KEYS = ['view', 'focus', 't', 'f', 'compare'] as const;
const TIME_RE = /^\d{4}(?:-\d{4})?$/;
const FILTER_RE = /^[a-z0-9_]+:[^,:]+(,[a-z0-9_]+:[^,:]+)*$/;
const MAX_COMPARE = 3;

function asView(raw: string): View | null {
  return (VIEWS as readonly string[]).includes(raw) ? (raw as View) : null;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function sanitizeCompare(raw: string, focus: string | null, notices: UrlNotice[]): string[] {
  const values = raw.split(',').map((v) => v.trim());
  const blanks = values.filter((v) => v === '').length;
  const nonEmpty = values.filter((v) => v !== '');
  if (blanks > 0) notices.push({ key: 'compare', text: `参数 compare 里有 ${blanks} 个空值，已忽略。` });
  const withoutFocus = nonEmpty.filter((v) => v !== focus);
  if (withoutFocus.length !== nonEmpty.length) {
    notices.push({ key: 'compare', text: '参数 compare 里包含当前聚焦对象，已忽略该重复项。' });
  }
  const unique = dedupe(withoutFocus);
  if (unique.length !== withoutFocus.length)
    notices.push({ key: 'compare', text: '参数 compare 有重复对象，已去重。' });
  if (unique.length > MAX_COMPARE) {
    notices.push({ key: 'compare', text: `参数 compare 超过 ${MAX_COMPARE} 个，已截断（FR-022 的对比组上限）。` });
    return unique.slice(0, MAX_COMPARE);
  }
  return unique;
}

/** Parse a query string (`''` or `'?…'`) into canonical state plus notices. */
export function parseUrlState(search: string): ParsedUrlState {
  const params = new URLSearchParams(search);
  const state: UrlState = { ...DEFAULT_URL_STATE, compare: [] };
  const drops: UrlDrop[] = [];
  const notices: UrlNotice[] = [];

  for (const key of new Set(params.keys())) {
    if (!(KNOWN_KEYS as readonly string[]).includes(key)) {
      drops.push({ key, raw: params.getAll(key).join('&'), reason: 'unparseable' });
      notices.push({ key: 'unknown', text: `未知参数 ${key}=${params.getAll(key).join('&')} 已忽略。` });
    }
    const all = params.getAll(key);
    if (all.length > 1) {
      drops.push({ key, raw: all.join('&'), reason: 'duplicate' });
      notices.push({ key: key as NoticeKey, text: `参数 ${key} 出现 ${all.length} 次，已忽略全部取值。` });
    }
  }

  const readOne = (key: string): string | null => {
    const all = params.getAll(key);
    return all.length === 1 ? all[0] : null;
  };

  const viewRaw = readOne('view');
  if (viewRaw !== null) {
    const view = asView(viewRaw);
    if (view === null) {
      drops.push({ key: 'view', raw: viewRaw, reason: 'unparseable' });
      notices.push({ key: 'view', text: `参数 view=${viewRaw} 不是 tree/timeline/network，已忽略。` });
    } else {
      state.view = view;
      if (view !== 'tree') {
        notices.push({
          key: 'view',
          text: `view=${view} 属 ${view === 'timeline' ? 'T-011' : 'T-012'}，当前仍显示树视图（参数已保留）。`,
        });
      }
    }
  }

  const focusRaw = readOne('focus');
  if (focusRaw !== null) {
    const focus = focusRaw.trim();
    if (focus === '') notices.push({ key: 'focus', text: '参数 focus 为空，已忽略。' });
    else state.focus = focus;
  }

  const timeRaw = readOne('t');
  if (timeRaw !== null) {
    if (!TIME_RE.test(timeRaw)) {
      drops.push({ key: 't', raw: timeRaw, reason: 'unparseable' });
      notices.push({ key: 't', text: `参数 t=${timeRaw} 不是年份或年份区间，已忽略。` });
    } else {
      state.time = timeRaw;
      notices.push({ key: 't', text: `时间窗 t=${timeRaw} 由 T-011 应用，当前未按它过滤（参数已保留）。` });
    }
  }

  const filtersRaw = readOne('f');
  if (filtersRaw !== null) {
    if (!FILTER_RE.test(filtersRaw)) {
      drops.push({ key: 'f', raw: filtersRaw, reason: 'unparseable' });
      notices.push({ key: 'f', text: `参数 f=${filtersRaw} 不是 axis:value 列表，已忽略。` });
    } else {
      state.filters = filtersRaw;
      notices.push({ key: 'f', text: `筛选 f=${filtersRaw} 由 T-013 应用，当前未按它过滤（参数已保留）。` });
    }
  }

  const compareRaw = readOne('compare');
  if (compareRaw !== null) state.compare = sanitizeCompare(compareRaw, state.focus, notices);

  return { state, drops, notices };
}

/**
 * Canonical query string: fixed order (view, focus, t, f, compare), defaults
 * omitted and the separators `:`/`,` left readable. Encoding never changes a
 * value's meaning; a well-formed `t`/`f` is written back with the same text a
 * reader sees in the address bar.
 */
function encodeValue(value: string): string {
  return encodeURIComponent(value).replace(/%3A/gi, ':').replace(/%2C/gi, ',');
}

export function serializeUrlState(state: UrlState): string {
  const parts: string[] = [];
  if (state.view !== 'tree') parts.push(`view=${encodeValue(state.view)}`);
  if (state.focus) parts.push(`focus=${encodeValue(state.focus)}`);
  if (state.time) parts.push(`t=${encodeValue(state.time)}`);
  if (state.filters) parts.push(`f=${encodeValue(state.filters)}`);
  if (state.compare.length > 0) parts.push(`compare=${state.compare.map(encodeValue).join(',')}`);
  return parts.length === 0 ? '' : `?${parts.join('&')}`;
}

export interface UrlLocation {
  origin: string;
  pathname: string;
  hash: string;
}

/** The browser surface the state lives on; a fake port makes the cycle testable. */
export interface HistoryPort {
  readSearch(): string;
  readLocation(): UrlLocation;
  write(url: string): void;
  subscribe(onChange: () => void): () => void;
}

export interface UrlStateController {
  get(): ParsedUrlState;
  set(next: UrlState): void;
  subscribe(listener: () => void): () => void;
  /** Absolute link for a state (defaults to the current one) — what "复制链接" copies. */
  link(state?: UrlState): string;
  dispose(): void;
}

export function createUrlStateController(port: HistoryPort): UrlStateController {
  let current = parseUrlState(port.readSearch());
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const listener of listeners) listener();
  };

  const unsubscribePort = port.subscribe(() => {
    current = parseUrlState(port.readSearch());
    emit();
  });

  return {
    get: () => current,
    set(next) {
      const prev = current.state;
      const keep = current.notices.filter((notice) => {
        if (notice.key === 'view') return next.view === prev.view;
        if (notice.key === 't') return next.time === prev.time;
        if (notice.key === 'f') return next.filters === prev.filters;
        if (notice.key === 'compare') return next.compare.join() === prev.compare.join();
        return false; // unknown/focus notices describe the URL that was just replaced
      });
      const canonical = serializeUrlState(next);
      const location = port.readLocation();
      const target = `${location.pathname}${canonical}${location.hash}`;
      const actual = `${location.pathname}${port.readSearch()}${location.hash}`;
      current = { state: next, drops: [], notices: keep };
      if (target !== actual) port.write(target);
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    link(state = current.state) {
      const location = port.readLocation();
      return `${location.origin}${location.pathname}${serializeUrlState(state)}${location.hash}`;
    },
    dispose() {
      unsubscribePort();
      listeners.clear();
    },
  };
}

export const windowPort: HistoryPort = {
  readSearch: () => window.location.search,
  readLocation: () => ({
    origin: window.location.origin,
    pathname: window.location.pathname,
    hash: window.location.hash,
  }),
  write: (url) => window.history.replaceState(null, '', url),
  subscribe: (onChange) => {
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  },
};
