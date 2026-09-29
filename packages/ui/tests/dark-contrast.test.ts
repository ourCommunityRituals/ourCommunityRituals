import { describe, it, expect } from 'vitest';
import { primitives, semanticDark } from '../src/tokens';
import { componentStyles } from '../src/styles';
import { contrastRatio } from '../src/contrast';
import { resolveBrandPalette, brandContrastPairs } from '../src/brand';

// Dark theme, measured where the stylesheet puts each pair: text on the page,
// on cards and on hovered rows; the edge of a form control; accent used as
// text (links, active nav, stat values). The companion light-contrast suite
// covers the light theme. A 2026-09-29 rendered audit of 22 surfaces found
// these pairs under their floors in dark: accent as text 4.11:1 on cards,
// muted text 4.04:1 on hovered rows, control edges 1.51:1.

const P = primitives as Record<string, string>;
const D = (token: string): string => {
  const v = (semanticDark as Record<string, string>)[token];
  const m = /^var\((--[\w-]+)\)$/.exec(v ?? '');
  const hex = m?.[1] ? P[m[1]] : v;
  if (!hex?.startsWith('#')) throw new Error(`${token} does not resolve to a hex`);
  return hex;
};
const GROUNDS = ['--bg', '--surface', '--surface-hover'];

/** The declaration block for a selector, e.g. rule('.filter-chip'). */
const rule = (sel: string): string => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`(?:^|\\n|\\})${esc}\\{([^}]*)\\}`).exec(componentStyles);
  if (!m?.[1]) throw new Error(`no rule for ${sel}`);
  return m[1];
};

describe('dark theme: text roles that sit on every ground (>= 4.5:1)', () => {
  for (const ink of ['--text', '--text-muted', '--accent']) {
    for (const ground of GROUNDS) {
      it(`${ink} on ${ground}`, () => {
        expect(contrastRatio(D(ink), D(ground))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

describe('dark theme: status text on page and card grounds (>= 4.5:1)', () => {
  for (const ink of ['--live', '--danger', '--warn', '--info', '--success']) {
    for (const ground of ['--bg', '--surface']) {
      it(`${ink} on ${ground}`, () => {
        expect(contrastRatio(D(ink), D(ground))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

describe('dark theme: control edges (WCAG 1.4.11, >= 3:1)', () => {
  for (const ground of GROUNDS) {
    it(`--border-strong on ${ground}`, () => {
      expect(contrastRatio(D('--border-strong'), D(ground))).toBeGreaterThanOrEqual(3);
    });
  }

  it('filter chips and the off toggle track are edged with --border-strong', () => {
    expect(rule('.filter-chip')).toContain('border:1px solid var(--border-strong)');
    expect(rule('.toggle-track')).toContain('background:var(--border-strong)');
  });
});

describe('footer: legible and reachable', () => {
  it('the subtitle is muted by colour, not dimmed by opacity', () => {
    const sub = rule('.ocr-footer-sub');
    expect(sub).not.toMatch(/opacity/);
    expect(sub).toContain('color:var(--text-muted)');
  });

  it('legal links are 44px tall on every pointer, not only touch', () => {
    expect(rule('.ocr-footer a')).toContain('min-height:44px');
  });
});

describe('the base palette meets every floor a brand must meet (both themes)', () => {
  // brandContrastPairs() is the matrix registered brands are held to; the base
  // palette (no [data-brand]) is resolved the same way and held to all of it.
  for (const mode of ['dark', 'light'] as const) {
    const pal = resolveBrandPalette('', mode);
    for (const pair of brandContrastPairs()) {
      it(`${mode}: ${pair.fg} on ${pair.bg} >= ${String(pair.min)}:1`, () => {
        const fg = pal[pair.fg];
        const bg = pal[pair.bg];
        expect(fg && bg, `${pair.fg} / ${pair.bg} must resolve`).toBeTruthy();
        expect(contrastRatio(fg as string, bg as string)).toBeGreaterThanOrEqual(pair.min);
      });
    }
  }
});
