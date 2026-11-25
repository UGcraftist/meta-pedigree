import { describe, expect, it } from 'vitest';
import {
  createUrlStateController,
  parseUrlState,
  serializeUrlState,
  type HistoryPort,
  type UrlState,
} from './urlState';

const ID = '0191aa11-2222-7333-8444-555566667777';
const OTHER = '0191aa11-2222-7333-8444-999999999999';

function state(patch: Partial<UrlState> = {}): UrlState {
  return {
    view: 'tree',
    focus: null,
    time: null,
    filters: null,
    compare: [],
    ...patch,
  };
}

function fakePort(initialSearch = '') {
  let search = initialSearch;
  const location = { origin: 'https://example.test', pathname: '/app', hash: '#anchor' };
  const writes: string[] = [];
  let listener: (() => void) | null = null;

  const applyWrite = (url: string) => {
    const hashAt = url.indexOf('#');
    const pathAndQuery = hashAt === -1 ? url : url.slice(0, hashAt);
    const queryAt = pathAndQuery.indexOf('?');
    search = queryAt === -1 ? '' : pathAndQuery.slice(queryAt);
  };

  let subscribes = 0;
  let unsubscribes = 0;
  const port: HistoryPort = {
    readSearch: () => search,
    readLocation: () => location,
    write: (url) => {
      writes.push(url);
      applyWrite(url);
    },
    subscribe: (onChange) => {
      subscribes += 1;
      listener = onChange;
      return () => {
        unsubscribes += 1;
        listener = null;
      };
    },
  };

  return {
    port,
    writes,
    location,
    counts: () => ({ subscribes, unsubscribes }),
    setSearch: (next: string) => {
      search = next;
      listener?.();
    },
  };
}

describe('parseUrlState', () => {
  it('defaults to the tree view with no state', () => {
    expect(parseUrlState('')).toEqual({ state: state(), drops: [], notices: [] });
    expect(parseUrlState('?').state).toEqual(state());
  });

  it('reads a full deep link', () => {
    const parsed = parseUrlState(`?view=tree&focus=${ID}&t=2015-2024&f=region:eu,kind:startup&compare=${OTHER}`);
    expect(parsed.state).toEqual({
      view: 'tree',
      focus: ID,
      time: '2015-2024',
      filters: 'region:eu,kind:startup',
      compare: [OTHER],
    });
    // Preserved but not applied yet: one line per unbuilt control.
    expect(parsed.notices).toHaveLength(2);
    expect(parsed.notices[0].text).toContain('t=2015-2024');
    expect(parsed.notices[0].text).toContain('T-011');
    expect(parsed.notices[1].text).toContain('T-013');
    expect(parsed.drops).toEqual([]);
  });

  it('preserves a known-but-unbuilt view and says so instead of dropping it', () => {
    const timeline = parseUrlState('?view=timeline');
    expect(timeline.state.view).toBe('timeline');
    expect(timeline.drops).toEqual([]);
    expect(timeline.notices.map((n) => n.text).join(' ')).toContain('T-011');

    const network = parseUrlState('?view=network');
    expect(network.state.view).toBe('network');
    expect(network.drops).toEqual([]);
    expect(network.notices.map((n) => n.text).join(' ')).toContain('T-011');
  });

  it('drops an unparseable value naming key and raw text', () => {
    const parsed = parseUrlState('?view=map&focus=%20%20');
    expect(parsed.state.view).toBe('tree');
    expect(parsed.state.focus).toBeNull();
    expect(parsed.drops).toContainEqual({ key: 'view', raw: 'map', reason: 'unparseable' });
    expect(parsed.notices.map((n) => n.text).join(' ')).toContain('view=map');
    expect(parsed.notices.map((n) => n.text).join(' ')).toContain('focus 为空');
  });

  it('drops malformed t and f but keeps well-formed values byte-for-byte', () => {
    const bad = parseUrlState('?t=20-20&f=region&focus=' + ID);
    expect(bad.state.time).toBeNull();
    expect(bad.state.filters).toBeNull();
    expect(bad.drops.map((d) => d.key).sort()).toEqual(['f', 't']);

    const good = parseUrlState('?t=2015&f=region:eu');
    expect(good.state.time).toBe('2015');
    expect(good.state.filters).toBe('region:eu');
  });

  it('drops a repeated key as a whole instead of first-wins', () => {
    const parsed = parseUrlState(`?focus=${ID}&focus=${OTHER}`);
    expect(parsed.state.focus).toBeNull();
    expect(parsed.drops).toContainEqual({ key: 'focus', raw: `${ID}&${OTHER}`, reason: 'duplicate' });
    expect(parsed.notices.map((n) => n.text).join(' ')).toContain('出现 2 次');
  });

  it('drops unknown keys with a notice', () => {
    const parsed = parseUrlState('?utm=x');
    expect(parsed.drops).toContainEqual({ key: 'utm', raw: 'x', reason: 'unparseable' });
    expect(parsed.notices.map((n) => n.text).join(' ')).toContain('utm=x');
  });

  it('sanitizes compare: blanks, the focused id, duplicates and the cap of 3', () => {
    const parsed = parseUrlState(`?focus=${ID}&compare=${ID},,${OTHER},${OTHER},a,b,c`);
    expect(parsed.state.compare).toEqual([OTHER, 'a', 'b']);
    const text = parsed.notices.map((n) => n.text).join(' ');
    expect(text).toContain('空值');
    expect(text).toContain('聚焦对象');
    expect(text).toContain('去重');
    expect(text).toContain('截断');
  });

  it('never throws on a bad percent escape (URLSearchParams decodes to U+FFFD)', () => {
    expect(() => parseUrlState('?focus=%E0%A4%A')).not.toThrow();
    // We never call decodeURIComponent ourselves, which would throw on this input.
    expect(parseUrlState('?focus=%E0%A4%A').state.focus).toBe('\u{FFFD}%A');
    expect(parseUrlState('?t=%').state.time).toBeNull();
  });
});

describe('serializeUrlState', () => {
  // The old T-006 test asserted that unrelated params keep their input order.
  // That is now deliberately reversed: the canonical string fixes the order
  // (view, focus, t, f, compare) so two links to the same state are identical.
  it('omits defaults and writes a fixed parameter order', () => {
    expect(serializeUrlState(state())).toBe('');
    expect(
      serializeUrlState(
        state({ view: 'timeline', focus: ID, time: '2015-2024', filters: 'region:eu', compare: [OTHER] }),
      ),
    ).toBe(`?view=timeline&focus=${ID}&t=2015-2024&f=region:eu&compare=${OTHER}`);
  });

  it('round-trips and is idempotent', () => {
    const link = `?view=timeline&focus=${ID}&t=2015-2024&f=region:eu&compare=${OTHER}`;
    const once = parseUrlState(link);
    const twice = parseUrlState(serializeUrlState(once.state));
    expect(twice.state).toEqual(once.state);
    expect(serializeUrlState(twice.state)).toBe(serializeUrlState(once.state));
  });
});

describe('createUrlStateController', () => {
  it('reads the URL, writes canonically, keeps the hash and does not churn', () => {
    const { port, writes } = fakePort(`?focus=${ID}`);
    const controller = createUrlStateController(port);
    expect(controller.get().state.focus).toBe(ID);

    controller.set(state({ focus: ID }));
    expect(writes).toEqual([]); // canonical string unchanged → no history write

    controller.set(state({ focus: OTHER }));
    expect(writes).toEqual([`/app?focus=${OTHER}#anchor`]);
    expect(controller.get().state.focus).toBe(OTHER);
    controller.dispose();
  });

  it('keeps the not-yet-applied notices when an unrelated value changes', () => {
    const { port } = fakePort('?t=2015-2024&f=region:eu');
    const controller = createUrlStateController(port);
    expect(controller.get().notices).toHaveLength(2);

    controller.set(state({ time: '2015-2024', filters: 'region:eu', focus: ID }));
    expect(
      controller
        .get()
        .notices.map((n) => n.key)
        .sort(),
    ).toEqual(['f', 't']);
    controller.dispose();
  });

  it('follows popstate by re-reading the URL', () => {
    const { port, setSearch } = fakePort('');
    const controller = createUrlStateController(port);
    controller.start();
    const seen: string[] = [];
    controller.subscribe(() => seen.push(controller.get().state.focus ?? 'none'));

    setSearch(`?focus=${ID}`);
    expect(seen).toEqual([ID]);
    controller.dispose();
  });

  it('re-arms the port after dispose/start (StrictMode remount)', () => {
    const { port, setSearch, counts } = fakePort('');
    const controller = createUrlStateController(port);
    controller.start();
    expect(counts()).toEqual({ subscribes: 1, unsubscribes: 0 });
    controller.dispose();
    expect(counts()).toEqual({ subscribes: 1, unsubscribes: 1 });
    controller.start();
    expect(counts()).toEqual({ subscribes: 2, unsubscribes: 1 });

    const seen: string[] = [];
    controller.subscribe(() => seen.push(controller.get().state.focus ?? 'none'));
    setSearch(`?focus=${ID}`);
    expect(seen).toEqual([ID]);
    controller.dispose();
    expect(counts().unsubscribes).toBe(2);
  });

  it('stop() really unsubscribes: a later popstate is not seen', () => {
    const { port, setSearch, counts } = fakePort('');
    const controller = createUrlStateController(port);
    controller.start();
    controller.stop();
    expect(counts().unsubscribes).toBe(1);
    const seen: string[] = [];
    controller.subscribe(() => seen.push(controller.get().state.focus ?? 'none'));
    setSearch(`?focus=${ID}`);
    expect(seen).toEqual([]);
    controller.dispose();
  });

  it('drops an ignored-value notice once the write removed the parameter', () => {
    const { port } = fakePort('?view=map');
    const controller = createUrlStateController(port);
    expect(controller.get().notices).toHaveLength(1);
    controller.set(state({ focus: ID }));
    expect(controller.get().notices).toEqual([]);
    expect(controller.get().state.view).toBe('tree');
    controller.dispose();
  });

  it('normalises what it stores, so get() and a reload of link() agree', () => {
    const { port, writes } = fakePort('');
    const controller = createUrlStateController(port);
    controller.set(state({ compare: ['a', 'b', 'c', 'd'] }));
    expect(controller.get().state.compare).toEqual(['a', 'b', 'c']);
    expect(writes).toEqual(['/app?compare=a,b,c#anchor']);
    controller.dispose();
  });

  it('builds absolute copy links from canonical state, not from the raw address bar', () => {
    const { port } = fakePort('?view=map&junk=1');
    const controller = createUrlStateController(port);
    expect(controller.get().state.view).toBe('tree');
    // A dropped value must not be copied back by the share button.
    expect(controller.link()).toBe('https://example.test/app#anchor');
    expect(controller.link(state({ focus: ID }))).toBe(`https://example.test/app?focus=${ID}#anchor`);
    controller.dispose();
  });
});
