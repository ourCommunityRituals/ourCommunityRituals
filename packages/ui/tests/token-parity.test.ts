import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { primitives, semanticDark, semanticLight } from '../src/tokens';
import { contrastRatio } from '../src/contrast';

/**
 * One token source — src/tokens.ts.
 *
 * The design-system bundle (design-system/tokens.json → tokens.css) was a second,
 * hand-maintained palette with no link back to the tokens the workers serve. By
 * 2026-09-29 the two disagreed on 17 semantic values — the page ground, the accent,
 * muted text, every error/danger role — and the bundle had --success set to the
 * same teal as --live, which src/tokens.ts deliberately keeps apart (OSE-1328).
 *
 * compile-tokens --check already guards tokens.json → tokens.css. This suite guards
 * the step before it: tokens.json must say what src/tokens.ts says, for every role
 * and primitive the two share. Bundle-only roles are allowed (the bundle is a richer
 * vocabulary), but they are held to the fleet's floor — AA, decided 2026-09-29 —
 * on the shared grounds.
 */

type Mode = 'dark' | 'light';
interface BundleToken { name: string; value: Record<Mode, string> }

const bundle = JSON.parse(
  readFileSync(join(__dirname, '../design-system/tokens.json'), 'utf8'),
) as { color: { tokens: BundleToken[] } };
const B = new Map(bundle.color.tokens.map((t) => [t.name, t.value]));
const P = primitives as Record<string, string>;

/** Resolve a bundle value (hex or `{alias}`) to lowercase hex. */
function bundleHex(name: string, mode: Mode, depth = 0): string {
  const v = B.get(name)?.[mode];
  if (v === undefined) throw new Error(`bundle has no ${name}`);
  const alias = /^\{(.+)\}$/.exec(v)?.[1];
  if (alias) {
    if (depth > 8) throw new Error(`alias loop at ${name}`);
    return bundleHex(alias, mode, depth + 1);
  }
  return v.toLowerCase();
}

/** Resolve a tokens.ts semantic value (`var(--ocr-…)` or hex) to lowercase hex. */
function tsHex(value: string): string {
  const key = /^var\((--[\w-]+)\)$/.exec(value.trim())?.[1];
  return (key ? P[key] ?? value : value).toLowerCase();
}

const MODES: [Mode, Record<string, string>][] = [
  ['dark', semanticDark],
  ['light', semanticLight],
];

describe('token parity: design-system/tokens.json follows src/tokens.ts', () => {
  for (const [mode, sem] of MODES) {
    it(`every semantic role matches in ${mode}`, () => {
      const drift: string[] = [];
      for (const [role, value] of Object.entries(sem)) {
        const name = role.slice(2);
        if (!B.has(name)) { drift.push(`${role}: missing from the bundle`); continue; }
        const want = tsHex(value);
        const got = bundleHex(name, mode);
        if (got !== want) drift.push(`${role}: bundle ${got}, tokens.ts ${want}`);
      }
      expect(drift).toEqual([]);
    });
  }

  it('every shared primitive has the same value', () => {
    const drift: string[] = [];
    for (const [key, value] of Object.entries(P)) {
      const name = key.slice(2);
      if (!B.has(name)) { drift.push(`${key}: missing from the bundle`); continue; }
      for (const mode of ['dark', 'light'] as Mode[]) {
        if (bundleHex(name, mode) !== value.toLowerCase()) drift.push(`${key} (${mode}): ${bundleHex(name, mode)} vs ${value}`);
      }
    }
    expect(drift).toEqual([]);
  });

  it('success is never the live teal', () => {
    for (const mode of ['dark', 'light'] as Mode[]) {
      expect(bundleHex('success', mode)).not.toBe(bundleHex('live', mode));
    }
  });
});

describe('bundle-only roles meet the fleet floor (AA) on the shared grounds', () => {
  const GROUNDS = ['bg', 'surface', 'card', 'surface-hover'];
  const INK = ['accent-text', 'live-text', 'warn-text'];
  const EDGES = ['focus-ring', 'map-cell-line'];

  for (const mode of ['dark', 'light'] as Mode[]) {
    it(`text roles clear 4.5:1 in ${mode}`, () => {
      const fails: string[] = [];
      for (const fg of INK) for (const bg of GROUNDS) {
        const r = contrastRatio(bundleHex(fg, mode), bundleHex(bg, mode));
        if (r < 4.5) fails.push(`${fg} on ${bg}: ${r.toFixed(2)}`);
      }
      expect(fails).toEqual([]);
    });

    it(`focus ring and map lines clear 3:1 in ${mode}`, () => {
      const fails: string[] = [];
      for (const fg of EDGES) for (const bg of ['bg', 'surface']) {
        const r = contrastRatio(bundleHex(fg, mode), bundleHex(bg, mode));
        if (r < 3) fails.push(`${fg} on ${bg}: ${r.toFixed(2)}`);
      }
      expect(fails).toEqual([]);
    });
  }
});
