/**
 * The two axes must stay orthogonal, and the tier chain must never break.
 * These are the invariants that keep five surfaces one design system.
 */
import { describe, it, expect } from 'vitest';
import { primitives } from '../src/primitive.js';
import { brands, SEMANTIC_ROLES, BRAND_OVERRIDABLE } from '../src/semantic.js';
import { components } from '../src/component.js';
import { surfaces } from '../src/surface.js';
import { uec } from '../src/uec.js';
import { tokensCss, tokensJson } from '../src/emit.js';

const refs = (v: string) => [...v.matchAll(/var\((--[a-z0-9-]+)\)/gi)].map((m) => m[1]!);

describe('tier chain', () => {
  it('every semantic role resolves to a real primitive', () => {
    for (const theme of Object.values(brands)) {
      for (const map of [theme.dark, theme.light]) {
        for (const [role, value] of Object.entries(map)) {
          for (const ref of refs(value)) {
            expect(ref in primitives, `${role} → ${ref} is not a primitive`).toBe(true);
          }
        }
      }
    }
  });

  it('every component token resolves to a semantic role or a primitive', () => {
    const known = new Set<string>([...SEMANTIC_ROLES, ...Object.keys(primitives)]);
    for (const [name, value] of Object.entries(components)) {
      for (const ref of refs(value)) {
        expect(known.has(ref), `${name} → ${ref} resolves to nothing`).toBe(true);
      }
    }
  });

  it('no component token reaches past Tier 2 to a raw color primitive', () => {
    // Structural primitives (space/size/radius) are fine to reach directly;
    // COLOR must go through a semantic role, or brands cannot repaint it.
    const colorish = /^--ocr-(navy|carbon|paper|ink|signal|ember|teal|warn|red|broadcast)-/;
    const exempt = new Set(['--button-danger-fg', '--poster-ink', '--poster-stock']);
    for (const [name, value] of Object.entries(components)) {
      if (exempt.has(name)) continue;
      for (const ref of refs(value)) {
        expect(colorish.test(ref), `${name} reaches Tier 1 color ${ref}`).toBe(false);
      }
    }
  });

  it('every brand supplies every role, in both modes', () => {
    for (const [name, theme] of Object.entries(brands)) {
      for (const mode of ['dark', 'light'] as const) {
        for (const role of SEMANTIC_ROLES) {
          expect(theme[mode][role], `${name}.${mode} is missing ${role}`).toBeTruthy();
        }
      }
    }
  });
});

describe('axis separation', () => {
  it('surfaces change scale only — no surface declares a color', () => {
    for (const [name, s] of Object.entries(surfaces)) {
      expect(Object.keys(s), `surface ${name} carries paint`).toEqual(
        expect.arrayContaining(['type', 'space', 'target', 'rationale'])
      );
      expect(typeof s.type).toBe('number');
      expect(typeof s.space).toBe('number');
    }
  });

  it('brands change paint only — no brand declares a size or space', () => {
    for (const theme of Object.values(brands)) {
      for (const map of [theme.dark, theme.light]) {
        for (const ref of Object.values(map).flatMap(refs)) {
          expect(/^--ocr-(size|space|radius|target|layer|duration|bp)-/.test(ref)).toBe(false);
        }
      }
    }
  });

  it('UEC is locked — not repaintable and not in the overridable set', () => {
    for (const key of Object.keys(uec)) {
      expect(BRAND_OVERRIDABLE).not.toContain(key);
    }
  });
});

describe('scales', () => {
  const nums = (prefix: string) =>
    Object.entries(primitives)
      .filter(([k]) => k.startsWith(prefix))
      .map(([, v]) => parseFloat(v));

  it('the type scale increases monotonically', () => {
    const s = nums('--ocr-size-');
    expect(s).toEqual([...s].sort((a, b) => a - b));
    expect(new Set(s).size).toBe(s.length);
  });

  it('the space scale increases monotonically', () => {
    const s = nums('--ocr-space-');
    expect(s).toEqual([...s].sort((a, b) => a - b));
    expect(new Set(s).size).toBe(s.length);
  });

  it('every touch target meets the 44px WCAG floor', () => {
    for (const k of ['--ocr-target-min', '--ocr-target-default', '--ocr-target-public'] as const) {
      expect(parseFloat(primitives[k])).toBeGreaterThanOrEqual(44);
    }
  });
});

describe('emitted output', () => {
  const css = tokensCss();

  it('emits both axes as attribute selectors, not forks', () => {
    expect(css).toContain('[data-brand="ow"]');
    expect(css).toContain('[data-surface="tv"]');
  });

  it('scales the TV surface with calc(), never by enumerating sizes', () => {
    expect(css).toMatch(/\[data-surface="tv"\][\s\S]*?--ocr-size-2: calc\(/);
  });

  it('honors an explicit theme override in both directions', () => {
    expect(css).toContain('[data-theme="light"]');
    expect(css).toContain(':not([data-theme="dark"])');
  });

  it('produces valid, parseable JSON with every tier present', () => {
    const j = JSON.parse(tokensJson());
    expect(j.primitive).toBeTruthy();
    expect(j.semantic.brands.ose).toBeTruthy();
    expect(j.component).toBeTruthy();
    expect(j.surface.scales.tv).toBeTruthy();
    expect(j.uec).toBeTruthy();
  });

  it('has balanced braces', () => {
    expect((css.match(/{/g) ?? []).length).toBe((css.match(/}/g) ?? []).length);
  });
});
