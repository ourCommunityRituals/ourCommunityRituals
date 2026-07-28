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

  // Light-mode foreground variants — darker to clear 4.5:1 on #F4F7FC
  '--ocr-blue-700':   '#0057D6',  // accent light mode (4.7:1 on light-050)
  '--ocr-blue-600l':  '#2E6FDF',  // accent hover light
  '--ocr-slate-600':  '#4A6882',  // muted light mode (4.6:1 on light-050)
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
  '--live':          'var(--ocr-teal-400)',   // on-air / active — teal, not green
  '--live-hover':    'var(--ocr-teal-300)',
  '--danger':        'var(--ocr-red-500)',    // destructive actions only
  '--danger-hover':  'var(--ocr-red-400)',
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
  '--live':          'var(--ocr-teal-700)',    // 4.9:1 — full AA
  '--live-hover':    'var(--ocr-teal-600)',
  '--danger':        'var(--ocr-red-700)',     // 5.2:1 — full AA
  '--danger-hover':  'var(--ocr-red-600)',
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

/** Full :root block — primitives + dark semantic defaults + structural. */
export function rootBlock(): string {
  const lines = (obj: Record<string, string>) =>
    Object.entries(obj).map(([k, v]) => `  ${k}: ${v};`).join('\n');

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
  const lines = Object.entries(semanticLight).map(([k, v]) => `    ${k}: ${v};`).join('\n');
  if (selector.startsWith('@')) {
    return `${selector} {\n  :root {\n${lines}\n  }\n}`;
  }
  return `${selector} {\n${lines}\n}`;
}
