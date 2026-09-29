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
 *   --danger = red   (#EA6D6D) — used only for DESTRUCTIVE ACTIONS, never
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

// ── Tier 1: Primitive colour scale ───────────────────────────────────────────

export const primitives = {
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

  // Light-mode foreground variants — darker to clear 4.5:1 on #F4F7FC
  '--ocr-blue-700': '#0057D6', // accent light mode (4.7:1 on light-050)
  '--ocr-blue-600l': '#2E6FDF', // accent hover light
  '--ocr-slate-600': '#4A6882', // muted light mode (4.6:1 on light-050)
  '--ocr-slate-500': '#72879F', // light-mode control edge (WCAG 1.4.11: 3.1–3.7:1 on bg/surface/surface-hover)
} as const;

export type PrimitiveName = keyof typeof primitives;

// ── Tier 2: Semantic tokens (dark default) ────────────────────────────────────

export const semanticDark = {
  '--bg': 'var(--ocr-navy-925)', // OSE-1325: lifted one step from navy-950 (#0F1824 → #141F30)
  '--surface': 'var(--ocr-navy-900)',
  '--border': 'var(--ocr-navy-700)',
  // Edge of a form control (input, search, select). Dark keeps its current look:
  // same colour as --border. Light needs 3:1 for WCAG 1.4.11.
  '--border-strong': 'var(--ocr-navy-700)',
  '--text': 'var(--ocr-navy-100)',
  '--text-muted': 'var(--ocr-navy-500)',
  '--accent': 'var(--ocr-blue-600)',
  '--accent-hover': 'var(--ocr-blue-500)',
  '--live': 'var(--ocr-teal-400)', // on-air / active — teal, not green
  '--live-hover': 'var(--ocr-teal-300)',
  '--surface-hover': 'var(--ocr-navy-800)',
  '--danger': 'var(--ocr-red-500)', // destructive actions only
  '--danger-hover': 'var(--ocr-red-400)',
  '--error': 'var(--ocr-red-500)', // alias — form validation / error banners
  '--warn': 'var(--ocr-amber-400)', // caution / pending — amber (OSE-1328)
  '--info': 'var(--ocr-blue-500)', // informational — blue, lighter than --accent (OSE-1328)
  // OSE-654 role vocabulary — the swap seam brand themes re-map.
  '--card': 'var(--ocr-navy-900)', // card surface (= surface by default; brands may differ)
  '--text-primary': 'var(--ocr-navy-100)', // alias of --text (explicit role name)
  '--text-secondary': 'var(--ocr-navy-500)', // secondary shares the muted tone
  '--success': 'var(--ocr-green-400)', // done / accepted / completed — emerald (OSE-1328)
  // Dark --accent (#1785FB) is light-ish, so text on it must be DARK: white was
  // 3.63:1 (sub-AA); navy-950 is 4.92:1 — full AA (CCR-PR567 re-run item 5).
  '--on-accent': 'var(--ocr-navy-950)', // #0F1824 — text on solid --accent (blue) surfaces
} as const;

// ── Tier 2: Light mode override ───────────────────────────────────────────────

export const semanticLight = {
  '--bg': 'var(--ocr-light-050)',
  '--surface': 'var(--ocr-light-100)',
  '--border': 'var(--ocr-light-200)',
  '--border-strong': 'var(--ocr-slate-500)', // 3.4:1 on --bg, 3.7:1 on --surface
  '--text': 'var(--ocr-dark-900)',
  '--text-muted': 'var(--ocr-slate-600)', // 4.6:1 — full AA
  '--accent': 'var(--ocr-blue-700)', // 4.7:1 — full AA
  '--accent-hover': 'var(--ocr-blue-600l)',
  '--live': 'var(--ocr-teal-700)', // 4.9:1 — full AA
  '--live-hover': 'var(--ocr-teal-600)',
  // Was light-200 (= --border): muted/live/warn/success text on a hovered
  // card or row fell to 3.97–4.43:1. light-150 keeps every role >= 4.5:1.
  '--surface-hover': 'var(--ocr-light-150)',
  '--danger': 'var(--ocr-red-700)', // 5.2:1 — full AA
  '--danger-hover': 'var(--ocr-red-600)',
  '--error': 'var(--ocr-red-700)', // alias — form validation / error banners
  '--warn': 'var(--ocr-amber-700)', // caution / pending — amber (OSE-1328)
  '--info': 'var(--ocr-blue-700)', // informational — blue (OSE-1328)
  // OSE-654 role vocabulary — light-mode values.
  '--card': 'var(--ocr-light-100)',
  '--text-primary': 'var(--ocr-dark-900)',
  '--text-secondary': 'var(--ocr-slate-600)', // 5.44:1 on --bg
  '--success': 'var(--ocr-green-700)', // done / accepted / completed — emerald (OSE-1328)
  '--on-accent': 'var(--ocr-light-100)', // #FFFFFF — text on solid --accent (blue) surfaces
} as const;

// ── Shared structural tokens (not colour, not theme-sensitive) ────────────────

export const structural = {
  '--radius': '12px',
  '--radius-sm': '8px',
  '--radius-pill': '20px',
  '--tap-min': '48px',
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
export const brandThemes: Record<string, BrandTheme> = {
  acme: {
    // Violet brand — the minimal example: only the accent changes. Dark values
    // are light-on-dark (AA on navy-950); light values are dark-on-light (AA on
    // light-050). (--info was dropped: it is LOCKED, a brand may not recolour it.)
    dark: {
      '--accent': '#A78BFA',
      '--accent-hover': '#C4B5FD',
    },
    light: {
      '--accent': '#6D28D9',
      '--accent-hover': '#5B21B6',
    },
  },

  // ourWKRP — amber on black. A broadcast product: it reads on a neutral carbon
  // ground rather than the fleet's navy, with an ember accent. Values come from
  // @ocr/tokens (carbon / ember families) and WKRP's shipped palette, mapped ONLY
  // onto customizable roles: --live stays the fleet's teal and --danger its red
  // (WKRP's old red "live" dot is retired — red means destructive, not on-air).
  //
  // Measured (tests/brand-themes.test.ts re-derives every one of these):
  //   dark  — text 17.4 / muted 5.6 / accent 7.7 : 1 on --bg; muted 4.9 and
  //           accent 6.8 on --surface-hover; --border-strong 3.3–3.7 : 1;
  //           --on-accent 7.7 on --accent, 9.6 on --accent-hover.
  //   light — ember #D4954B is only 2.4:1 on a light ground, so light uses a
  //           burnt amber: accent 5.6 on --bg, 5.1 on --surface-hover; white
  //           --on-accent 6.0 / 7.8 on accent / accent-hover; --border-strong
  //           3.3–3.8 : 1; locked status roles (live/danger/warn/info/success)
  //           all clear 4.5 on the warm paper grounds.
  ow: {
    dark: {
      '--bg': '#0A0A0A', // carbon-950
      '--surface': '#141414', // carbon-900
      '--card': '#141414',
      '--surface-hover': '#1A1A1A', // carbon-800
      '--border': '#2A2A2A', // carbon-700 — decorative dividers only
      '--border-strong': '#6B6B6B', // control edges (WCAG 1.4.11)
      '--text': '#F0F0F0', // carbon-100
      '--text-primary': '#F0F0F0',
      '--text-muted': '#888888', // carbon-500
      '--text-secondary': '#888888',
      '--accent': '#D4954B', // ember-600
      '--accent-hover': '#E8A849', // ember-500
      '--on-accent': '#0A0A0A', // carbon ink on ember
    },
    light: {
      '--bg': '#FAF7F2', // warm paper
      '--surface': '#FFFFFF',
      '--card': '#FFFFFF',
      '--surface-hover': '#F2EDE4',
      '--border': '#E4DDD1',
      '--border-strong': '#8C8170',
      '--text': '#1A1A1A',
      '--text-primary': '#1A1A1A',
      '--text-muted': '#5E574D',
      '--text-secondary': '#5E574D',
      '--accent': '#93540F', // burnt amber — ember darkened for a light ground
      '--accent-hover': '#7A4608',
      '--on-accent': '#FFFFFF',
    },
  },
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
