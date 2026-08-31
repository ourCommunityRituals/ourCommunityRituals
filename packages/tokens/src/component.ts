/**
 * @ocr/tokens — Tier 3: component tokens
 *
 * A component token names a COMPONENT PROPERTY and resolves to Tier 2. This is
 * the tier component CSS is allowed to reference, and the only one — which is
 * what lets check-raw-values.mjs be a simple, honest grep: any hex or px inside
 * a component stylesheet is a bug, because a legitimate value has a name here.
 *
 * These are shared across the fleet because they describe SHAPE, not content.
 * A component that exists in one app only — OW's track card, OSE's sponsor
 * rotation slot — declares its tokens in that app, not here. Putting app
 * components in the shared layer is what forked @ocr/ui in the first place:
 * .track-card and .genre-popup are in the fleet stylesheet today and belong
 * to exactly one consumer.
 */

/** Buttons. Every variant meets the surface's touch target. */
export const button = {
  '--button-height': 'var(--ocr-target-default)',
  '--button-padding-x': 'var(--ocr-space-5)',
  '--button-padding-y': 'var(--ocr-space-3)',
  '--button-radius': 'var(--ocr-radius-2)',
  '--button-font-size': 'var(--ocr-size-2)',
  '--button-gap': 'var(--ocr-space-2)',
  '--button-primary-bg': 'var(--action)',
  '--button-primary-fg': 'var(--on-action)',
  '--button-primary-bg-hover': 'var(--action-hover)',
  '--button-secondary-bg': 'var(--surface)',
  '--button-secondary-fg': 'var(--text)',
  '--button-secondary-border': 'var(--border)',
  '--button-danger-bg': 'var(--status-danger)',
  '--button-danger-fg': 'var(--ocr-paper-100)',
  '--button-disabled-opacity': '0.4',
} as const;

/** Text inputs, selects, textareas. 16px floor prevents iOS zoom-on-focus. */
export const field = {
  '--field-height': 'var(--ocr-target-default)',
  '--field-padding-x': 'var(--ocr-space-3)',
  '--field-padding-y': 'var(--ocr-space-3)',
  '--field-radius': 'var(--ocr-radius-2)',
  '--field-font-size': 'var(--ocr-size-2)',
  '--field-bg': 'var(--surface)',
  '--field-fg': 'var(--text)',
  '--field-border': 'var(--border)',
  '--field-border-focus': 'var(--action)',
  '--field-placeholder': 'var(--text-muted)',
  '--field-label-size': 'var(--ocr-size-1)',
  '--field-label-fg': 'var(--text-muted)',
  '--field-invalid-border': 'var(--status-danger)',
  '--field-invalid-fg': 'var(--status-danger)',
} as const;

/**
 * Cards. Border by default, elevation-0 — §13 rejects the identical-soft-shadow
 * card used for every kind of content. A card that needs lift opts in.
 */
export const card = {
  '--card-bg': 'var(--surface)',
  '--card-border': 'var(--border)',
  '--card-border-width': 'var(--ocr-border-1)',
  '--card-radius': 'var(--ocr-radius-2)',
  '--card-padding': 'var(--ocr-space-4)',
  '--card-gap': 'var(--ocr-space-3)',
  '--card-elevation': 'var(--ocr-elevation-0)',
} as const;

/** Tables — the event list and the report both live here. */
export const table = {
  '--table-row-height': 'var(--ocr-target-default)',
  '--table-cell-padding-x': 'var(--ocr-space-3)',
  '--table-cell-padding-y': 'var(--ocr-space-3)',
  '--table-border': 'var(--border)',
  '--table-header-fg': 'var(--text-muted)',
  '--table-header-size': 'var(--ocr-size-1)',
  '--table-row-hover-bg': 'var(--surface-raised)',
  '--table-numeric-font': 'var(--ocr-font-mono)',
} as const;

/**
 * Status regions — the [data-state] containers §8 requires. Skeletons, not
 * spinners: a skeleton tells the truth about what is arriving, a spinner
 * says only "wait" (§13).
 */
export const statusRegion = {
  '--status-region-min-height': 'var(--ocr-space-9)',
  '--skeleton-bg': 'var(--surface-raised)',
  '--skeleton-radius': 'var(--ocr-radius-1)',
  '--skeleton-duration': 'var(--ocr-duration-3)',
  '--empty-padding': 'var(--ocr-space-7)',
  '--empty-title-size': 'var(--ocr-size-4)',
  '--empty-body-size': 'var(--ocr-size-2)',
  '--empty-body-fg': 'var(--text-muted)',
  '--empty-measure': '34ch',
  '--error-bg': 'var(--surface)',
  '--error-border': 'var(--status-danger)',
  '--error-fg': 'var(--status-danger)',
  '--error-padding': 'var(--ocr-space-4)',
} as const;

/**
 * Disclosure — the Wizard / Deep Dive seam.
 *
 * The two event-manager modes are ONE flow at two disclosure depths, not two
 * flows. Same steps, same order, same words; Wizard keeps the option panels
 * closed behind a deterministic default, Deep Dive opens them. That is why
 * these are tokens rather than two component sets — a mode switch changes what
 * is revealed, never what exists.
 *
 * The default summary line is load-bearing: in Wizard it is the only thing the
 * user reads, so it must state the chosen value AND the rule that chose it
 * ("Doors at 7:00 PM — same as your last event here"). Under §2.7 that rule is
 * always deterministic and statable in one sentence, never a ranked guess.
 */
export const disclosure = {
  '--disclosure-summary-min-height': 'var(--ocr-target-default)',
  '--disclosure-summary-padding-y': 'var(--ocr-space-3)',
  '--disclosure-summary-padding-x': 'var(--ocr-space-4)',
  '--disclosure-summary-size': 'var(--ocr-size-2)',
  '--disclosure-summary-fg': 'var(--text)',
  '--disclosure-rule-size': 'var(--ocr-size-1)',
  '--disclosure-rule-fg': 'var(--text-muted)',
  '--disclosure-marker-size': 'var(--ocr-size-2)',
  '--disclosure-panel-padding': 'var(--ocr-space-4)',
  '--disclosure-panel-bg': 'var(--surface)',
  '--disclosure-panel-border': 'var(--border)',
  '--disclosure-panel-radius': 'var(--ocr-radius-2)',
  '--disclosure-edited-marker': 'var(--status-warn)',
  '--disclosure-step-gap': 'var(--ocr-space-5)',
  '--disclosure-duration': 'var(--ocr-duration-2)',
} as const;

/** Focus. One visible treatment, everywhere, never removed (§9). */
export const focus = {
  '--focus-width': 'var(--ocr-border-3)',
  '--focus-offset': 'var(--ocr-border-2)',
  '--focus-color': 'var(--focus-ring)',
  '--focus-radius': 'var(--ocr-radius-1)',
} as const;

/**
 * SharedReport. One component, two token-scoped views (§4). Sponsor and event
 * manager sit side by side comparing screens, so a figure that is the same
 * figure must LOOK like the same figure — hence a shared figure treatment
 * rather than per-view styling.
 */
export const report = {
  '--report-row-border': 'var(--border)',
  '--report-row-padding-y': 'var(--ocr-space-3)',
  '--report-figure-size': 'var(--ocr-size-6)',
  '--report-figure-font': 'var(--ocr-font-mono)',
  '--report-figure-fg': 'var(--text)',
  '--report-label-size': 'var(--ocr-size-1)',
  '--report-label-fg': 'var(--text-muted)',
  '--report-shared-figure-border': 'var(--action)',
  '--report-section-gap': 'var(--ocr-space-6)',
} as const;

/**
 * Poster. Print-first: the QR must scan from a phone at arm's length after a
 * black-and-white photocopy, and day/time out-sizes supporting metadata by
 * default. Sizes are absolute because print units are absolute.
 */
export const poster = {
  '--poster-qr-size': '2.75in',
  '--poster-qr-quiet-zone': '0.25in',
  '--poster-when-size': 'var(--ocr-size-8)',
  '--poster-what-size': 'var(--ocr-size-6)',
  '--poster-meta-size': 'var(--ocr-size-3)',
  '--poster-ink': 'var(--ocr-ink-900)',
  '--poster-stock': 'var(--ocr-paper-100)',
  '--poster-margin': '0.5in',
  '--poster-sponsor-slot-height': '0.9in',
} as const;

/**
 * TV. The rotation slot is UNIFORM by construction — one size for every sponsor,
 * because Invariant #25 makes size and position non-purchasable and only
 * frequency varies. There is deliberately no "featured" or "premium" slot token:
 * one cannot be used if it does not exist.
 */
export const tv = {
  '--tv-safe-inset': '3%',
  '--tv-rotation-slot-height': 'var(--ocr-space-9)',
  '--tv-rotation-slot-gap': 'var(--ocr-space-5)',
  '--tv-headline-size': 'var(--ocr-size-8)',
  '--tv-meta-size': 'var(--ocr-size-5)',
  '--tv-transition-duration': 'var(--ocr-duration-3)',
} as const;

/** Every Tier 3 token, one object. */
export const components = {
  ...button,
  ...field,
  ...card,
  ...table,
  ...statusRegion,
  ...disclosure,
  ...focus,
  ...report,
  ...poster,
  ...tv,
} as const;

export type ComponentTokenName = keyof typeof components;
