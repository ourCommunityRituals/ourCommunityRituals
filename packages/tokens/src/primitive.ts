/**
 * @ocr/tokens — Tier 1: primitives
 *
 * Raw values only. A primitive names a VALUE, never a meaning: `--ocr-navy-950`
 * says what it is, not what it is for. Components never reference this tier —
 * they reference Tier 3, which references Tier 2, which references here.
 *
 * TWO GROUND FAMILIES, ON PURPOSE
 * ────────────────────────────────────────────────────────────────────────────
 * The fleet has two dark grounds and they are not interchangeable. OSE reads on
 * a blue-black (navy) — it is a maps-and-corridors product and the ground carries
 * that. OW reads on a neutral black (carbon) — it is a broadcast product and the
 * ground gets out of the way of album art. Both ship today (OSE navy #0F1824,
 * OW carbon #0A0A0A). Collapsing them into one "dark" primitive would force one
 * of the two apps to change how it looks in order to adopt the token system,
 * which is how a shared layer gets rejected. So both live here, and Tier 2 picks
 * per brand.
 *
 * COLORBLIND SAFETY
 * ────────────────────────────────────────────────────────────────────────────
 * Red and green as semantic opposites is the single most common accessibility
 * failure (deuteranopia ~8% of males, protanopia ~1%). Teal carries "live" and
 * amber carries "warn"; red is reserved for destructive actions. See
 * OPEN QUESTION in semantic.ts about OW's on-air red.
 *
 * Every foreground/background pairing that ships is asserted against WCAG AA in
 * tests/contrast.test.ts. Adding a pair without adding its assertion is a
 * test failure, not a review comment.
 */

/** Blue-black ground family — OSE. */
export const navy = {
  '--ocr-navy-950': '#0F1824', // ground
  '--ocr-navy-900': '#1A2740', // surface / card
  '--ocr-navy-800': '#223350', // surface hover
  '--ocr-navy-700': '#2A3D5A', // border
  '--ocr-navy-500': '#7A94B0', // muted text
  '--ocr-navy-100': '#F0F4F8', // text
} as const;

/** Neutral-black ground family — OW. */
export const carbon = {
  '--ocr-carbon-950': '#0A0A0A', // ground
  '--ocr-carbon-900': '#141414', // surface / card
  '--ocr-carbon-800': '#1A1A1A', // surface hover
  '--ocr-carbon-700': '#2A2A2A', // border
  '--ocr-carbon-500': '#888888', // muted text  (5.6:1 on carbon-950)
  '--ocr-carbon-100': '#F0F0F0', // text
} as const;

/** Light ground family — shared by both brands, and the poster's only ground. */
export const paper = {
  '--ocr-paper-050': '#F4F7FC', // ground
  '--ocr-paper-100': '#FFFFFF', // surface / card / poster stock
  '--ocr-paper-200': '#D4E0ED', // border
  '--ocr-ink-900': '#162945', // text — and the poster's only ink
  '--ocr-ink-500': '#4A6882', // muted text (4.6:1 on paper-050)
} as const;

/** Blue accent family — OSE action color. */
export const signal = {
  '--ocr-signal-700': '#0057D6', // action on light (4.7:1 on paper-050)
  '--ocr-signal-600': '#1785FB', // signature
  '--ocr-signal-500': '#3D9BFF', // action on dark
  '--ocr-signal-400': '#2E6FDF', // action-hover on light
} as const;

/** Amber accent family — OW action color. */
export const ember = {
  '--ocr-ember-800': '#8A5A00', // action on light (AA on paper-050)
  '--ocr-ember-600': '#D4954B', // action on dark
  '--ocr-ember-500': '#E8A849', // action-hover on dark
} as const;

/**
 * Status families. Theme-sensitive (each has a dark-ground and a light-ground
 * value) but NOT brand-sensitive — a warning is amber in both apps.
 */
export const status = {
  '--ocr-teal-400': '#00C4B4', // live / success on dark  (8.1:1 on navy-950)
  '--ocr-teal-300': '#33D4C6', // hover on dark
  '--ocr-teal-700': '#00796B', // live / success on light (4.9:1 on paper-050)
  '--ocr-teal-600': '#009688', // hover on light
  '--ocr-warn-400': '#F5B32E', // warn on dark
  '--ocr-warn-700': '#8A5A00', // warn on light
  '--ocr-red-500': '#E05252', // DESTRUCTIVE ONLY on dark (4.7:1 on navy-950)
  '--ocr-red-400': '#E87272', // hover on dark
  '--ocr-red-700': '#B03030', // DESTRUCTIVE ONLY on light (5.2:1 on paper-050)
  '--ocr-red-600': '#C03838', // hover on light
  '--ocr-broadcast-500': '#FF4136', // OW on-air red — see semantic.ts OPEN QUESTION
} as const;

/**
 * Type families. No webfont: a system stack ships zero bytes, and the public
 * mobile budget (60 KB total, critical path) is not big enough to spend 15-30 KB
 * on a face nobody asked for. If a display face is ever adopted it is added
 * here and self-hosted — never a CDN link (hard constraint §2.4).
 */
export const family = {
  '--ocr-font-sans':
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  '--ocr-font-mono': "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
} as const;

/**
 * Type scale — 9 steps on a 16px base, ratio easing from ~1.125 through body to
 * ~1.33 at the display end. Replaces the ~18 ad-hoc sizes found across the OSE
 * templates. Surfaces do not add steps; they multiply the whole scale (see
 * surface.ts), so a TV heading is the same step as a phone heading, larger.
 */
export const size = {
  '--ocr-size-0': '0.75rem', // 12
  '--ocr-size-1': '0.875rem', // 14
  '--ocr-size-2': '1rem', // 16 — base
  '--ocr-size-3': '1.125rem', // 18
  '--ocr-size-4': '1.375rem', // 22
  '--ocr-size-5': '1.75rem', // 28
  '--ocr-size-6': '2.25rem', // 36
  '--ocr-size-7': '3rem', // 48
  '--ocr-size-8': '4rem', // 64
} as const;

/** Line heights. Tight for display, open for body — set with the step, not ad hoc. */
export const leading = {
  '--ocr-leading-tight': '1.1',
  '--ocr-leading-snug': '1.3',
  '--ocr-leading-normal': '1.5',
  '--ocr-leading-loose': '1.7',
} as const;

/**
 * Space scale — 4px base. These nine steps are the rhythm already dominant in
 * the shipped templates (0.5 / 0.75 / 1 / 1.25 / 1.5 / 2 / 3rem); this makes it
 * explicit and drops the strays (0.15rem, 0.35rem, 0.6rem).
 */
export const space = {
  '--ocr-space-1': '4px',
  '--ocr-space-2': '8px',
  '--ocr-space-3': '12px',
  '--ocr-space-4': '16px',
  '--ocr-space-5': '24px',
  '--ocr-space-6': '32px',
  '--ocr-space-7': '48px',
  '--ocr-space-8': '64px',
  '--ocr-space-9': '96px',
} as const;

/** Radius, border, elevation, z-index, motion, breakpoints, touch targets. */
export const shape = {
  '--ocr-radius-0': '0',
  '--ocr-radius-1': '4px',
  '--ocr-radius-2': '8px',
  '--ocr-radius-3': '12px',
  '--ocr-radius-pill': '999px',
  '--ocr-border-1': '1px',
  '--ocr-border-2': '2px',
  '--ocr-border-3': '3px',
} as const;

/**
 * Elevation. Deliberately three steps and deliberately restrained — §13 rejects
 * "identical rounded cards with the same soft grey shadow for every kind of
 * content". Most surfaces should use elevation-0 and a border.
 */
export const elevation = {
  '--ocr-elevation-0': 'none',
  '--ocr-elevation-1': '0 1px 2px rgb(0 0 0 / 0.08)',
  '--ocr-elevation-2': '0 4px 12px rgb(0 0 0 / 0.12)',
} as const;

/** Z-index layers. Named so nothing ever needs a `z-index: 9999`. */
export const layer = {
  '--ocr-layer-base': '0',
  '--ocr-layer-raised': '10',
  '--ocr-layer-sticky': '20',
  '--ocr-layer-overlay': '30',
  '--ocr-layer-modal': '40',
  '--ocr-layer-toast': '50',
} as const;

/** Motion. Every duration is paired with prefers-reduced-motion in the reset. */
export const motion = {
  '--ocr-duration-0': '0ms',
  '--ocr-duration-1': '120ms',
  '--ocr-duration-2': '200ms',
  '--ocr-duration-3': '320ms',
  '--ocr-ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
  '--ocr-ease-in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
} as const;

/**
 * Touch targets. 44px is the WCAG floor; 48px is the fleet default; 56px is the
 * public page, which is used standing up, outdoors, one-handed (§3.5).
 */
export const target = {
  '--ocr-target-min': '44px',
  '--ocr-target-default': '48px',
  '--ocr-target-public': '56px',
} as const;

/** Breakpoints. Emitted to JSON for tooling; CSS uses them in media queries. */
export const breakpoint = {
  '--ocr-bp-sm': '480px',
  '--ocr-bp-md': '768px',
  '--ocr-bp-lg': '1024px',
  '--ocr-bp-xl': '1440px',
  '--ocr-bp-tv': '1920px',
} as const;

/** Every Tier 1 token, one object. */
export const primitives = {
  ...navy,
  ...carbon,
  ...paper,
  ...signal,
  ...ember,
  ...status,
  ...family,
  ...size,
  ...leading,
  ...space,
  ...shape,
  ...elevation,
  ...layer,
  ...motion,
  ...target,
  ...breakpoint,
} as const;

export type PrimitiveName = keyof typeof primitives;
