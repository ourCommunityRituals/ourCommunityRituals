/**
 * Named surfaces (ourWKRP) — the vocabulary lifted out of WKRP's nine templates
 * when they moved onto the shared sheet (ADR-008). Colour-literal freedom is
 * already gated by stylesheet-tokens.test.ts; this file pins what that one
 * cannot: the section exists, its interactive classes have focus rings and
 * motion opt-outs, its tap targets are >= 44px, and the visibility utilities
 * come last so no component rule can un-hide an element.
 */
import { describe, it, expect } from 'vitest';
import { componentStyles } from '../src/styles';

const sectionStart = componentStyles.indexOf('Named surfaces (ourWKRP)');
const section = componentStyles.slice(sectionStart, componentStyles.indexOf('/* Accessibility: keyboard focus rings'));

describe('named surfaces (ourWKRP)', () => {
  it('lives in one clearly marked section', () => {
    expect(sectionStart).toBeGreaterThan(-1);
    for (const sel of ['.ow-signin', '.filter-row', '.dj-name', '.set-controls', '.big-stats', '.profile-name', '.facet-chip', '.portfolio-add', '.result-success.failed']) {
      expect(section, sel).toContain(sel);
    }
  });

  it('sets no colour of its own — every colour is a token', () => {
    expect(section).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(section).not.toMatch(/rgba?\(/);
  });

  it('interactive surfaces have a keyboard focus ring', () => {
    for (const sel of ['.genre-tag:focus-visible', '.contributor-item:focus-visible', '.search-result:focus-visible', '.btn-link:focus-visible']) {
      expect(componentStyles, sel).toContain(sel);
    }
  });

  it('every transition it adds is switched off under prefers-reduced-motion', () => {
    const reduced = componentStyles.slice(componentStyles.indexOf('@media(prefers-reduced-motion:reduce)'));
    for (const sel of ['.search-result', '.set-list .track-card']) {
      expect(reduced, sel).toContain(sel);
    }
  });

  it('tap targets it defines are at least 44px', () => {
    for (const rule of ['.load-more{', '.genre-tag.genre-tag--lg,.facet-chip{', '.set-track,.search-result{', '.offline-msg a{']) {
      const body = componentStyles.slice(componentStyles.indexOf(rule)).split('}')[0]!;
      const px = Number(/min-height:(\d+)px/.exec(body)?.[1] ?? 0);
      expect(px, rule).toBeGreaterThanOrEqual(44);
    }
  });

  it('.hidden and [hidden] are the last rules, so nothing after them can un-hide', () => {
    const tail = componentStyles.trimEnd().split('\n').slice(-2).join('\n');
    expect(tail).toBe('.hidden{display:none}\n[hidden]{display:none!important}');
  });
});
