/**
 * OSE-1564 — the toast's stylesheet and its colour pairs, in both themes.
 *
 * Colours come only from tokens that already exist (--success, --danger,
 * --on-accent, --surface, --text, --border-strong). The fills are checked here
 * and, through brandContrastPairs, by `pnpm ui:contrast` for the base palette
 * and every registered brand.
 */
import { describe, it, expect } from 'vitest';
import { componentStyles } from '../src/styles';
import { ocrStylesheet } from '../src/css';
import { toastStyles } from '../src/toast';
import { contrastRatio } from '../src/contrast';
import { resolveBrandPalette, brandContrastPairs, BRAND_LOCKED } from '../src/brand';
import { primitives, semanticDark, semanticLight } from '../src/tokens';

/** The declaration block for an exact selector inside the toast block. */
function rule(sel: string): string {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`(?:^|\\n|\\})${esc}\\{([^}]*)\\}`).exec(toastStyles);
  if (!m?.[1]) throw new Error(`no toast rule for ${sel}`);
  return m[1];
}

describe('the toast styles ship in the shared stylesheet', () => {
  it('toastStyles is part of componentStyles and of /ui.css', () => {
    expect(toastStyles.length).toBeGreaterThan(200);
    expect(componentStyles).toContain(toastStyles);
    expect(ocrStylesheet).toContain('.ocr-toast-region');
  });

  it('defines every class the script builds', () => {
    for (const sel of [
      '.ocr-toast-region',
      '.ocr-toast-live',
      '.ocr-toast',
      '.ocr-toast--success',
      '.ocr-toast--failure',
      '.ocr-toast--neutral',
      '.ocr-toast-icon',
      '.ocr-toast-body',
      '.ocr-toast-msg',
      '.ocr-toast-btn',
      '.ocr-toast-dismiss',
      '.ocr-toast-details',
      '.ocr-toast-details-text',
      '.ocr-toast-copy-buffer',
      '.ocr-sr-only',
    ]) {
      expect(toastStyles, `missing ${sel}`).toContain(sel);
    }
  });
});

describe('colours: tokens only, no new hex', () => {
  it('the block carries no colour literal', () => {
    expect(/#[0-9a-fA-F]{3,8}\b/.test(toastStyles)).toBe(false);
    expect(/\brgba?\(|\bhsla?\(/.test(toastStyles)).toBe(false);
  });

  it('every colour it uses is a var() of a token that exists', () => {
    const known = new Set([...Object.keys(semanticDark), ...Object.keys(primitives)]);
    const used = [...toastStyles.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1] as string);
    expect(used.length).toBeGreaterThan(5);
    const unknown = used.filter((u) => !known.has(u) && !['--radius', '--radius-sm', '--font', '--text-min', '--tap-min'].includes(u));
    expect(unknown).toEqual([]);
  });

  it('success and failure are painted from the locked status tokens', () => {
    expect(rule('.ocr-toast--success')).toContain('var(--success)');
    expect(rule('.ocr-toast--failure')).toContain('var(--danger)');
    expect(rule('.ocr-toast--failure')).toContain('var(--on-accent)');
    for (const t of ['--success', '--danger']) expect(BRAND_LOCKED).toContain(t as never);
  });
});

describe('contrast, both themes (WCAG AA)', () => {
  for (const mode of ['dark', 'light'] as const) {
    const pal = resolveBrandPalette('', mode);
    const ratio = (a: string, b: string) => contrastRatio(pal[a] as string, pal[b] as string);

    it(`${mode}: text on the success fill (--on-accent on --success) >= 4.5`, () => {
      expect(ratio('--on-accent', '--success')).toBeGreaterThanOrEqual(4.5);
    });
    it(`${mode}: text on the failure fill (--on-accent on --danger) >= 4.5`, () => {
      expect(ratio('--on-accent', '--danger')).toBeGreaterThanOrEqual(4.5);
    });
    it(`${mode}: the check and the cross on their white circle (--success / --danger on --on-accent) >= 3`, () => {
      expect(ratio('--success', '--on-accent')).toBeGreaterThanOrEqual(3);
      expect(ratio('--danger', '--on-accent')).toBeGreaterThanOrEqual(3);
    });
    it(`${mode}: the neutral toast text and the details panel text (--text on --surface) >= 4.5`, () => {
      expect(ratio('--text', '--surface')).toBeGreaterThanOrEqual(4.5);
    });
    it(`${mode}: the neutral toast edge (--border-strong on each ground) >= 3`, () => {
      for (const g of ['--bg', '--surface', '--surface-hover']) expect(ratio('--border-strong', g)).toBeGreaterThanOrEqual(3);
    });
    it(`${mode}: the fills stand apart from the page (--success and --danger on --bg) >= 3`, () => {
      expect(ratio('--success', '--bg')).toBeGreaterThanOrEqual(3);
      expect(ratio('--danger', '--bg')).toBeGreaterThanOrEqual(3);
    });
  }

  it('the shared contrast matrix (and so `pnpm ui:contrast`, for every brand) covers the success fill', () => {
    const pairs = brandContrastPairs();
    expect(pairs.some((p) => p.fg === '--on-accent' && p.bg === '--success' && p.min === 4.5)).toBe(true);
    expect(pairs.some((p) => p.fg === '--on-accent' && p.bg === '--danger' && p.min === 4.5)).toBe(true);
  });

  it('sanity: the semantic maps both define every token the toast reads', () => {
    for (const t of ['--success', '--danger', '--on-accent', '--surface', '--text', '--border-strong', '--bg']) {
      expect(t in semanticDark && t in semanticLight).toBe(true);
    }
  });
});

describe('touch targets, motion and placement', () => {
  it('dismiss, details arrow, copy and action are at least 44x44', () => {
    for (const sel of ['.ocr-toast-btn', '.ocr-toast-dismiss']) {
      const r = rule(sel);
      expect(r, sel).toMatch(/min-height:\s*44px/);
      expect(r, sel).toMatch(/min-width:\s*44px/);
    }
  });

  it('text never drops under the 13px floor', () => {
    const sizes = [...toastStyles.matchAll(/font-size:\s*([^;}]+)/g)].map((m) => (m[1] ?? '').trim());
    expect(sizes.length).toBeGreaterThan(2);
    for (const v of sizes) {
      if (v === 'var(--text-min)') continue;
      const rem = /^(\d*\.?\d+)rem$/.exec(v);
      expect(rem, `${v} must be a rem length or --text-min`).toBeTruthy();
      expect(Number(rem?.[1]) * 16).toBeGreaterThanOrEqual(13);
    }
  });

  it('respects prefers-reduced-motion: the entry animation is switched off', () => {
    const m = /@media\(prefers-reduced-motion:reduce\)\{([^]*?)\}\s*\}/.exec(toastStyles) ?? /@media\(prefers-reduced-motion:reduce\)\{([^]*)$/.exec(toastStyles);
    expect(m, 'toast block has its own reduced-motion rule').toBeTruthy();
    expect(m?.[1]).toMatch(/\.ocr-toast\{[^}]*animation:\s*none/);
  });

  it('is a fixed region that lets clicks through to the page around the toasts', () => {
    const r = rule('.ocr-toast-region');
    expect(r).toContain('position:fixed');
    expect(r).toContain('pointer-events:none');
    expect(rule('.ocr-toast')).toContain('pointer-events:auto');
  });

  it('sits at the top and clears the notch, so it never covers a bottom action or the bottom nav', () => {
    const r = rule('.ocr-toast-region');
    expect(r).toMatch(/top:\s*calc\([^)]*env\(safe-area-inset-top/);
    expect(r).not.toMatch(/bottom:/);
  });

  it('stays out of a printed page', () => {
    expect(toastStyles).toMatch(/@media print\{[^}]*\.ocr-toast-region\{display:none\}/);
  });

  it('keeps a visible keyboard focus ring on every control', () => {
    expect(toastStyles).toMatch(/\.ocr-toast-btn:focus-visible[^{]*\{[^}]*outline:\s*2px solid/);
  });

  it('has no box-shadow (the design system has a no-shadow rule)', () => {
    expect(toastStyles).not.toContain('box-shadow');
  });
});
