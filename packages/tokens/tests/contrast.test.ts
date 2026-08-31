/**
 * Contrast is asserted, not documented. Every foreground/background pairing that
 * ships is measured here; a new pair without an assertion is a failing test.
 */
import { describe, it, expect } from 'vitest';
import { primitives } from '../src/primitive.js';
import { brands, validateBrand, type RoleMap } from '../src/semantic.js';
import { contrastRatio } from '../src/contrast.js';
import { uecDisplay } from '../src/uec.js';

/** Resolve `var(--ocr-x)` to its literal hex so it can be measured. */
function hex(value: string): string {
  const m = value.match(/^var\((--[a-z0-9-]+)\)$/i);
  const raw = m ? primitives[m[1] as keyof typeof primitives] : value;
  if (typeof raw !== 'string' || !raw.startsWith('#')) {
    throw new Error(`Not resolvable to a hex color: ${value}`);
  }
  return raw;
}

const AA_TEXT = 4.5;
const AA_LARGE = 3.0;

describe.each(Object.entries(brands))('brand: %s', (_name, theme) => {
  describe.each([
    ['dark', theme.dark],
    ['light', theme.light],
  ] as const)('%s mode', (_mode, map: RoleMap) => {
    it('body text clears AA on the ground', () => {
      expect(contrastRatio(hex(map['--text']), hex(map['--ground']))).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('body text clears AA on the surface', () => {
      expect(contrastRatio(hex(map['--text']), hex(map['--surface']))).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('muted text clears AA on the ground', () => {
      expect(contrastRatio(hex(map['--text-muted']), hex(map['--ground']))).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('the action color clears AA on the ground', () => {
      expect(contrastRatio(hex(map['--action']), hex(map['--ground']))).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('label-on-action clears AA', () => {
      expect(contrastRatio(hex(map['--on-action']), hex(map['--action']))).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('the focus ring is visible against the ground', () => {
      expect(contrastRatio(hex(map['--focus-ring']), hex(map['--ground']))).toBeGreaterThanOrEqual(AA_LARGE);
    });

    it('every status color is distinguishable from the ground', () => {
      for (const role of ['--status-live', '--status-warn', '--status-danger'] as const) {
        expect(contrastRatio(hex(map[role]), hex(map['--ground']))).toBeGreaterThanOrEqual(AA_LARGE);
      }
    });
  });
});

describe('poster', () => {
  it('ink on stock far exceeds AA — it must survive a photocopy', () => {
    const ratio = contrastRatio(primitives['--ocr-ink-900'], primitives['--ocr-paper-100']);
    expect(ratio).toBeGreaterThanOrEqual(7);
  });
});

describe('UEC', () => {
  it('every display color pairs with black or white at 3:1 or better', () => {
    for (const [name, value] of Object.entries(uecDisplay)) {
      const best = Math.max(contrastRatio(value, '#FFFFFF'), contrastRatio(value, '#000000'));
      expect(best, `${name} (${value}) has no usable text color`).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });
});

describe('validateBrand — the ourAirwaves seam', () => {
  const ok: RoleMap = {
    ...({} as RoleMap),
    '--ground': '#101014',
    '--surface': '#1A1A20',
    '--surface-raised': '#24242C',
    '--border': '#33333D',
    '--text': '#F2F2F5',
    '--text-muted': '#9A9AA5',
    '--action': '#7FB2FF',
    '--action-hover': '#A5C9FF',
    '--on-action': '#101014',
    '--focus-ring': '#7FB2FF',
  } as RoleMap;

  it('accepts a client theme that clears AA in both modes', () => {
    const light: RoleMap = {
      ...ok,
      '--ground': '#FFFFFF',
      '--surface': '#F5F5F7',
      '--surface-raised': '#E8E8EC',
      '--border': '#D5D5DC',
      '--text': '#16161A',
      '--text-muted': '#5A5A66',
      '--action': '#1A46B0',
      '--action-hover': '#12379A',
      '--on-action': '#FFFFFF',
      '--focus-ring': '#1A46B0',
    };
    expect(validateBrand({ dark: ok, light })).toEqual([]);
  });

  it('rejects a theme that supplies only one mode', () => {
    const v = validateBrand({ dark: ok });
    expect(v.some((x) => x.mode === 'light' && x.role === '*')).toBe(true);
  });

  it('rejects an attempt to repaint a UEC color', () => {
    const bad = { ...ok, '--uec-enter': '#FF0000' } as unknown as RoleMap;
    const v = validateBrand({ dark: bad, light: bad });
    expect(v.some((x) => x.reason.includes('not client-overridable'))).toBe(true);
  });

  it('rejects an attempt to repaint the destructive color', () => {
    const bad = { ...ok, '--status-danger': '#00FF00' } as unknown as RoleMap;
    const v = validateBrand({ dark: bad, light: bad });
    expect(v.some((x) => x.role === '--status-danger')).toBe(true);
  });

  it('rejects a palette that fails contrast, and reports the measured ratio', () => {
    const bad: RoleMap = { ...ok, '--text': '#2A2A30' }; // near-black on near-black
    const v = validateBrand({ dark: bad, light: bad });
    const hit = v.find((x) => x.role === '--text' && x.reason.includes(':1'));
    expect(hit).toBeDefined();
  });
});
