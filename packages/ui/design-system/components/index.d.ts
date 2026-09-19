/**
 * ourSharedEvents — component signatures.
 *
 * NATIVE JS. There is no framework layer. Every component below is a function in
 * `packages/ui/src/partials.ts` that returns an HTML string, styled by the class
 * vocabulary in `bundle.css` / `src/styles.ts`.
 *
 * The React layer was removed on 2026-09-19: it had no consumers, react-dom was never
 * installed so it could not be rendered, and its tests asserted `typeof X === 'function'`
 * and nothing else. `partials.ts` has 32 tests asserting real rendered HTML including XSS
 * escaping, because a string is assertable with no renderer, no DOM and no browser.
 *
 * Every interpolation point goes through `esc()` / `escUrl()`. `escUrl` rejects
 * `javascript:` and `data:`. Never build markup by concatenation outside these functions.
 */

/** A UEC v1.1 category. Hue and glyph together carry the meaning — never hue alone. */
export type UecCategory =
  | 'enter' | 'live' | 'alert' | 'staff' | 'help'
  | 'feedback' | 'sponsor' | 'archive' | 'shop' | 'utility';
// 'enter' absorbed the former 'checkin': arriving and being counted are one event.

export interface NavItem {
  href: string;
  /** Always present — a glyph never travels without its word. */
  label: string;
  icon?: string;
  active?: boolean;
}

/** Sticky top chrome. One h1 per screen. Omit `live` where the distinction is meaningless. */
export declare function header(opts: { title: string; live?: boolean }): string;

/** Fixed thumb-zone nav. Four or five items; six is too many to hit reliably. */
export declare function bottomNav(items: NavItem[]): string;

/** `primary` is 56px and 18px/700. `danger` is destructive only. The label names the outcome. */
export declare function button(o: {
  label: string;
  href?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  block?: boolean;
  disabled?: boolean;
}): string;

export declare function card(inner: { title?: string; sub?: string; body?: string }): string;

/** Says what is happening, not that something is happening. */
export declare function loading(label?: string): string;

/** Title, reason, next step. An empty state without an action is a dead end. */
export declare function emptyState(o: {
  icon?: string;
  title: string;
  message: string;
  action?: { label: string; href: string };
}): string;

/** A gate is a direction, not an error. There is no status code in this vocabulary. */
export declare function accessDenied(o?: {
  what?: string;
  action?: { label: string; href: string };
}): string;

/** Shared by every field: the hint shows before the mistake, the error after blur. */
interface FieldBase {
  id: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  /** Renders under the label immediately. "Why we ask: it sets your corridor." */
  hint?: string;
  /** Three parts: what happened, why, what to do. Never a code. 16px — never the smallest text. */
  error?: string;
}

/** 16px text, always: below that iOS zooms on focus and an older reader loses their place. */
export declare function formInput(o: FieldBase & {
  type?: string;
  placeholder?: string;
  value?: string;
}): string;

export declare function textarea(o: FieldBase & {
  placeholder?: string;
  value?: string;
  rows?: number;
}): string;

export interface SelectOption { value: string; label: string; selected?: boolean }

/** Ordered by likelihood, not alphabet. Pre-select the likely answer. */
export declare function formSelect(o: FieldBase & { options: SelectOption[] }): string;

/** The whole label row is the 48px target — never just the box. */
export declare function checkbox(o: {
  id: string;
  label: string;
  name?: string;
  value?: string;
  checked?: boolean;
  required?: boolean;
  disabled?: boolean;
}): string;

export interface RadioOption { value: string; label: string; checked?: boolean; disabled?: boolean }

/** Two to four options, all visible. The legend is the question. */
export declare function radioGroup(o: {
  name: string;
  legend: string;
  options: RadioOption[];
  required?: boolean;
  error?: string;
}): string;

export declare function formGroup(o: {
  legend: string;
  required?: boolean;
  body: string;
}): string;

/** The full document shell. */
export declare function page(o: {
  title: string;
  body: string;
  brand?: string;
  theme?: 'dark' | 'light';
}): string;
