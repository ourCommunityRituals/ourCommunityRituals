import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { componentStyles } from '../src/styles';
import { structural } from '../src/tokens';

/**
 * Text floor — nothing the fleet renders is smaller than 13px.
 *
 * Decided 2026-09-29 together with AA-everywhere (see design-system/guidelines/
 * 10-older-adults-first.md). Before this, the shared stylesheet shipped 10.4px nav
 * labels, 11.2px badges and 12.8px section titles — sizes the guideline itself calls
 * unreadable for the 50–75 reader. Every sub-13px size now points at one token,
 * --text-min, so the floor is a single value.
 *
 * The check reads the declared value, not a rendered size: a literal below the floor
 * fails, and `var(--text-min)` passes because the token itself is asserted here.
 */

const FLOOR_PX = 13;
const ROOT_PX = 16;

/** Every `font-size:` value in a CSS string. */
function fontSizes(css: string): string[] {
  const out: string[] = [];
  const re = /font-size:\s*([^;}"]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) out.push((m[1] ?? '').trim());
  return out;
}

/**
 * Pixel size for a literal, or null when the value is not a plain length (a var(),
 * calc() or keyword — those are checked through the token or left to the browser).
 * `em` is relative to the parent; below .8125em it can only land under 13px on a
 * 16px parent, so it is held to the same number.
 */
function toPx(value: string): number | null {
  const m = /^(\d*\.?\d+)(px|rem|em)$/.exec(value);
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] === 'px' ? n : n * ROOT_PX;
}

function belowFloor(css: string): string[] {
  return fontSizes(css).filter((v) => {
    const px = toPx(v);
    return px !== null && px < FLOOR_PX;
  });
}

describe('text floor (13px)', () => {
  it('--text-min is exactly 13px at the default root', () => {
    expect(structural['--text-min']).toBe('.8125rem');
    expect(toPx(structural['--text-min'])).toBe(FLOOR_PX);
  });

  it('the shared stylesheet declares no text below 13px', () => {
    expect(belowFloor(componentStyles)).toEqual([]);
  });

  it('small text in the stylesheet goes through --text-min, not a literal', () => {
    // At least the labels that used to be 10.4–12.8px now resolve through the token.
    expect(fontSizes(componentStyles).filter((v) => v === 'var(--text-min)').length).toBeGreaterThan(0);
  });

  it('the HTML partials declare no text below 13px', () => {
    const partials = readFileSync(join(__dirname, '../src/partials.ts'), 'utf8');
    expect(belowFloor(partials)).toEqual([]);
  });

  it('the design-system bundle declares no text below 13px', () => {
    const bundle = readFileSync(join(__dirname, '../design-system/components/bundle.css'), 'utf8');
    expect(belowFloor(bundle)).toEqual([]);
  });

  it('the check itself catches a sub-floor literal (anti-theatre)', () => {
    expect(belowFloor('.x{font-size:.65rem}.y{font-size:12px}.z{font-size:.8125rem}')).toEqual(['.65rem', '12px']);
  });
});
