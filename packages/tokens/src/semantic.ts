/**
 * @ocr/tokens — Tier 2: semantics
 *
 * A semantic token names a ROLE and resolves to a Tier 1 primitive. Components
 * consume this tier and never Tier 1, so repainting the fleet is a change here
 * and nowhere else.
 *
 * TWO AXES, ORTHOGONAL
 * ────────────────────────────────────────────────────────────────────────────
 *   [data-brand]    changes PAINT ONLY   — which primitive a role resolves to
 *   [data-surface]  changes SCALE ONLY   — type and space multipliers (surface.ts)
 * A brand may not change scale and a surface may not change paint. Held to by
 * construction: this file emits no size/space values, surface.ts emits no colors.
 *
 * THE BRAND CONTRACT (ourAirwaves, Wave 2)
 * ────────────────────────────────────────────────────────────────────────────
 * OA lets clients — theatres, bars, schools, artists — paint their own site. So
 * a brand is not a hardcoded registry entry; it is untrusted input arriving at
 * runtime. That makes three things load-bearing:
 *
 *   1. BRAND_OVERRIDABLE is a CLOSED set. Anything outside it is rejected, so a
 *      client cannot reach structure, spacing, or the UEC palette.
 *   2. Both modes are REQUIRED. One flat --action clears AA on one ground and
 *      fails on the other; a dark ground wants a lighter action, a light ground
 *      wants a darker one. validateBrand() rejects a half-specified theme.
 *   3. AA is ENFORCED, not documented. A client who picks yellow-on-white gets a
 *      rejection with the measured ratio, not a shipped inaccessible site.
 *
 * OPEN QUESTION — --status-live in OW  (tracked in §15, not decided here)
 * ────────────────────────────────────────────────────────────────────────────
 * OSE uses teal for live because red/green as semantic opposites is the primary
 * colorblind failure. OW ships #FF4136 red for on-air, which is 80 years of
 * broadcast convention and what a DJ expects to see. Both are defensible and it
 * is a product call, not an engineering one. Encoded as a per-brand semantic so
 * either answer is a one-line change; OW currently keeps its shipped red.
 */

import { contrastRatio } from './contrast.js';

/**
 * The closed role vocabulary. Every role appears in every brand, in both modes —
 * a brand that omits one is rejected, so a component can never resolve to
 * `undefined` at runtime.
 */
export const SEMANTIC_ROLES = [
  '--ground',
  '--surface',
  '--surface-raised',
  '--border',
  '--text',
  '--text-muted',
  '--action',
  '--action-hover',
  '--on-action',
  '--status-live',
  '--status-warn',
  '--status-danger',
  '--status-danger-hover',
  '--focus-ring',
] as const;

export type SemanticRole = (typeof SEMANTIC_ROLES)[number];
export type RoleMap = Record<SemanticRole, string>;

/** A brand supplies both modes. Neither is optional — see note 2 above. */
export interface BrandTheme {
  dark: RoleMap;
  light: RoleMap;
}

// ── ose — the base layer (Wave 1) ────────────────────────────────────────────

const oseDark: RoleMap = {
  '--ground': 'var(--ocr-navy-950)',
  '--surface': 'var(--ocr-navy-900)',
  '--surface-raised': 'var(--ocr-navy-800)',
  '--border': 'var(--ocr-navy-700)',
  '--text': 'var(--ocr-navy-100)',
  '--text-muted': 'var(--ocr-navy-500)',
  '--action': 'var(--ocr-signal-500)',
  '--action-hover': 'var(--ocr-signal-600)',
  '--on-action': 'var(--ocr-navy-950)',
  '--status-live': 'var(--ocr-teal-400)',
  '--status-warn': 'var(--ocr-warn-400)',
  '--status-danger': 'var(--ocr-red-500)',
  '--status-danger-hover': 'var(--ocr-red-400)',
  '--focus-ring': 'var(--ocr-signal-500)',
};

const oseLight: RoleMap = {
  '--ground': 'var(--ocr-paper-050)',
  '--surface': 'var(--ocr-paper-100)',
  '--surface-raised': 'var(--ocr-paper-200)',
  '--border': 'var(--ocr-paper-200)',
  '--text': 'var(--ocr-ink-900)',
  '--text-muted': 'var(--ocr-ink-500)',
  '--action': 'var(--ocr-signal-700)',
  '--action-hover': 'var(--ocr-signal-400)',
  '--on-action': 'var(--ocr-paper-100)',
  '--status-live': 'var(--ocr-teal-700)',
  '--status-warn': 'var(--ocr-warn-700)',
  '--status-danger': 'var(--ocr-red-700)',
  '--status-danger-hover': 'var(--ocr-red-600)',
  '--focus-ring': 'var(--ocr-signal-700)',
};

// ── ow — Wave 1 alongside OSE. Carbon ground, amber action, broadcast red. ────

const owDark: RoleMap = {
  '--ground': 'var(--ocr-carbon-950)',
  '--surface': 'var(--ocr-carbon-900)',
  '--surface-raised': 'var(--ocr-carbon-800)',
  '--border': 'var(--ocr-carbon-700)',
  '--text': 'var(--ocr-carbon-100)',
  '--text-muted': 'var(--ocr-carbon-500)',
  '--action': 'var(--ocr-ember-600)',
  '--action-hover': 'var(--ocr-ember-500)',
  '--on-action': 'var(--ocr-carbon-950)',
  '--status-live': 'var(--ocr-broadcast-500)', // OPEN QUESTION — see header
  '--status-warn': 'var(--ocr-warn-400)',
  '--status-danger': 'var(--ocr-red-500)',
  '--status-danger-hover': 'var(--ocr-red-400)',
  '--focus-ring': 'var(--ocr-ember-600)',
};

const owLight: RoleMap = {
  '--ground': 'var(--ocr-paper-050)',
  '--surface': 'var(--ocr-paper-100)',
  '--surface-raised': 'var(--ocr-paper-200)',
  '--border': 'var(--ocr-paper-200)',
  '--text': 'var(--ocr-ink-900)',
  '--text-muted': 'var(--ocr-ink-500)',
  '--action': 'var(--ocr-ember-800)',
  '--action-hover': 'var(--ocr-ember-800)',
  '--on-action': 'var(--ocr-paper-100)',
  '--status-live': 'var(--ocr-red-700)', // the AA-safe light-ground pair for broadcast red
  '--status-warn': 'var(--ocr-warn-700)',
  '--status-danger': 'var(--ocr-red-700)',
  '--status-danger-hover': 'var(--ocr-red-600)',
  '--focus-ring': 'var(--ocr-ember-800)',
};

/** Built-in brands. OA clients supply their own at runtime; these are not a registry to grow. */
export const brands: Record<string, BrandTheme> = {
  ose: { dark: oseDark, light: oseLight },
  ow: { dark: owDark, light: owLight },
};

/** `ose` is the base layer — an unknown or absent brand inherits it. */
export const DEFAULT_BRAND = 'ose';

// ── Brand validation (the OA seam) ───────────────────────────────────────────

/**
 * What a client may repaint. Deliberately excludes --status-danger: destructive
 * actions read the same in every skin, because a client cannot be allowed to
 * make "delete everything" look calm.
 */
export const BRAND_OVERRIDABLE: readonly SemanticRole[] = [
  '--ground',
  '--surface',
  '--surface-raised',
  '--border',
  '--text',
  '--text-muted',
  '--action',
  '--action-hover',
  '--on-action',
  '--focus-ring',
] as const;

/** Pairs that must clear WCAG AA, as [foreground, background, minimum ratio]. */
const AA_PAIRS: ReadonlyArray<[SemanticRole, SemanticRole, number]> = [
  ['--text', '--ground', 4.5],
  ['--text', '--surface', 4.5],
  ['--text-muted', '--ground', 4.5],
  ['--action', '--ground', 4.5],
  ['--on-action', '--action', 4.5],
  ['--focus-ring', '--ground', 3.0],
];

export interface BrandViolation {
  mode: 'dark' | 'light' | 'both';
  role: string;
  reason: string;
}

/**
 * Validate a client-supplied brand. Returns every violation rather than the
 * first, so OA can show one complete list instead of a whack-a-mole loop.
 *
 * Values must be literal hex here, not `var(...)` — a client picks colors, not
 * primitives, and contrast cannot be measured through an indirection.
 */
export function validateBrand(theme: Partial<BrandTheme>): BrandViolation[] {
  const out: BrandViolation[] = [];

  for (const mode of ['dark', 'light'] as const) {
    const map = theme[mode];
    if (!map) {
      out.push({ mode, role: '*', reason: `Missing the "${mode}" mode. Both are required.` });
      continue;
    }

    for (const role of Object.keys(map)) {
      if (!BRAND_OVERRIDABLE.includes(role as SemanticRole)) {
        out.push({ mode, role, reason: `"${role}" is not client-overridable.` });
      }
    }

    for (const role of BRAND_OVERRIDABLE) {
      const v = map[role];
      if (!v) {
        out.push({ mode, role, reason: `Missing "${role}".` });
      } else if (!/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(v.trim())) {
        out.push({ mode, role, reason: `"${v}" is not a hex color.` });
      }
    }

    for (const [fg, bg, min] of AA_PAIRS) {
      const a = map[fg];
      const b = map[bg];
      if (!a || !b) continue;
      const ratio = contrastRatio(a, b);
      if (ratio < min) {
        out.push({
          mode,
          role: fg,
          reason: `${fg} on ${bg} is ${ratio.toFixed(2)}:1, below the ${min}:1 minimum.`,
        });
      }
    }
  }

  return out;
}
