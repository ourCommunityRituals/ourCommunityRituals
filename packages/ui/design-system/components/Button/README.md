# Button

The one action control in the system, in three variants, and the only element whose label is sized up to 18px/700.

**Use it when** something happens on tap. For navigation that is really a link, pass `href` and it renders an `<a>` that still looks and measures like a button.

## Variants

- `primary` — one per screen. `--accent` fill with `--on-accent` text, 56px tall (`--tap-min-primary`). The label is 18px/700, which is what lets black on the CARTO blue clear AAA for large text at 5.78:1.
- `secondary` — `--surface` with a `--border-strong` edge. 16px/600.
- `danger` — destructive only. Never sits beside a primary action, and carries 24px of clear space.

## Rules

- **The label names the outcome.** "Make the poster", "Send the invite", "Take it down". Never "Submit", "OK", or a bare "Continue" — an older reader needs to know what the next screen will be before they commit to it.
- Sentence case, always.
- Never icon-only. A glyph may precede the word; it may not replace it.
- Disabled is 50% opacity and `cursor:not-allowed`. Prefer *not* rendering a button to disabling one — a disabled control with no explanation reads as a dead end.
- `--tap-gap` (12px) of clear space from the next target, 24px around `danger`.

## The consumer provides

`onClick` or `href`, and the label as `children` or `label`. Nothing else is required.

## Props

`children` · `label` · `href` · `variant` ('primary' | 'secondary' | 'danger') · `block` · `disabled` · `type` · `onClick` · `className`
