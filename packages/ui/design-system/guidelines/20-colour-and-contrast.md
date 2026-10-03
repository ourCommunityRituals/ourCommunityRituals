# Colour: fills, inks and lines

## The one rule

**A token is either a ground or something you read. Never both.** Everything else in this palette follows from that.

The two jobs have different requirements. A ground needs 3:1 against what surrounds it so you can see where it starts. Text needs 4.5:1 to meet AA, and **AA is the floor everywhere** — every product, brand and white-label page, decided 2026-09-29 for uniformity. It is a floor, not a target: contrast sensitivity falls with age and this product is used outdoors, so a role that clears it comfortably is better than one that scrapes past. One token cannot satisfy both without either washing out the brand or failing the reader.

| Family | Roles | Target |
|---|---|---|
| **FILL** | `--accent` `--accent-hover` `--live` `--danger` `--danger-hover` `--warn` `--success` | 3:1 vs surroundings |
| **INK** | `--text` `--text-muted` `--accent-text` `--live-text` `--warn-text` `--error` `--info` `--on-accent` | **4.5:1 (AA)** on every ground, `--surface-hover` included |
| **LINE** | `--border` (decorative) · `--border-strong` (meaningful) · `--focus-ring` | 3:1 for the latter two |
| **GROUND** | `--bg` `--surface` `--surface-hover` `--card` | — |

So `--accent` is the ground under a primary button and the fill of a progress bar — #52A6FF in dark (the CARTO signature #1785FB, read one step lighter so it also works as text on dark cards) and #0000EE in light, the default web link blue. A link, a stat value or an active nav label uses `--accent-text`. The brand keeps its blue; the type stays readable.

## What was failing before the split

Measured against `--surface`, not `--bg`:

```
--accent      #1785FB   4.11:1   under AA
--danger      #E05252   3.90:1   under AA
--text-muted  #7A94B0   4.75:1   under AA once hovered (4.04:1)
```

`tests/tokens.test.ts:69-70` *does* assert one pair against `--surface` — body text. Every
other foreground is checked against `--bg` only, and `--surface-hover` is never a ground in
any assertion in `tokens.test.ts`, `theme-swap.test.ts` or `scripts/verify-contrast.mjs`.
So the three roles that fail are exactly the three the suite does not measure.

Structure was worse. Every neutral step in the dark theme:

```
surface vs bg        1.20:1        border vs bg        1.63:1
hover   vs surface   1.18:1        border vs surface   1.36:1
```

WCAG 1.4.11 asks for 3:1 on anything that identifies a control. Nothing reached 2:1. With no shadows in the system, the border is the only separator there is — so `--border-strong` (3.01:1 on `--surface`, 3.60:1 on `--bg`) was added to carry every boundary that means something, and `--border` was demoted to decoration.

## Hover is an outline, not a tint

`--surface-hover` lifts the ground by only 1.18:1 — barely visible — and on touch there is no hover at all. So hover and focus draw a `--border-strong` outline instead. It reads at a glance, it works on a phone as a pressed state, and it never moves the ground under the text.

`--surface-hover` survives as a *pressed and selected* ground. Every text and status role still clears AA on it, so a hovered row never drops below the floor.

## --on-accent flips per theme

```
dark   navy #0F1824 on #52A6FF   7.02:1        (and 7.14:1 on the #F08585 danger fill)
light  white on #0000EE          9.40:1        (and 6.34:1 on the #B03030 danger fill)
```

`.btn-primary` and `.btn-danger` read `var(--on-accent)`; never hardcode a label colour on a fill. Both themes clear AA at any label size, so the primary button does not depend on being large text to pass.

## Status is never colour alone

Live is **teal**, danger is **red**. Red versus green is never a semantic pair in this system — roughly 1 in 12 men cannot separate them. Amber warns.

Every status also carries a word: the live indicator reads "LIVE" or "OFFLINE", not a bare dot. Every error carries text and `role="alert"`. Every map category carries a glyph as well as a hue.

## The three tiers

Unchanged from `@ocr/ui`:

- **Tier 1 — primitives** (`--ocr-*`). Never referenced by a component. Each is tagged FILL, INK, LINE or GROUND in its usage note.
- **Tier 2 — semantic roles.** What every component consumes. Nothing hard-codes a hex.
- **Tier 3 — brands.** One `[data-brand="x"]` block re-maps roles. A brand may re-map
  `--accent` and `--accent-text`; it may **never** touch `--uec-*`, and any re-mapped ink must
  still clear AA (4.5:1) on every ground — `checkBrandContrast()` refuses a brand that doesn't. Structure never changes — a brand changes hue,
  never layout, spacing or type. Brain §11: *"Brand affects chrome only — UEC hues never
  re-theme."*

  **`[data-brand="ow"]` is the real one.** Brain §11 states ourWKRP's identity as
  **amber-on-black**, against OSE's navy/blue. Verified values, all at least AA on their own grounds:

  | Role | Value | On OW `--bg` | On OW `--surface` |
  |---|---|---|---|
  | `--bg` | `#0b0b0b` | — | — |
  | `--surface` | `#322e27` | 1.46:1 | — |
  | `--text` | `#f0ede8` | 16.86:1 | 11.56:1 |
  | `--text-muted` | `#bfbab4` | 10.21:1 | 7.01:1 |
  | `--accent` (fill) | `#d4954b` | black on it: 8.20:1 | — |
  | `--accent-text` (ink) | `#e0b37d` | 10.23:1 | 7.02:1 |
  | `--border-strong` | `#807668` | 4.41:1 | 3.03:1 |

  One caveat worth knowing: `tests/tokens.test.ts` asserts `#D4954B` is absent from the
  **primitives** ("accent is CARTO blue, not legacy amber"). That assertion is about Tier 1
  and OSE's accent. A Tier 3 block re-maps semantic roles and introduces no `--ocr-*`
  primitive, so it does not trip it — but anyone adding amber to `tokens.ts` will.

Dark is the default: the dark roles sit on bare `:root`, with light arriving via `prefers-color-scheme` or `data-theme="light"`. Force either with `data-theme`.
