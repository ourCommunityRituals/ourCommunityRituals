/**
 * @ocr/tokens — surface adaptation
 *
 * A surface changes SCALE, never paint. `[data-surface="tv"]` multiplies the
 * type and space scales; it does not redefine a single color. That is what makes
 * the five presentations one design system instead of five forks — and it is why
 * this file exports no color tokens at all. The constraint is structural, and
 * tests/axes.test.ts asserts it.
 *
 * Multipliers are applied to the Tier 1 scale via calc(), so a surface never
 * enumerates sizes. Adding a scale step upstream automatically reaches every
 * surface at the right size.
 */

export interface SurfaceScale {
  /** Multiplier on the type scale. */
  type: number;
  /** Multiplier on the space scale. */
  space: number;
  /** Minimum touch target for the surface. */
  target: string;
  /** Why this surface scales the way it does. */
  rationale: string;
}

export const surfaces: Record<string, SurfaceScale> = {
  /** Consoles — the reference scale. Everything else is stated relative to this. */
  console: {
    type: 1,
    space: 1,
    target: 'var(--ocr-target-default)',
    rationale: 'Desk use, mouse and keyboard, dense data. The baseline.',
  },

  /**
   * Public mobile — read standing up, outdoors, one-handed, possibly on a
   * five-year-old Android. Slightly larger type and notably larger targets;
   * space stays near baseline so the fold still reaches the event.
   */
  public: {
    type: 1.06,
    space: 1,
    target: 'var(--ocr-target-public)',
    rationale: 'Standing, outdoors, one-handed. Bigger targets matter more than bigger type.',
  },

  /**
   * TV — a 10-foot UI. 1920x1080 baseline; must hold at 4K and on a 720p
   * hotel panel. 2.2x is the point where a 16px base clears legibility across
   * a hall without the layout needing a second set of breakpoints.
   */
  tv: {
    type: 2.2,
    space: 1.8,
    target: 'var(--ocr-target-default)',
    rationale: 'Ten feet away across a hall. Zero interaction, so targets are irrelevant.',
  },

  /**
   * Poster — print. Scale is near-baseline because print resolution is not the
   * constraint; the constraint is that day-and-time out-sizes everything else
   * and the QR survives a photocopy. Those are component decisions, not scale.
   */
  poster: {
    type: 1,
    space: 1,
    target: 'var(--ocr-target-min)',
    rationale: 'Print. Hierarchy does the work here, not a scale multiplier.',
  },
};

/** The reference surface — an element with no [data-surface] gets this. */
export const DEFAULT_SURFACE = 'console';
