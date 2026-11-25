/**
 * esc() and escUrl(): the escaping every partial, and every spoke that imports
 * @ocr/ui, relies on between stored text and the page.
 *
 * Written after the first mutation run of this package (stryker.conf.mjs):
 * nothing tested these two functions directly, and 9 of their 18 mutants
 * survived. Dropping the `&`, `"` or `'` replacement, the `^` anchor, the
 * trim, or the '#' fallback all passed the suite. Each case below was watched
 * failing with its fault written in.
 */
import { describe, expect, it } from 'vitest';
import { esc, escUrl } from '../src/esc';

describe('esc', () => {
  it('escapes each of the five HTML-significant characters', () => {
    expect(esc('&')).toBe('&amp;');
    expect(esc('<')).toBe('&lt;');
    expect(esc('>')).toBe('&gt;');
    expect(esc('"')).toBe('&quot;');
    expect(esc("'")).toBe('&#39;');
  });

  it('escapes & first, so an entity in the input is not left live', () => {
    expect(esc('&lt;script&gt;')).toBe('&amp;lt;script&amp;gt;');
  });

  it('closes an attribute breakout in either quote style', () => {
    expect(esc('" onmouseover="x')).toBe('&quot; onmouseover=&quot;x');
    expect(esc("' onfocus='x")).toBe('&#39; onfocus=&#39;x');
  });

  it('reads null and undefined as empty text, and other values as their string', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
    expect(esc(0)).toBe('0');
    expect(esc(false)).toBe('false');
  });
});

describe('escUrl', () => {
  it('replaces javascript: and data: URLs with #, in any case', () => {
    expect(escUrl('javascript:alert(1)')).toBe('#');
    expect(escUrl('JavaScript:alert(1)')).toBe('#');
    expect(escUrl('data:text/html,<b>x</b>')).toBe('#');
    expect(escUrl('DATA:text/html,x')).toBe('#');
  });

  it('trims before checking, so leading space does not hide the scheme', () => {
    expect(escUrl('  javascript:alert(1)')).toBe('#');
    expect(escUrl(' /events ')).toBe('/events');
  });

  it('keeps an ordinary link whose path mentions a scheme, and escapes it', () => {
    expect(escUrl('/help?topic=javascript:basics')).toBe('/help?topic=javascript:basics');
    expect(escUrl('/notes/data:sheet')).toBe('/notes/data:sheet');
    expect(escUrl('/e?a=1&b="2"')).toBe('/e?a=1&amp;b=&quot;2&quot;');
  });

  it('reads null and undefined as empty', () => {
    expect(escUrl(null)).toBe('');
    expect(escUrl(undefined)).toBe('');
  });
});
