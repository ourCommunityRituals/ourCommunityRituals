import { describe, it, expect } from 'vitest';
import { primitives, semanticDark, semanticLight } from '../src/tokens';
import { contrastRatio } from '../src/contrast';

/**
 * The grounds matrix.
 *
 * tokens.test.ts measured foregrounds against `--bg` and, in one case, `--surface`.
 * Almost all text in this product sits on a card, so the roles that actually failed
 * were the ones never measured: --accent 4.11:1 on --surface, --danger 3.90:1,
 * --text-muted 4.04:1 once hovered. Every one of those was under AA while the suite
 * was green.
 *
 * This is table-driven on purpose: adding a role or a ground is a row, not a new test,
 * so the matrix cannot fall behind the palette the way a hand-enumerated list did.
 *
 * THRESHOLDS, and why they differ per ground:
 *   --bg, --surface       AAA 7:1. Contrast sensitivity roughly halves by 60 and is a
 *                         third of a young reader's by 75; this product is used outdoors
 *                         on cheap phones. AA's 4.5 is a twenty-year-old's floor.
 *   --surface-hover       AA 4.5:1. It is a PRESSED/SELECTED ground, never a text ground
 *                         for AAA copy — the design system forbids putting AAA-critical
 *                         text on it, and hover is drawn as a --border-strong outline
 *                         rather than a fill lift precisely so this stays true.
 *
 * FILL roles (--accent, --live, --danger, --warn) are deliberately absent: they are
 * grounds, not text, and 3:1 is their bar. --accent-text and friends exist so the brand
 * blue can stay the brand blue while type still clears AAA.
 */

type Theme = Record<string, string>;

/** Resolve a semantic token one alias deep into a primitive hex. */
const resolve = (map: Theme, name: string): string => {
  const v = map[name];
  if (!v) throw new Error(`missing token ${name}`);
  const alias = /^var\((--[A-Za-z0-9-]+)\)$/.exec(v.trim());
  const key = alias?.[1];
  return key ? (primitives as Record<string, string>)[key] ?? v : v;
};

const INK_ROLES = [
  '--text',
  '--text-muted',
  '--accent-text',
  '--live-text',
  '--warn-text',
  '--error',
  '--focus-ring',
] as const;

const GROUNDS = [
  { token: '--bg', min: 7.0, label: 'AAA' },
  { token: '--surface', min: 7.0, label: 'AAA' },
  { token: '--surface-hover', min: 4.5, label: 'AA' },
] as const;

const THEMES = [
  { name: 'dark', map: semanticDark as Theme },
  { name: 'light', map: semanticLight as Theme },
] as const;

describe('contrast matrix — every INK role on every ground it can land on', () => {
  for (const { name, map } of THEMES) {
    for (const ground of GROUNDS) {
      for (const role of INK_ROLES) {
        it(`${name}: ${role} on ${ground.token} >= ${ground.min}:1 (${ground.label})`, () => {
          const fg = resolve(map, role);
          const bg = resolve(map, ground.token);
          const ratio = contrastRatio(fg, bg);
          expect(
            ratio,
            `${name}: ${role} ${fg} on ${ground.token} ${bg} is ${ratio.toFixed(2)}:1, ` +
              `needs ${ground.min}:1`,
          ).toBeGreaterThanOrEqual(ground.min);
        });
      }
    }
  }
});

describe('LINE roles clear WCAG 1.4.11 (3:1) — they identify controls', () => {
  for (const { name, map } of THEMES) {
    for (const ground of ['--bg', '--surface'] as const) {
      it(`${name}: --border-strong on ${ground} >= 3:1`, () => {
        const ratio = contrastRatio(resolve(map, '--border-strong'), resolve(map, ground));
        expect(ratio, `${name}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3.0);
      });
    }
  }
});

describe('fills and inks stay separate roles', () => {
  it('--accent and --accent-text are different values in both themes', () => {
    for (const { name, map } of THEMES) {
      expect(
        resolve(map, '--accent'),
        `${name}: --accent is a FILL and --accent-text is INK. One token cannot be both — ` +
          `a fill needs 3:1 against its surroundings, text needs 7:1 on the same grounds.`,
      ).not.toBe(resolve(map, '--accent-text'));
    }
  });

  it('--on-accent clears AA-large on both the accent and danger fills', () => {
    for (const { name, map } of THEMES) {
      for (const fill of ['--accent', '--danger'] as const) {
        const ratio = contrastRatio(resolve(map, '--on-accent'), resolve(map, fill));
        expect(ratio, `${name}: --on-accent on ${fill} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
