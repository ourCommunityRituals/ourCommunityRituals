# FormInput

A labelled text input with a hint, an error and the wiring that connects them.

**Use it for** every single-line value. `type` covers email, tel, url, date and number.

## Rules

- **16px text, always.** Below 16px iOS zooms the page on focus, and a surprise zoom is the most common way an older user loses their place in a form. `@ocr/ui` already used 16px on `.search-bar` and `.sort-select` for exactly this reason; here it is the rule.
- **Hints come before the mistake, not after.** `hint` renders under the label as soon as the field appears — "Why we ask: it sets your corridor." A hint that only shows up after a failure is a reprimand.
- **Never validate while someone types.** Validate on blur and again on submit. An error appearing mid-word reads as "you are doing this wrong" and makes hesitant typists delete correct input.
- **The error line reserves its space** (`min-height: 1.45em`) so nothing shifts when it appears.
- Errors are 16px/600 in `--error` — the same size as body text. The person reading an error already made a mistake and needs it most; it is never the smallest text on the screen.
- Error text has three parts: what happened, why, what to do. "That email is missing its ending — try hello@maplefair.org." No codes, no blame, no apology.
- The label is a question a neighbour would ask — "Where is it?" — not a database column.
- Never use a placeholder as the label. It disappears exactly when it is needed.

## Accessibility

`aria-describedby` points at the hint, or at the error when one is present. `aria-invalid` is set on error, and the error node carries `role="alert"`. The input's `id` is also its `name`.

## Props

`id` · `label` · `type` · `placeholder` · `value` · `required` · `disabled` · `hint` · `error` · `onChange`
