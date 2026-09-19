import { describe, it, expect } from 'vitest';
import { componentStyles } from '../src/styles';
import { semanticDark, semanticLight, primitives } from '../src/tokens';
import { contrastRatio } from '../src/contrast';

/**
 * The gap this suite closes.
 *
 * tokens.test.ts asserts on the TOKEN OBJECTS. Nothing asserted on the STYLESHEET,
 * so a correct tokens.ts with a hardcoded colour in styles.ts passed every gate.
 * `.btn-primary{...color:#000}` shipped that way: 3.33:1 against the light theme's
 * accent, a live WCAG AA failure that no test could see.
 *
 * A literal colour in a token-driven stylesheet cannot respond to a theme, so it is
 * wrong in at least one of them by construction. These tests fail on the literal,
 * not on the ratio, because the ratio is only the symptom.
 */

/** Rules allowed to carry a literal colour, each for a stated physical reason. */
const LITERAL_ALLOWLIST: Record<string, string> = {
  '.qr-frame':
    'A QR quiet zone must be real white in BOTH themes — a themed QR frame is an ' +
    'unscannable QR. Physical requirement, not a styling choice.',
};

/** Split the sheet into `selector{body}` pairs. */
function rules(css: string): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    out.push({ selector: (m[1] ?? '').trim().replace(/\s+/g, ' '), body: m[2] ?? '' });
  }
  return out;
}

const HEX = /(?:color|background|background-color|border-color|fill|stroke)\s*:\s*(#[0-9a-fA-F]{3,8})/g;

describe('stylesheet uses tokens, not literal colours', () => {
  it('no rule hardcodes a colour except the documented allowlist', () => {
    const offenders: string[] = [];
    for (const { selector, body } of rules(componentStyles)) {
      if (Object.keys(LITERAL_ALLOWLIST).some((a) => selector.includes(a))) continue;
      for (const hit of body.matchAll(HEX)) {
        offenders.push(`${selector} -> ${hit[0]}`);
      }
    }
    expect(offenders, `Literal colours cannot respond to a theme. Use a token, or add the
selector to LITERAL_ALLOWLIST with the physical reason it must be literal.
Offenders:\n  ${offenders.join('\n  ')}\n`).toEqual([]);
  });

  it('.btn-primary reads --on-accent rather than a literal', () => {
    const rule = rules(componentStyles).find((r) => r.selector === '.btn-primary');
    expect(rule, '.btn-primary must exist in componentStyles').toBeDefined();
    expect(rule!.body).toContain('var(--on-accent)');
    expect(rule!.body).not.toMatch(/color\s*:\s*#/);
  });
});

describe('--on-accent clears AA on the accent fill in BOTH themes', () => {
  /** Resolve a semantic token one alias deep into a primitive hex. */
  const resolve = (map: Record<string, string>, name: string): string => {
    const v = map[name];
    if (!v) throw new Error(`missing token ${name}`);
    const alias = /^var\((--[A-Za-z0-9-]+)\)$/.exec(v.trim());
    const key = alias?.[1];
    return key ? (primitives as Record<string, string>)[key] ?? v : v;
  };

  // The primary button label is large text (18px/700 in the design system),
  // so the AA threshold that applies is 3:1 and the AAA threshold is 4.5:1.
  for (const [theme, map] of [
    ['dark', semanticDark],
    ['light', semanticLight],
  ] as const) {
    it(`${theme}: --on-accent on --accent >= 4.5:1 (AAA for large text)`, () => {
      const onAccent = resolve(map as Record<string, string>, '--on-accent');
      const accent = resolve(map as Record<string, string>, '--accent');
      const ratio = contrastRatio(onAccent, accent);
      expect(
        ratio,
        `${theme}: --on-accent ${onAccent} on --accent ${accent} is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    });
  }
});
