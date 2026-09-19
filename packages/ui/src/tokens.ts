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
 *   --danger = red   (#E05252) — used only for DESTRUCTIVE ACTIONS, never
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
 */

// ── Tier 1: Primitive colour scale ───────────────────────────────────────────

export const primitives = {
  // Pure ink — the only correct --on-accent for the dark theme's accent fill.
  '--ocr-ink-000': '#000000',    // 5.78:1 on --ocr-blue-600; white is only 3.63:1

  // CARTO blue scale
  '--ocr-blue-600': '#1785FB',   // CARTO signature blue
  '--ocr-blue-500': '#3D9BFF',   // hover / lighter
  '--ocr-blue-200': '#A8CEFD',   // subtle highlight (light mode)

  // Navy/dark scale
  '--ocr-navy-950': '#0F1824',   // darkest bg
  '--ocr-navy-900': '#1A2740',   // surface / card
  '--ocr-navy-700': '#2A3D5A',   // border
  '--ocr-navy-500': '#7A94B0',   // muted text
  '--ocr-navy-100': '#F0F4F8',   // text on dark (blue-white)

  // Light scale
  '--ocr-light-050': '#F4F7FC',  // light mode bg
  '--ocr-light-100': '#FFFFFF',  // light mode surface
  '--ocr-light-200': '#D4E0ED',  // light mode border
  '--ocr-dark-900':  '#162945',  // light mode text (CARTO dark navy)
  '--ocr-dark-500':  '#5A7A9A',  // light mode muted

  // Status — colorblind-safe pair (NOT red + green)
  '--ocr-teal-400':  '#00C4B4',  // live dark mode  (8.1:1 on navy-950)
  '--ocr-teal-300':  '#33D4C6',  // live hover dark
  '--ocr-teal-700':  '#00796B',  // live light mode (4.9:1 on light-050)
  '--ocr-teal-600':  '#009688',  // live hover light
  '--ocr-red-500':   '#E05252',  // danger dark mode (4.7:1 on navy-950)
  '--ocr-red-400':   '#E87272',  // danger hover dark
  '--ocr-red-700':   '#B03030',  // danger light mode (5.2:1 on light-050)
  '--ocr-red-600':   '#C03838',  // danger hover light

  // Surface hover steps
  '--ocr-navy-800':   '#223350',  // surface-hover dark (between navy-900 and navy-700)

  // Light-mode foreground variants — darker to clear 4.5:1 on #F4F7FC
  '--ocr-blue-700':   '#0057D6',  // accent light mode (4.7:1 on light-050)
  '--ocr-blue-600l':  '#2E6FDF',  // accent hover light
  '--ocr-slate-600':  '#4A6882',  // muted light mode (4.6:1 on light-050)

  // Warn — amber (colorblind-safe alongside teal/blue; NOT green). OSE-654.
  '--ocr-amber-400':  '#F5B32E',  // warn dark mode  (light amber on navy-950)
  '--ocr-amber-700':  '#8A5A00',  // warn light mode (dark amber, AA on light-050)
} as const;

export type PrimitiveName = keyof typeof primitives;

// ── Tier 2: Semantic tokens (dark default) ────────────────────────────────────

export const semanticDark = {
  '--bg':            'var(--ocr-navy-950)',
  '--surface':       'var(--ocr-navy-900)',
  '--border':        'var(--ocr-navy-700)',
  '--text':          'var(--ocr-navy-100)',
  '--text-muted':    'var(--ocr-navy-500)',
  '--accent':        'var(--ocr-blue-600)',
  '--accent-hover':  'var(--ocr-blue-500)',
  // fg for labels/icons ON --accent or --danger. The right answer FLIPS per theme and
  // white was wrong here: white on #1785FB is 3.63:1, black is 5.78:1 (and 5.50:1 on
  // --danger). The literal `color:#000` in styles.ts was masking this — reading the token
  // without fixing it would have made dark mode worse. Brands with a light accent override.
  '--on-accent':     'var(--ocr-ink-000)',
  '--live':          'var(--ocr-teal-400)',   // on-air / active — teal, not green
  '--live-hover':    'var(--ocr-teal-300)',
  '--surface-hover':  'var(--ocr-navy-800)',
  '--danger':         'var(--ocr-red-500)',    // destructive actions only
  '--danger-hover':   'var(--ocr-red-400)',
  '--error':          'var(--ocr-red-500)',    // alias — form validation / error banners
  // OSE-654 role vocabulary — the swap seam every OSE-653 surface consumes.
  '--card':           'var(--ocr-navy-900)',   // card surface (= surface by default; brands may differ)
  '--text-primary':   'var(--ocr-navy-100)',   // alias of --text (explicit role name)
  '--text-secondary': 'var(--ocr-navy-500)',   // secondary shares the muted tone until a mid-tone is designed
  '--success':        'var(--ocr-teal-400)',   // positive status — teal (colorblind-safe, NOT green)
  '--warn':           'var(--ocr-amber-400)',  // caution — amber
  '--info':           'var(--ocr-blue-500)',   // informational — blue
} as const;

// ── Tier 2: Light mode override ───────────────────────────────────────────────

export const semanticLight = {
  '--bg':            'var(--ocr-light-050)',
  '--surface':       'var(--ocr-light-100)',
  '--border':        'var(--ocr-light-200)',
  '--text':          'var(--ocr-dark-900)',
  '--text-muted':    'var(--ocr-slate-600)',   // 4.6:1 — full AA
  '--accent':        'var(--ocr-blue-700)',    // 4.7:1 — full AA
  '--accent-hover':  'var(--ocr-blue-600l)',
  '--on-accent':     'var(--ocr-light-100)',   // 6.30:1 on --accent, 6.34:1 on --danger — white is correct HERE
  '--live':          'var(--ocr-teal-700)',    // 4.9:1 — full AA
  '--live-hover':    'var(--ocr-teal-600)',
  '--surface-hover':  'var(--ocr-light-200)',
  '--danger':         'var(--ocr-red-700)',     // 5.2:1 — full AA
  '--danger-hover':   'var(--ocr-red-600)',
  '--error':          'var(--ocr-red-700)',     // alias — form validation / error banners
  // OSE-654 role vocabulary — light-mode values (each AA-validated).
  '--card':           'var(--ocr-light-100)',
  '--text-primary':   'var(--ocr-dark-900)',
  '--text-secondary': 'var(--ocr-slate-600)',   // 4.6:1 — full AA
  '--success':        'var(--ocr-teal-700)',    // 4.9:1 — full AA
  '--warn':           'var(--ocr-amber-700)',   // dark amber — AA on light-050
  '--info':           'var(--ocr-blue-700)',    // 4.7:1 — full AA
} as const;

// ── Shared structural tokens (not colour, not theme-sensitive) ────────────────

export const structural = {
  '--radius':      '12px',
  '--radius-sm':   '8px',
  '--radius-pill': '20px',
  '--tap-min':     '48px',
  '--font':        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
  return [
    '/* Tier 1 — primitives */',
    ':root {',
    cssVars(primitives),
    '}',
    '',
    '/* Tier 2 — semantic (dark default) */',
    ':root {',
    cssVars(semanticDark),
    cssVars(structural),
    '}',
  ].join('\n');
}

/**
 * Light-mode override block.
 * Default: automatic via prefers-color-scheme.
 * Force light: add data-theme="light" to <html> and call lightModeBlock('[data-theme="light"]').
 */
export function lightModeBlock(selector = '@media (prefers-color-scheme: light)'): string {
  const lines = cssVars(semanticLight, '    ');
  if (selector.startsWith('@')) {
    return `${selector} {\n  :root {\n${lines}\n  }\n}`;
  }
  return `${selector} {\n${lines}\n}`;
}

/**
 * Dark-mode forced override block.
 * Use data-theme="dark" on <html> to lock dark mode regardless of system preference.
 * Explicit forcing is required for component previews and for
 * users whose OS reports light mode but who prefer the dark interface.
 */
export function forceDarkBlock(selector = '[data-theme="dark"]'): string {
  const lines = cssVars(semanticDark);
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
  '--uec-enter':    '#2D6A4F',   // Green    — Go · Access · Safe Passage       | white text
  '--uec-live':     '#E07A5F',   // Coral    — Exciting · Warm · Now             | BLACK text
  '--uec-sponsor':  '#1D3557',   // Blue     — Trust · Commerce · Partnership    | white text
  '--uec-archive':  '#6C3483',   // Purple   — Memory · History · Record         | white text
  '--uec-help':     '#D4668E',   // Pink     — Care · Assistance · Accessibility | white text
  '--uec-feedback': '#C4930A',   // Amber    — Voice · Opinion · Response        | BLACK text
  '--uec-utility':  '#4A4A4A',   // Charcoal — General · Info · Infrastructure  | white text
  // Extension codes (08-11)
  '--uec-alert':    '#B8960A',   // Yellow-Amber — high-visibility alert         | black text
  '--uec-staff':    '#A00020',   // Deep Red     — staff-only surface             | white text
  '--uec-checkin':  '#006B6B',   // Teal         — check-in variant              | white text
  '--uec-shop':     '#1A4A48',   // Dark Teal    — commerce placement            | white text
} as const;

/** UEC scan palette — WCAG AA on white, intended for QR module fill color. */
export const uecScan = {
  '--uec-enter-scan':    '#1A6B2F',
  '--uec-live-scan':     '#C04048',
  '--uec-sponsor-scan':  '#1A3A8A',
  '--uec-archive-scan':  '#5E1A9A',
  '--uec-help-scan':     '#B01468',
  '--uec-feedback-scan': '#8A5A00',
  '--uec-utility-scan':  '#2A2A3A',
  // Extensions: scan_hex === display_hex for these codes
  '--uec-alert-scan':    '#B8960A',
  '--uec-staff-scan':    '#A00020',
  '--uec-checkin-scan':  '#006B6B',
  '--uec-shop-scan':     '#1A4A48',
} as const;

/**
 * Static :root block for all UEC custom properties.
 * Include once in the global stylesheet (ocrStylesheet() already calls this).
 *
 * Colors are theme-invariant — do NOT wrap in prefers-color-scheme.
 */
export function uecBlock(): string {
  return [
    '/* UEC v1.1 — Universal Event Code category colors (theme-invariant) */',
    ':root {',
    cssVars(uecDisplay),
    cssVars(uecScan),
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

/** Registered example client theme(s). "acme" proves the swap end-to-end. */
export const brandThemes: Record<string, BrandTheme> = {
  acme: {
    // Violet brand. Dark values are light-on-dark (AA on navy-950); light
    // values are dark-on-light (AA on light-050).
    dark: {
      '--accent': '#A78BFA',
      '--accent-hover': '#C4B5FD',
      '--info': '#A78BFA',
    },
    light: {
      '--accent': '#6D28D9',
      '--accent-hover': '#5B21B6',
      '--info': '#6D28D9',
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
  ].join('\n');
}

/** Emit every registered brand theme's CSS (included in the shared stylesheet). */
export function brandBlocks(): string {
  return Object.keys(brandThemes).map(brandBlock).join('\n\n');
}
