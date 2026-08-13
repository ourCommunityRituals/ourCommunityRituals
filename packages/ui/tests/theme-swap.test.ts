/**
 * OSE-654 — Palette-agnostic token foundation: role vocabulary + client theme swap.
 *
 * Asserts (1) the semantic ROLE vocabulary the OSE-653 surfaces consume exists in
 * both dark and light maps; (2) the new colored roles clear WCAG contrast in both
 * modes; (3) a client theme swaps colour WITHOUT changing structure — the same
 * role token resolves to a different value under [data-brand="acme"], and only
 * colour differs; (4) UEC category colours are never themeable.
 *
 * Companion to tests/tokens.test.ts (base palette) — this file covers the
 * OSE-654 additions only.
 */

import { describe, it, expect } from 'vitest';
import {
  primitives,
  semanticDark,
  semanticLight,
  brandThemes,
  brandBlock,
  brandBlocks,
} from '../src/tokens';
import { contrastRatio } from '../src/contrast';
import { ocrStylesheet } from '../src/css';

const P = primitives as Record<string, string>;
const BG_DARK = P['--ocr-navy-950'] as string; // #0F1824
const BG_LIGHT = P['--ocr-light-050'] as string; // #F4F7FC

/** Resolve a semantic value (`var(--ocr-x)` or a raw `#hex`) to its hex. */
function resolve(value: string): string {
  const m = value.match(/var\((--[\w-]+)\)/);
  return m ? (P[m[1]!] as string) : value;
}

const NEW_ROLES = ['--card', '--text-primary', '--text-secondary', '--success', '--warn', '--info'];

describe('OSE-654 | role vocabulary present in both modes', () => {
  it.each(NEW_ROLES)('dark map declares %s', (role) => {
    expect(role in semanticDark, `dark missing ${role}`).toBe(true);
  });
  it.each(NEW_ROLES)('light map declares %s', (role) => {
    expect(role in semanticLight, `light missing ${role}`).toBe(true);
  });

  it('every semantic role resolves to a real primitive (no dangling var)', () => {
    for (const map of [semanticDark, semanticLight]) {
      for (const [role, val] of Object.entries(map)) {
        expect(resolve(val), `${role} → ${val} did not resolve`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });
});

describe('OSE-654 | new colored roles clear WCAG contrast', () => {
  // Status text (success/warn) → AA normal text (4.5:1). UI/interactive roles
  // (info) → AA for UI components / large text (3:1 per WCAG 1.4.11 / 1.4.3).
  const cases: Array<[string, string, number]> = [
    ['--success', 'dark', 4.5],
    ['--success', 'light', 4.5],
    ['--warn', 'dark', 4.5],
    ['--warn', 'light', 4.5],
    ['--info', 'dark', 3],
    ['--info', 'light', 4.5],
  ];
  it.each(cases)('%s (%s) meets its contrast floor', (role, mode, min) => {
    const map = mode === 'dark' ? semanticDark : semanticLight;
    const bg = mode === 'dark' ? BG_DARK : BG_LIGHT;
    const ratio = contrastRatio(resolve((map as Record<string, string>)[role]!), bg);
    expect(ratio, `${role} ${mode} = ${ratio.toFixed(2)}:1 (min ${min})`).toBeGreaterThanOrEqual(min);
  });
});

describe('OSE-654 | client theme swap — colour changes, structure does not', () => {
  const acme = brandThemes.acme!;

  it('the example "acme" theme is registered', () => {
    expect(brandThemes.acme).toBeDefined();
    expect(acme.dark['--accent']).toBeDefined();
    expect(acme.light['--accent']).toBeDefined();
  });

  it('acme re-maps --accent to a DIFFERENT value than the OCR base (the swap)', () => {
    expect(acme.dark['--accent']).not.toBe(resolve(semanticDark['--accent']));
    expect(acme.light['--accent']).not.toBe(resolve(semanticLight['--accent']));
  });

  it('acme accent clears AA (≥3:1 UI component) in BOTH modes — why per-mode values exist', () => {
    expect(contrastRatio(acme.dark['--accent']!, BG_DARK)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(acme.light['--accent']!, BG_LIGHT)).toBeGreaterThanOrEqual(3);
  });

  it('brandBlock("acme") emits a [data-brand] block plus a light-mode override', () => {
    const css = brandBlock('acme');
    expect(css).toContain('[data-brand="acme"]');
    expect(css).toContain('--accent: #A78BFA'); // dark default
    expect(css).toContain('@media (prefers-color-scheme: light)');
    expect(css).toContain('--accent: #6D28D9'); // light override
  });

  it('unknown brand → empty string (fail-soft, inherits OCR base)', () => {
    expect(brandBlock('does-not-exist')).toBe('');
  });

  it('the shipped stylesheet includes the registered brand themes', () => {
    expect(ocrStylesheet).toContain('[data-brand="acme"]');
    expect(brandBlocks()).toContain('[data-brand="acme"]');
  });
});

describe('--on-accent clears AA on --accent (button/CTA labels, both modes)', () => {
  it.each([
    ['dark', semanticDark] as const,
    ['light', semanticLight] as const,
  ])('--on-accent vs --accent (%s) >= 3:1 (large/button text)', (_mode, map) => {
    const onAccent = resolve((map as Record<string, string>)['--on-accent']!);
    const accent = resolve((map as Record<string, string>)['--accent']!);
    expect(onAccent, '--on-accent must be defined').toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(contrastRatio(onAccent, accent)).toBeGreaterThanOrEqual(3);
  });
});

describe('OSE-654 | UEC category colours are NOT themeable (hue = meaning)', () => {
  it('no brand theme overrides a --uec-* token', () => {
    for (const [name, theme] of Object.entries(brandThemes)) {
      for (const key of [...Object.keys(theme.dark), ...Object.keys(theme.light)]) {
        expect(key.startsWith('--uec-'), `${name} must not theme ${key}`).toBe(false);
      }
    }
  });
});
