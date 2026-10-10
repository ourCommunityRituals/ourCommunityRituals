/**
 * @ocr/ui — Canonical design tokens (CARTO palette, colorblind-safe)
 *
 * THREE-TIER ARCHITECTURE
 * ────────────────────────────────────────────────────────────────────────────
 * Tier 1  Primitives   raw colour values — never referenced by components
 * Tier 2  Semantic     meaning-mapped vars referencing Tier 1 — what components use
 * Tier 3  Brand        one CSS block that re-maps Tier 2 → different Tier 1
 *
 * COLORBLIND SAFETY (geographic consumption)
 * ────────────────────────────────────────────────────────────────────────────
 * Red + green as semantic opposites is the primary geographic accessibility
 * failure (deuteranopia affects ~8% of males; protanopia ~1%). This palette
 * avoids it:
 *   --live   = teal  (#00C4B4) — distinguishable across protanopia,
 *              deuteranopia, and tritanopia; distinct in lightness from blue
 *   --danger = red   (#F08585 dark) — used only for DESTRUCTIVE ACTIONS, never
 *              as a semantic opposite to --live
 *
 * All foreground/background pairs target WCAG AA (4.5:1 normal text, 3:1 large).
 * Run: import { contrastRatio } from '@ocr/ui' to verify any new pair.
 *
 * ADDING A NEW CLIENT BRAND
 * ────────────────────────────────────────────────────────────────────────────
 * Add a Tier 3 block in the consumer's CSS (not here):
 *
 *   [data-brand="acme"] {
 *     --accent:       #7B3FE4;
 *     --accent-hover: #9B5FF4;
 *   }
 *
 * Override only the semantic tokens that differ. Everything else inherits OCR base.
 *
 * LOCKED BASE — CUSTOMIZE VIA THE WHITE-LABEL PIPELINE, NOT HERE
 * ────────────────────────────────────────────────────────────────────────────
 * Tier 1 + Tier 2 are canonical and locked: no surface hardcodes a hex or
 * declares its own :root (both gated fleet-wide by scripts/check-token-adherence.mjs).
 * Per-brand customization is a Tier 3 [data-brand] block INJECTED by the
 * white-label pipeline — OSM (OurSharedMagnets) contracts/onboards the brand's
 * assets + config, OA (OurAirwaves) deploys the instance / client fork — never
 * a hand-edited token in a template. A brand override set must itself pass
 * contrast verification (an inaccessible white-label palette does not ship).
 */

import { ocrPrimitives, ocrRoles, type OcrRole } from './generated/ocr-tokens';

// ── OCR-level source: @ocr/tokens ────────────────────────────────────────────
//
// The fleet's colors are set once, in packages/tokens (the OCR design system:
// charcoal and creme base, blue for ourSharedEvents, amber for the flag side).
// @ocr/ui keeps its own role names (--bg, --accent, ...) because every spoke
// template uses them; each one is mapped below to an @ocr/tokens role. The
// values arrive through src/generated/ocr-tokens.ts (see
// scripts/sync-ocr-tokens.ts) so @ocr/ui still works when a spoke's CI stages
// packages/ui on its own. How to change a color: design-system/CHANGING-COLORS.md.

/** @ocr/ui role name -> the @ocr/tokens role it takes its value from. */
export const UI_FROM_OCR = {
  '--bg': '--ground',
  '--surface': '--surface',
  '--card': '--surface',
  '--surface-hover': '--surface-raised',
  '--border': '--border',
  '--border-strong': '--border-strong',
  '--text': '--text',
  '--text-primary': '--text',
  '--text-muted': '--text-muted',
  '--text-secondary': '--text-muted',
  '--accent': '--action',
  '--accent-hover': '--action-hover',
  '--on-accent': '--on-action',
  '--live': '--status-live',
  '--danger': '--status-danger',
  '--danger-hover': '--status-danger-hover',
  '--error': '--status-danger',
  '--warn': '--status-warn',
  '--info': '--status-info',
  '--success': '--status-success',
} as const satisfies Record<string, OcrRole>;

type UiRole = keyof typeof UI_FROM_OCR;

/** A built-in brand's OCR role map; a brand @ocr/tokens does not define is an error. */
function ocrRolesFor(name: string): NonNullable<(typeof ocrRoles)[string]> {
  const roles = ocrRoles[name];
  if (!roles) throw new Error(`@ocr/tokens defines no brand "${name}"`);
  return roles;
}

/** var(--ocr-...) for a @ui role in the base (ourSharedEvents) brand. */
const base = (mode: 'dark' | 'light', role: UiRole): string =>
  `var(${ocrRolesFor('ose')[mode][UI_FROM_OCR[role]]})`;

// ── Tier 1: Primitive colour scale ───────────────────────────────────────────

export const primitives = {
  // OCR-level primitives from @ocr/tokens (charcoal/creme base and the role
  // colors). Generated; where a name also appears below, the value is identical
  // (gated by tests/ocr-tokens.test.ts). The navy, light and grey scales below
  // are kept for reference and older templates; no semantic role points at them.
  ...ocrPrimitives,

  // CARTO blue scale
  '--ocr-blue-600': '#1785FB', // CARTO signature blue
  '--ocr-blue-500': '#3D9BFF', // hover / lighter
  '--ocr-blue-200': '#A8CEFD', // subtle highlight (light mode)

  // Navy/dark scale
  '--ocr-navy-950': '#0F1824', // darkest (reserved — deepest step)
  '--ocr-navy-925': '#141F30', // dark-mode PAGE bg — one step up from navy-950 (OSE-1325)
  '--ocr-navy-900': '#1A2740', // surface / card
  '--ocr-navy-700': '#2A3D5A', // border
  '--ocr-navy-500': '#7A94B0', // muted text
  '--ocr-navy-100': '#F0F4F8', // text on dark (blue-white)

  // Light scale
  '--ocr-light-050': '#F4F7FC', // light mode bg
  '--ocr-light-100': '#FFFFFF', // light mode surface
  '--ocr-light-150': '#E8EEF6', // light mode surface-hover — every text/status role clears 4.5:1 on it
  '--ocr-light-200': '#D4E0ED', // light mode border
  '--ocr-dark-900': '#162945', // light mode text (CARTO dark navy)
  '--ocr-dark-500': '#5A7A9A', // light mode muted

  // Status — colorblind-safe pair (NOT red + green)
  '--ocr-teal-400': '#00C4B4', // live dark mode  (8.1:1 on navy-950)
  '--ocr-teal-300': '#33D4C6', // live hover dark
  '--ocr-teal-700': '#00796B', // live light mode (4.9:1 on light-050)
  '--ocr-teal-600': '#009688', // live hover light
  '--ocr-red-500': '#EA6D6D', // danger dark mode — AA on --bg #141F30 (5.45:1) + --surface #1A2740 (4.90:1). Brightened from #E05252 (3.90:1 on surface) after OSE-1325 lifted --bg.
  '--ocr-red-400': '#E87272', // danger hover dark
  '--ocr-red-700': '#B03030', // danger light mode (5.2:1 on light-050)
  '--ocr-red-600': '#C03838', // danger hover light

  // Warn — amber (colorblind-safe; distinct from the red/green axis). OSE-1328.
  '--ocr-amber-400': '#F5B32E', // warn dark mode
  '--ocr-amber-700': '#8A5A00', // warn light mode

  // Success — emerald (blue-green). Distinct in HUE and LIGHTNESS from --danger
  // red (#EA6D6D) and from --live teal (#00C4B4); reserved for done/accepted/
  // completed and NEVER used as a semantic OPPOSITE to --danger (always paired
  // with a text label per WCAG 1.4.1). Two theme values, mirroring --live:
  // dark is bright (readable on navy AND as a filled bg with dark var(--bg)
  // text — contrast is symmetric); light is dark (readable on light-050 AND
  // with white text). OSE-1328 / token-lock (PR #567). Verified in verify-contrast.mjs.
  '--ocr-green-400': '#34D399', // success dark mode  (8.6:1 on --bg, 7.8:1 on --surface)
  '--ocr-green-700': '#137A42', // success light mode (5.0:1 on light-050; 5.4:1 with white)

  // Surface hover steps
  '--ocr-navy-800': '#223350', // surface-hover dark (between navy-900 and navy-700)

  // Dark-theme text and edge steps (rendered audit, 2026-09-29): the base dark
  // palette put accent-as-text at 4.11:1 on cards, muted text at 4.04:1 on
  // hovered rows, and control edges at 1.51:1. The CARTO blue stays the brand's
  // signature primitive; dark UI reads it one step lighter.
  '--ocr-blue-400': '#52A6FF', // dark --accent: 6.51 / 5.86 / 4.98 on bg / surface / surface-hover
  '--ocr-blue-300': '#8AC2FF', // dark --accent-hover
  '--ocr-navy-450': '#8AA1BC', // dark --text-muted: 6.23 / 5.61 / 4.77
  '--ocr-navy-600': '#6483A3', // dark --border-strong: 4.19 / 3.78 / 3.21 (WCAG 1.4.11)
  '--ocr-red-350': '#F08585', // dark --danger / --error: 6.62 / 5.96 / 5.07; 7.14 with navy ink as a fill
  '--ocr-red-300': '#F4A3A3', // dark --danger-hover

  // Light-mode foreground variants — darker to clear 4.5:1 on #F4F7FC
  '--ocr-blue-700': '#0057D6', // accent light mode (4.7:1 on light-050)
  '--ocr-blue-600l': '#2E6FDF', // accent hover light
  '--ocr-slate-600': '#4A6882', // muted light mode (4.6:1 on light-050)
  '--ocr-slate-500': '#72879F', // light-mode control edge (WCAG 1.4.11: 3.1–3.7:1 on bg/surface/surface-hover)

  // Plain-web light (OSE-1523, PO 2026-10-03): white page, grey bands, thin
  // rules, and the link blue and visited purple a browser uses by default.
  // Ratios are measured by scripts/verify-contrast.mjs, never hand-kept here.
  '--ocr-grey-050': '#F5F5F5', // light surface-hover: lighter than the band, so the fixed status colours stay AA on it
  '--ocr-grey-100': '#EEEEEE', // light panel / band
  '--ocr-grey-300': '#CCCCCC', // light rule (decorative)
  '--ocr-grey-600': '#767676', // light control edge (WCAG 1.4.11)
  '--ocr-grey-700': '#555555', // light muted text
  '--ocr-grey-900': '#222222', // light text
  '--ocr-link-600': '#0000EE', // light accent: the default web link blue
  '--ocr-link-800': '#0000AA', // light accent hover
  '--ocr-visited-700': '#551A8B', // light visited link: the default web visited purple
} as const;

export type PrimitiveName = keyof typeof primitives;

// ── Tier 2: Semantic tokens (dark default) ────────────────────────────────────

export const semanticDark = {
  // Every value but --accent-visited and --live-hover comes from @ocr/tokens via UI_FROM_OCR.
  '--bg': base('dark', '--bg'),
  '--surface': base('dark', '--surface'),
  '--card': base('dark', '--card'),
  '--surface-hover': base('dark', '--surface-hover'),
  '--border': base('dark', '--border'),
  '--border-strong': base('dark', '--border-strong'),
  '--text': base('dark', '--text'),
  '--text-primary': base('dark', '--text-primary'),
  '--text-muted': base('dark', '--text-muted'),
  '--text-secondary': base('dark', '--text-secondary'),
  '--accent': base('dark', '--accent'),
  '--accent-hover': base('dark', '--accent-hover'),
  // A followed link. Dark keeps one link colour (OSE-1523).
  '--accent-visited': base('dark', '--accent'),
  '--on-accent': base('dark', '--on-accent'),
  '--live': base('dark', '--live'),
  '--live-hover': 'var(--ocr-teal-300)',
  '--danger': base('dark', '--danger'),
  '--danger-hover': base('dark', '--danger-hover'),
  '--error': base('dark', '--error'),
  '--warn': base('dark', '--warn'),
  '--info': base('dark', '--info'),
  '--success': base('dark', '--success'),
} as const;

// ── Tier 2: Light mode override ───────────────────────────────────────────────

export const semanticLight = {
  // Every value but --accent-visited and --live-hover comes from @ocr/tokens via UI_FROM_OCR.
  '--bg': base('light', '--bg'),
  '--surface': base('light', '--surface'),
  '--card': base('light', '--card'),
  '--surface-hover': base('light', '--surface-hover'),
  '--border': base('light', '--border'),
  '--border-strong': base('light', '--border-strong'),
  '--text': base('light', '--text'),
  '--text-primary': base('light', '--text-primary'),
  '--text-muted': base('light', '--text-muted'),
  '--text-secondary': base('light', '--text-secondary'),
  '--accent': base('light', '--accent'),
  '--accent-hover': base('light', '--accent-hover'),
  // A followed link: the web's visited purple (OSE-1523).
  '--accent-visited': 'var(--ocr-visited-700)',
  '--on-accent': base('light', '--on-accent'),
  '--live': base('light', '--live'),
  '--live-hover': 'var(--ocr-teal-600)',
  '--danger': base('light', '--danger'),
  '--danger-hover': base('light', '--danger-hover'),
  '--error': base('light', '--error'),
  '--warn': base('light', '--warn'),
  '--info': base('light', '--info'),
  '--success': base('light', '--success'),
} as const;

// ── Shared structural tokens (not colour, not theme-sensitive) ────────────────

export const structural = {
  '--radius': '12px',
  '--radius-sm': '8px',
  '--radius-pill': '20px',
  '--tap-min': '48px',
  // The smallest text the fleet renders: 13px at the default 16px root. Decided
  // 2026-09-29 alongside AA-everywhere. Every sub-13px size in styles.ts points
  // here instead of carrying its own literal, so the floor is one value to read
  // and one to change. Gated by tests/text-floor.test.ts.
  '--text-min': '.8125rem',
  '--font': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
} as const;

// ── Legacy alias ──────────────────────────────────────────────────────────────

export const tokens = {
  ...primitives,
  ...semanticDark,
  ...structural,
} as const;

export type TokenName = keyof typeof tokens;

/** Format a token object as CSS custom-property declaration lines at the given indent. */
function cssVars(obj: Record<string, string>, indent = '  '): string {
  return Object.entries(obj).map(([k, v]) => `${indent}${k}: ${v};`).join('\n');
}

/** Full :root block — primitives + dark semantic defaults + structural. */
export function rootBlock(): string {
  const lines = (obj: Record<string, string>) =>
    Object.entries(obj)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');

  return [
    '/* Tier 1 — primitives */',
    ':root {',
    lines(primitives),
    '}',
    '',
    '/* Tier 2 — semantic (dark default) */',
    ':root {',
    lines(semanticDark),
    lines(structural),
    '}',
  ].join('\n');
}

/**
 * Light-mode override block.
 * Default: automatic via prefers-color-scheme.
 * Force light: add data-theme="light" to <html> and call lightModeBlock('[data-theme="light"]').
 */
export function lightModeBlock(selector = '@media (prefers-color-scheme: light)'): string {
  const lines = Object.entries(semanticLight)
    .map(([k, v]) => `    ${k}: ${v};`)
    .join('\n');
  if (selector.startsWith('@')) {
    return `${selector} {\n  :root {\n${lines}\n  }\n}`;
  }
  return `${selector} {\n${lines}\n}`;
}

/**
 * Dark-mode forced override block.
 * Use data-theme="dark" on <html> to lock dark mode regardless of system preference.
 * Explicit forcing is required by Claude Design for component previews and for
 * users whose OS reports light mode but who prefer the dark interface.
 */
export function forceDarkBlock(selector = '[data-theme="dark"]'): string {
  const lines = Object.entries(semanticDark)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
  return `${selector} {\n${lines}\n}`;
}

// ── UEC v1.1: Universal Event Code category colors ────────────────────────────
//
// Theme-invariant: hue carries semantic meaning (green = access, coral = energy,
// etc.) — the colors must not flip between light and dark mode.
//
// Two palettes per code:
//   display_hex — warm brand variant for UI surfaces, marketing, poster chrome
//   scan_hex    — WCAG AA validated on white, used as QR module fill color
//
// Source of truth for hex values: src/lib/uec/uec-codes.ts in the OSE Worker.
// Changes here must stay in sync with that file.

/**
 * UEC display palette — for UI surfaces, poster chrome, SharedReport badges.
 *
 * Badge text pairings (WCAG AA ≥ 3:1 for decorative/large text):
 *   WHITE text (≥ 3:1): enter, sponsor, archive, help, utility, alert, staff, checkin, shop
 *   BLACK text (≥ 3:1): live (#E07A5F coral ~2.96 white → use black), feedback (#C4930A amber ~2.79 white → use black)
 */
export const uecDisplay = {
  '--uec-enter': '#2D6A4F', // Green    — Go · Access · Safe Passage       | white text
  '--uec-live': '#E07A5F', // Coral    — Exciting · Warm · Now             | BLACK text
  '--uec-sponsor': '#1D3557', // Blue     — Trust · Commerce · Partnership    | white text
  '--uec-archive': '#6C3483', // Purple   — Memory · History · Record         | white text
  '--uec-help': '#D4668E', // Pink     — Care · Assistance · Accessibility | white text
  '--uec-feedback': '#C4930A', // Amber    — Voice · Opinion · Response        | BLACK text
  '--uec-utility': '#4A4A4A', // Charcoal — General · Info · Infrastructure  | white text
  // Extension codes (08-11)
  '--uec-alert': '#B8960A', // Yellow-Amber — high-visibility alert         | black text
  '--uec-staff': '#A00020', // Deep Red     — staff-only surface             | white text
  '--uec-checkin': '#006B6B', // Teal         — check-in variant              | white text
  '--uec-shop': '#1A4A48', // Dark Teal    — commerce placement            | white text
} as const;

/** UEC scan palette — WCAG AA on white, intended for QR module fill color. */
export const uecScan = {
  '--uec-enter-scan': '#1A6B2F',
  '--uec-live-scan': '#C04048',
  '--uec-sponsor-scan': '#1A3A8A',
  '--uec-archive-scan': '#5E1A9A',
  '--uec-help-scan': '#B01468',
  '--uec-feedback-scan': '#8A5A00',
  '--uec-utility-scan': '#2A2A3A',
  // Extensions: scan_hex === display_hex for these codes
  '--uec-alert-scan': '#B8960A',
  '--uec-staff-scan': '#A00020',
  '--uec-checkin-scan': '#006B6B',
  '--uec-shop-scan': '#1A4A48',
} as const;

/**
 * Static :root block for all UEC custom properties.
 * Include once in the global stylesheet (ocrStylesheet() already calls this).
 *
 * Colors are theme-invariant — do NOT wrap in prefers-color-scheme.
 */
export function uecBlock(): string {
  const lines = (obj: Record<string, string>) =>
    Object.entries(obj)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');
  return [
    '/* UEC v1.1 — Universal Event Code category colors (theme-invariant) */',
    ':root {',
    lines(uecDisplay),
    lines(uecScan),
    '}',
  ].join('\n');
}

// ── Tier 3: Client brand themes (OSE-654) ─────────────────────────────────────
//
// A client theme is ONE object that re-maps semantic ROLE tokens (Tier 2) to
// different values — structure and components never change, only paint. This is
// the "swap on the fly / new client in days" seam OSE-653 is built on.
//
// Overrides MUST carry BOTH a dark and a light value: a single flat --accent
// would clear WCAG AA in one mode and fail in the other (dark bg wants a lighter
// accent; light bg wants a darker one). brandBlock() emits both.
//
// UEC category colors are NEVER themed — hue carries meaning (green = access).
// A brand theme may re-map --accent/--card/--success/etc.; it may not touch --uec-*.

export interface BrandTheme {
  /** Semantic-token overrides applied on dark backgrounds. */
  dark: Record<string, string>;
  /** Semantic-token overrides applied on light backgrounds (AA against light bg). */
  light: Record<string, string>;
}

/**
 * Registered brand themes. Every key in every theme MUST be BRAND_CUSTOMIZABLE
 * (src/brand.ts) — gated by tests/brand-themes.test.ts, which also holds each
 * theme to the contrast floors in BOTH modes on the brand's own grounds.
 */
function brandFromOcr(name: string): BrandTheme {
  const out: BrandTheme = { dark: {}, light: {} };
  for (const mode of ['dark', 'light'] as const) {
    for (const [ui, role] of Object.entries(UI_FROM_OCR)) {
      if (role.startsWith('--status-')) continue; // locked: never brand-painted
      const mine = ocrRolesFor(name)[mode][role];
      if (mine !== ocrRolesFor('ose')[mode][role]) out[mode][ui] = ocrPrimitives[mine];
    }
    // A followed link stays in the brand's accent family.
    const accent = out[mode]['--accent'];
    if (accent) out[mode]['--accent-visited'] = accent;
  }
  return out;
}

export const brandThemes: Record<string, BrandTheme> = {
  acme: {
    // Violet brand — the minimal example: only the accent changes. Dark values
    // are light-on-dark (AA on navy-950); light values are dark-on-light (AA on
    // light-050). (--info was dropped: it is LOCKED, a brand may not recolour it.)
    dark: {
      '--accent': '#A78BFA',
      '--accent-hover': '#C4B5FD',
      '--accent-visited': '#A78BFA',
    },
    light: {
      '--accent': '#6D28D9',
      '--accent-hover': '#5B21B6',
      '--accent-visited': '#5B21B6',
    },
  },

  // The flag side (ourWKRP / ourAirwaves): amber on the shared charcoal/creme
  // base. Derived from @ocr/tokens' `ow` brand: every customizable role where it
  // differs from the base brand, plus its visited links in the same amber.
  // Status roles stay locked to the fleet values (--live stays teal: red means
  // destructive, not on-air).
  ow: brandFromOcr('ow'),
};

/**
 * Emit the CSS for one registered brand theme: a base `[data-brand="x"]` block
 * (dark defaults) plus light-mode overrides for both `prefers-color-scheme:
 * light` and the explicit `[data-theme="light"]` path. Returns '' for unknown
 * names (fail-soft — an unknown brand simply inherits the OCR base).
 */
export function brandBlock(name: string): string {
  const theme = brandThemes[name];
  if (!theme) return '';
  const dark = cssVars(theme.dark);
  const lightInner = cssVars(theme.light);
  const lightIndented = cssVars(theme.light, '    ');
  // The explicit [data-theme="dark"] block is not redundant: without it, a page
  // forced dark on a device that prefers light would pick up the @media light
  // brand block (same specificity, later in the sheet) — light grounds under a
  // dark page. (0,2,0) beats both the base and the @media block.
  return [
    `[data-brand="${name}"] {`,
    dark,
    '}',
    `@media (prefers-color-scheme: light) {`,
    `  [data-brand="${name}"] {`,
    lightIndented,
    '  }',
    '}',
    `[data-theme="light"][data-brand="${name}"] {`,
    lightInner,
    '}',
    `[data-theme="dark"][data-brand="${name}"] {`,
    dark,
    '}',
  ].join('\n');
}

/** Emit every registered brand theme's CSS (included in the shared stylesheet). */
export function brandBlocks(): string {
  return Object.keys(brandThemes).map(brandBlock).join('\n\n');
}
