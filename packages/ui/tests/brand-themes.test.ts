/**
 * Registered brand themes ([data-brand="x"], Tier 3) — the gate every brand in
 * brandThemes must pass before it ships in the shared stylesheet.
 *
 *   1. Only customizable roles: validateBrandOverride() is empty for BOTH modes
 *      (a brand can never recolour --live/--danger/--warn/--info/--success/--error,
 *      and never a --uec-* category colour).
 *   2. Both modes present with the same keys (a one-mode override is AA in one
 *      theme and broken in the other).
 *   3. Contrast on the brand's OWN grounds, both modes: every text role 4.5:1,
 *      --on-accent 4.5:1 on its fills, --border-strong 3:1. Locked roles are
 *      inherited from the base, so they are checked against the brand grounds too.
 *   4. The block is emitted into ocrStylesheet, including the forced-dark path.
 */
import { describe, it, expect } from 'vitest';
import { brandThemes, brandBlock } from '../src/tokens';
import {
  validateBrandOverride,
  resolveBrandPalette,
  checkBrandContrast,
  brandContrastPairs,
  BRAND_LOCKED,
} from '../src/brand';
import { contrastRatio } from '../src/contrast';
import { ocrStylesheet } from '../src/css';

const names = Object.keys(brandThemes);

describe('every registered brand theme', () => {
  it('there is more than the example: ow (ourWKRP) is registered', () => {
    expect(names).toContain('acme');
    expect(names).toContain('ow');
  });

  it.each(names)('%s: only customizable tokens, in both modes', (name) => {
    const theme = brandThemes[name]!;
    expect(validateBrandOverride(theme.dark), `${name} dark`).toEqual([]);
    expect(validateBrandOverride(theme.light), `${name} light`).toEqual([]);
  });

  it.each(names)('%s: dark and light override the same roles', (name) => {
    const theme = brandThemes[name]!;
    expect(Object.keys(theme.light).sort()).toEqual(Object.keys(theme.dark).sort());
  });

  it.each(names)('%s: clears every contrast floor in both modes', (name) => {
    const failures = checkBrandContrast(name).map(
      (f) => `${f.mode}: ${f.fg} on ${f.bg} = ${f.ratio.toFixed(2)}:1 (min ${f.min})`
    );
    expect(failures).toEqual([]);
  });

  it.each(names)('%s: emitted into the shared stylesheet, incl. forced dark + forced light', (name) => {
    expect(ocrStylesheet).toContain(`[data-brand="${name}"] {`);
    expect(ocrStylesheet).toContain(`[data-theme="light"][data-brand="${name}"] {`);
    expect(ocrStylesheet).toContain(`[data-theme="dark"][data-brand="${name}"] {`);
  });
});

describe('ow (ourWKRP) — amber on black', () => {
  const dark = resolveBrandPalette('ow', 'dark');
  const light = resolveBrandPalette('ow', 'light');

  it('is amber on carbon in dark, burnt amber on warm paper in light', () => {
    expect(dark['--bg']).toBe('#0A0A0A');
    expect(dark['--accent']).toBe('#D4954B');
    expect(light['--accent']).not.toBe('#D4954B');
    // Why the light accent differs: ember is not readable on a light ground.
    expect(contrastRatio('#D4954B', light['--bg']!)).toBeLessThan(3);
  });

  it('never touches a locked role: --live is the fleet teal, --danger the fleet red', () => {
    for (const token of BRAND_LOCKED) {
      expect(token in brandThemes.ow!.dark, `dark sets locked ${token}`).toBe(false);
      expect(token in brandThemes.ow!.light, `light sets locked ${token}`).toBe(false);
    }
    expect(dark['--live']).toBe('#00C4B4');
    expect(light['--live']).toBe('#00796B');
  });

  // Spelled out (not only via checkBrandContrast) so a failing ratio names itself.
  for (const [mode, pal] of [['dark', dark], ['light', light]] as const) {
    for (const pair of brandContrastPairs()) {
      it(`${mode}: ${pair.fg} on ${pair.bg} >= ${pair.min}:1`, () => {
        const ratio = contrastRatio(pal[pair.fg]!, pal[pair.bg]!);
        expect(ratio, `${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(pair.min);
      });
    }
  }

  it('--on-accent flips per theme: carbon ink on ember, white on burnt amber', () => {
    expect(dark['--on-accent']).toBe('#0A0A0A');
    expect(light['--on-accent']).toBe('#FFFFFF');
  });

  it('brandBlock("ow") carries both modes', () => {
    const css = brandBlock('ow');
    expect(css).toContain('--accent: #D4954B');
    expect(css).toContain('--accent: #93540F');
    expect(css).toContain('@media (prefers-color-scheme: light)');
  });
});

describe('forced dark beats the OS light preference for a branded page', () => {
  it('[data-theme="dark"][data-brand] comes after the @media light brand block', () => {
    const css = brandBlock('ow');
    expect(css.indexOf('[data-theme="dark"][data-brand="ow"]')).toBeGreaterThan(
      css.indexOf('@media (prefers-color-scheme: light)')
    );
  });
});
