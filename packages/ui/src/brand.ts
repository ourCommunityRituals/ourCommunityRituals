/**
 * @ocr/ui — White-label token designation (OSE-1328 / white-label ADR)
 *
 * A brand may override only DESIGNATED-CUSTOMIZABLE semantic tokens, via a Tier-3
 * `[data-brand="x"]` block fed by the OSM pipeline (intake → processor → batch
 * OSM API, OCR-employees-only via Bruno). LOCKED tokens — the colorblind-safe +
 * status semantics — can NEVER be brand-overridden, so a white-label instance
 * can't quietly break the accessibility/meaning guarantees.
 *
 * Every semantic token must be in exactly one set (completeness is gated by
 * tests/brand.test.ts against semanticDark) — a new token can't go un-designated.
 */

import { primitives, semanticDark, semanticLight, brandThemes } from './tokens';
import { contrastRatio } from './contrast';

/** Brand may re-map these (their own palette + surfaces). */
export const BRAND_CUSTOMIZABLE = [
  '--accent',
  '--accent-hover',
  // A followed link: part of the accent family, so it travels with the palette.
  '--accent-visited',
  '--bg',
  '--surface',
  '--surface-hover',
  '--border',
  '--border-strong',
  '--text',
  '--text-muted',
  // Foreground on the (customizable) --accent surface — a brand whose accent is
  // light must set its own readable on-accent, so it travels with the palette.
  '--on-accent',
  // OSE-654 role aliases: they re-name customizable roles, so they travel with the palette.
  '--card',
  '--text-primary',
  '--text-secondary',
] as const;

/** Never brand-overridden — colorblind-safe + status semantics stay fixed. */
export const BRAND_LOCKED = [
  '--danger',
  '--danger-hover',
  '--error',
  '--live',
  '--live-hover',
  '--warn',
  '--info',
  // Success is a status/colorblind-safe semantic like --live/--warn — a brand
  // can't recolor "done/accepted" and break the accessibility/meaning guarantee.
  '--success',
] as const;

export type CustomizableToken = (typeof BRAND_CUSTOMIZABLE)[number];

/** Every semantic token, classified customizable | locked. */
export const DESIGNATION: Record<string, 'customizable' | 'locked'> = {
  ...Object.fromEntries(BRAND_CUSTOMIZABLE.map((t) => [t, 'customizable' as const])),
  ...Object.fromEntries(BRAND_LOCKED.map((t) => [t, 'locked' as const])),
};

export interface BrandOverrideViolation {
  token: string;
  reason: 'locked' | 'unknown';
}

/**
 * Validate a brand override set (the token→value pairs an OSM `[data-brand]`
 * block would set). Returns a violation for any token that is LOCKED or unknown —
 * only designated-customizable tokens may be branded. An empty array = the set
 * is safe to emit. The OSM processor MUST run this before producing a brand block.
 */
export function validateBrandOverride(overrides: Record<string, string>): BrandOverrideViolation[] {
  const violations: BrandOverrideViolation[] = [];
  for (const token of Object.keys(overrides)) {
    const designation = DESIGNATION[token];
    if (designation === undefined) violations.push({ token, reason: 'unknown' });
    else if (designation === 'locked') violations.push({ token, reason: 'locked' });
  }
  return violations;
}

// ── Brand palette resolution + the contrast floors every brand must clear ─────


export type ThemeMode = 'dark' | 'light';

/**
 * The effective semantic palette a page painted with `[data-brand=name]` sees in
 * one mode: the OCR base for that mode with the brand's overrides on top, every
 * value resolved to a hex. Locked roles come through from the base untouched —
 * which is exactly why they must be checked against the BRAND's grounds.
 */
export function resolveBrandPalette(name: string, mode: ThemeMode): Record<string, string> {
  const base = mode === 'dark' ? semanticDark : semanticLight;
  const theme = brandThemes[name];
  const merged: Record<string, string> = { ...base, ...(theme ? theme[mode] : {}) };
  const P = primitives as Record<string, string>;
  const out: Record<string, string> = {};
  for (const [token, value] of Object.entries(merged)) {
    const key = /^var\((--[\w-]+)\)$/.exec(value.trim())?.[1];
    out[token] = key ? (P[key] ?? value) : value;
  }
  return out;
}

export interface ContrastPair {
  fg: string;
  bg: string;
  min: number;
  kind: 'text' | 'non-text';
}

/** Grounds text may sit on. */
export const GROUND_ROLES = ['--bg', '--surface', '--card', '--surface-hover'] as const;
/** Roles used as text colour — each must clear 4.5:1 on every ground. */
export const TEXT_ROLES = [
  '--text', '--text-primary', '--text-muted', '--text-secondary', '--accent', '--accent-visited',
  '--live', '--danger', '--error', '--warn', '--info', '--success',
] as const;

/**
 * The contrast floors a brand palette must clear in each mode (WCAG 2.x AA):
 * every text role 4.5:1 on every ground; --on-accent 4.5:1 on the solid fills it
 * labels (--accent, --accent-hover, --danger, --success); control edges (--border-strong)
 * and the focus ring (--accent) 3:1 on every ground.
 */
export function brandContrastPairs(): ContrastPair[] {
  const pairs: ContrastPair[] = [];
  for (const bg of GROUND_ROLES) {
    for (const fg of TEXT_ROLES) pairs.push({ fg, bg, min: 4.5, kind: 'text' });
    pairs.push({ fg: '--border-strong', bg, min: 3, kind: 'non-text' });
  }
  // --success joins the fills --on-accent labels: the toast (OSE-1564) puts text on
  // the solid success fill exactly as it does on the solid danger fill.
  for (const bg of ['--accent', '--accent-hover', '--danger', '--success']) {
    pairs.push({ fg: '--on-accent', bg, min: 4.5, kind: 'text' });
  }
  return pairs;
}

export interface ContrastFailure extends ContrastPair {
  mode: ThemeMode;
  ratio: number;
}

/**
 * Every contrast floor a registered brand misses, in either mode. Empty = ships.
 *
 * A pair is the brand's responsibility when the brand sets EITHER side of it: a
 * brand that re-grounds the page (ow) answers for every role on those grounds,
 * locked status roles included; a brand that only swaps the accent (acme)
 * answers for the accent pairs. Pairs where both sides are inherited are the
 * base palette's, gated by the base's own tests.
 */
export function checkBrandContrast(name: string): ContrastFailure[] {
  const failures: ContrastFailure[] = [];
  const theme = brandThemes[name];
  if (!theme) return failures;
  for (const mode of ['dark', 'light'] as const) {
    const pal = resolveBrandPalette(name, mode);
    const owned = theme[mode];
    for (const pair of brandContrastPairs()) {
      if (!(pair.fg in owned) && !(pair.bg in owned)) continue;
      const fg = pal[pair.fg];
      const bg = pal[pair.bg];
      if (fg === undefined || bg === undefined) continue; // every pair role is a semantic token
      const ratio = contrastRatio(fg, bg);
      if (ratio < pair.min) failures.push({ ...pair, mode, ratio });
    }
  }
  return failures;
}
