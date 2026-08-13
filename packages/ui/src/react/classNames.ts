/**
 * Shared Tailwind class fragments for @ocr/ui React form controls.
 *
 * Single source of truth for the a11y-critical utilities (focus ring, field
 * chrome) that would otherwise be copy-pasted across every control and drift
 * out of sync. Utility classes are order-independent, so components compose
 * these with their own extras (`resize-y`, `appearance-none`, border variant).
 */

/** Focus ring shared by every focusable form control (offset-1 against the page bg). */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg';

/** Common chrome for text inputs, textareas, and selects. Append per-control extras. */
export const FIELD_BASE =
  'w-full px-3 py-2.5 rounded-sm border font-sans text-sm text-text bg-surface transition-colors ' +
  `${FOCUS_RING} disabled:opacity-40 disabled:cursor-not-allowed`;

/** Base for the native checkbox/radio input box (checkbox adds `rounded-sm`). */
export const OPTION_CONTROL =
  `w-4 h-4 border border-border bg-surface accent-accent ${FOCUS_RING}`;

/** Class for the clickable label wrapping a checkbox/radio option. */
export function optionLabelClass(disabled?: boolean): string {
  return (
    'inline-flex items-center gap-2.5 text-sm text-text cursor-pointer ' +
    (disabled ? 'opacity-40 cursor-not-allowed' : '')
  );
}
