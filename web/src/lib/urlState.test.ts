import { describe, expect, it } from 'vitest';
import { focusLink, readFocus, withFocus } from './urlState';

const ID = '0191aa11-2222-7333-8444-555566667777';

describe('readFocus', () => {
  it('returns null without a focus parameter', () => {
    expect(readFocus('')).toBeNull();
    expect(readFocus('?view=tree')).toBeNull();
  });

  it('returns null for a blank focus', () => {
    expect(readFocus('?focus=')).toBeNull();
    expect(readFocus('?focus=%20')).toBeNull();
  });

  it('returns the id, trimming stray whitespace', () => {
    expect(readFocus(`?focus=${ID}`)).toBe(ID);
    expect(readFocus(`?focus=%20${ID}%20`)).toBe(ID);
  });

  it('finds focus next to other parameters', () => {
    expect(readFocus(`?view=tree&focus=${ID}&t=2015-2024`)).toBe(ID);
  });
});

describe('withFocus', () => {
  it('adds the parameter when there was none', () => {
    expect(withFocus('', ID)).toBe(`?focus=${ID}`);
  });

  it('replaces an existing focus without duplicating it', () => {
    const other = '0191aa11-2222-7333-8444-999999999999';
    const next = new URLSearchParams(withFocus(`?focus=${other}`, ID));
    expect(next.get('focus')).toBe(ID);
    expect(withFocus(`?focus=${other}`, ID).match(/focus=/g)).toHaveLength(1);
  });

  it('keeps unrelated parameters and their order', () => {
    expect(withFocus('?view=tree&focus=old&t=2015-2024', ID)).toBe(
      `?view=tree&focus=${ID}&t=2015-2024`,
    );
  });

  it('removes the parameter and the leading ? when focus is cleared', () => {
    expect(withFocus(`?focus=${ID}`, null)).toBe('');
    expect(withFocus(`?view=tree&focus=${ID}`, null)).toBe('?view=tree');
  });
});

describe('focusLink', () => {
  it('builds an absolute link that reopens the same focus', () => {
    expect(focusLink({ origin: 'http://localhost:5173', pathname: '/', search: '' }, ID)).toBe(
      `http://localhost:5173/?focus=${ID}`,
    );
  });
});
