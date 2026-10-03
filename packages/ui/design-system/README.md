# ourSharedEvents

**ourSharedEvents (OSE)** is a hyperlocal community-event platform: a free event-and-sponsorship vehicle for public–private partnerships. Organizers create events, generate posters with QR codes and short links, plan poster canvassing on an H3 corridor map, and publish honest SharedReports. Local businesses sponsor events under a strict fairness covenant — **same size, same spots for every sponsor** — so sponsors buy frequency, never prominence. The runtime is deterministic and LLM-free, which is what lets the platform promise free-forever.

This system is extracted from `packages/ui` (`@ocr/ui`) in [ourCommunityRituals/ourCommunityRituals](https://github.com/ourCommunityRituals/ourCommunityRituals) — `tokens.ts`, `styles.ts`, `partials.ts`, `src/react/*` — and then refined. What changed and why is in **Where this differs from @ocr/ui** at the end.

## Who we design for first

Two readers set every value in this system, and neither is the person building it.

**Someone aged 50 to 75, on their own phone, outdoors.** Anyone under 50 has had a phone their whole adult life and will find their way through almost anything. The people who most need a community platform to work are the ones who did not grow up with one. They will tap the wrong thing. They will not know what a term means the first time. They will lose their place if the page moves under them. Designing for them is not a constraint on the design — it *is* the design, and everyone else inherits a calmer product.

**Someone with an ageing eye, in daylight.** Contrast sensitivity falls with age — roughly halved by 60, a third of a young reader's by 75 — and this product lives outdoors, on cheap phones, on venue wifi. So one floor holds everywhere: every piece of text clears **WCAG AA (4.5:1) on every ground it can land on**, and nothing is smaller than **13px**. It is the same floor for every product, brand and white-label page — decided 2026-09-29, for uniformity — and CI refuses anything below it.

Five rules follow, and they are checkable:

1. **One decision per screen.** One primary action, one question at a time. Forms are single-column with one field pattern.
2. **Do the thinking.** Every field that can be pre-filled is pre-filled. Dates offer "this Saturday", not a calendar grid. If the answer can be derived, derive it and show the person what you chose so they can change it.
3. **Mistakes are expected, not punished.** Nothing destructive happens without an undo. Validation waits until the person leaves a field, never while they type. Errors say what to do next, at body size.
4. **Nothing below 13px, controls at 16px.** And error text is never smaller than body text — the person reading it already made a mistake and needs it most.
5. **Colour is never the only signal.** Status carries a word. Map categories carry a glyph. Focus carries a 3px outline.

## One shape, every layer

The product is one structure repeated at six scales — region, corridor, event, site, kiosk, route — and every node in it has the same five things: a public page, a code, a category, a phase, and a map of its children. That is why this component set is small: one `MapDetail` serves every layer because every layer has the same shape.

It is also where the hybrid model lands. **ourSharedEvents** is the anonymous side — any node is reachable by scanning, with no account. **OurWKRP** is the plant-your-flag side — any node can be claimed and spoken from under a chosen name. This system serves both: `@ocr/ui`'s shared stylesheet already carries WKRP's surfaces (`.track-card`, `.now-playing`, `.attr-btn`) alongside the event ones, which is the clearest evidence that one design system was always the intent. Hence the rule that governs every surface here: **every screen works with zero identity, and gets better when identity is present — never the reverse.** An account wall is the most common place a 50–75 reader stops, and the architecture is built so there never has to be one. See `guidelines/80-the-recursive-web.md`.

## Content fundamentals

- **Voice:** plain, warm, neighbourly. Second person — "your poster", "you were invited". The platform says "we" sparingly, mostly as "Why we ask: …".
- **Casing:** sentence case everywhere — buttons, titles, labels. Uppercase only for `.section-title`, status pills and the `.brand` label.
- **Buttons name their outcome.** "Make the poster", "Send the invite", "Take it down". Never "Submit", "OK" or "Continue" on its own.
- **Errors explain and offer a next step.** "That email is missing its ending — try hello@maplefair.org", never "Invalid input" and never an error code.
- **Say why you are asking.** Any field whose purpose is not obvious carries a `.form-hint` before it is touched: "Why we ask: it sets your corridor."
- **Honesty is a copy rule.** Covenant language is verbatim and never softened: "same size, same spots for everyone", "set by your location, not buyable", "locals collectively hold ≥30% of rotation frequency". Reach numbers state their limits: "corridor-level, never person-level".
- **Emoji are functional icons**, not decoration — nav items, empty-state glyphs, UEC map cells (📅 🗺️ 📊 🔒 🤝 🆘). There is no icon font and no SVG icon set; do not add one.
- **Numbers do work.** A statistic appears only where it informs a decision — scans by source, check-ins by hour.

## Visual foundations

### Colour: fills and inks are different roles

This is the rule the whole palette hangs on. **A token is either a ground or something you read. Never both.**

| Family | Examples | Must clear |
|---|---|---|
| **FILL** — grounds, bars, button surfaces | `--accent` `--live` `--danger` `--warn` | 3:1 against what surrounds it |
| **INK** — anything read | `--text` `--text-muted` `--accent-text` `--error` `--live-text` `--warn-text` | **4.5:1 (AA)** on every ground |
| **LINE** — boundaries | `--border` decorative · `--border-strong` meaningful | 3:1 for `--border-strong` (WCAG 1.4.11) |

So the CARTO signature blue stays the brand — `#1785FB` as the primitive, read one step lighter (`#52A6FF`) as the dark-theme fill under a primary button, `#0000EE` (the default web link blue) in light. Links and stat values use `--accent-text` instead. The brand keeps its colour and the type gets legible; before the split, one token had to do both jobs and failed at one of them.

Three tiers, as in `@ocr/ui`: Tier 1 primitives (`--ocr-*`) are never referenced by a component. Tier 2 semantic roles are what everything consumes. Tier 3 client brands re-map roles via `[data-brand="x"]`. Dark is the default; light arrives via `prefers-color-scheme` or `data-theme="light"`.

### Structure: lines, not shadows and not tints

There are no shadows anywhere in this system, and no gradients, imagery or textures. Separation is carried by a line and a radius — so the line has to be visible. `--border` is decorative and reads 1.36:1 on `--surface`; it may never be the only thing marking a control. **`--border-strong` (3:1) marks anything that means something**: input and select edges, checkbox and radio outlines, the toggle track, map cell strokes, the map panel edge, and every hover and focus outline.

Hover no longer lifts the background. A fill lift from `--surface` to `--surface-hover` is 1.18:1 — invisible, and on touch there is no hover at all. Hover and focus draw a `--border-strong` outline instead, which reads at a glance and never moves the ground under the text.

### Type

One system stack, no webfonts, so a poster renders instantly on a cheap phone. The scale is rebased for the 50–75 reader: **controls and body at 16px, error text at 16px, nothing below 13px.** `@ocr/ui` already used 16px on `.search-bar` and `.sort-select` to stop iOS zooming the page on focus — the right value for the wrong reason. It is now the rule, and it also means an older user never loses their place to a surprise zoom.

The primary button label is 18px/700, so the primary action is the biggest label on the screen, which is where it belongs. Its label reads `--on-accent`: navy on the dark fill (7.02:1), white on the light fill (6.30:1) — AA at any size.

### Spacing and targets

Page padding 16–20px, section gap 24px, card padding 16px. Radii 8px (`--radius-sm`, the default), 12px (`--radius`), 20px pill. Exact values — never snap to a different grid.

Tap targets are 48px minimum (`--tap-min`), 56px for the primary action (`--tap-min-primary`). Size alone does not prevent mis-taps: **`--tap-gap` sets 12px of clear space between any two targets**, and a destructive control gets 24px and never sits beside a primary action.

### Motion and focus

Animation is minimal and functional: a 2s pulse on live indicators, a 0.8s spinner, 0.15–0.3s background and width transitions. Nothing moves the page under a reader's finger. Everything honours `prefers-reduced-motion`. Focus is a 3px `--focus-ring` outline at offset 2, `:focus-visible` only — raised from 2px because a thin ring is the first thing a low-vision user loses.

### Imagery

**The product surfaces carry none.** Flat `--bg`, no gradients, no textures, no photography. The QR code (white `.qr-frame`, module fill from `--uec-*-scan`) and the H3 hex corridor map are the visual signatures.

**The poster is the one exception**, and it is a real one: a poster is artwork with the event's details laid over it, because a poster has to stop someone walking past. That brings a rule the rest of the system never needs — type is never set directly on an image, since you cannot know what is behind any given pixel. Either an opaque tinted panel, or a scrim at **75% minimum**, which is where `--text` clears AAA against a worst-case white pixel. See `assets/Posters/README.md`.

There is no logo asset. Render the wordmark in plain type at 700 weight, or use the `.brand` uppercase label. Never draw a mark.

### The wordmark

```
ourSharedEvents
brought to you by OurCommunityRituals
```

Casing is literal — lowercase leading "o" on `ourSharedEvents`, capital O on `OurCommunityRituals`. They are cased differently on purpose. The JavaScript global `window.OurSharedEvents` is an identifier, not the wordmark, and keeps its capital O. Full rules in `assets/Brand/README.md`.

## Built against brain canon

This system is checked against `OCR-docs/ocr-docs-brain/architectural-invariants.yaml` and the
hybrid design brief's §11 Design language. See `guidelines/05-brain-canon.md` for the full
conformance table, including which floors this system exceeds and where it still falls short.

## Components

Named from `@ocr/ui`'s React layer. **The shipped bundle is a fork, not a build of it** —
see the warning in `CONSUMING.md`. These are the component *contracts* this system
specifies; `packages/ui/src/react/*` is the implementation of record.

- **Actions** — `Button`
- **Surfaces** — `Card`
- **Navigation** — `Header`, `BottomNav`
- **Forms** — `FormInput`, `Textarea`, `FormSelect`, `Checkbox`, `RadioGroup`, `FormGroup`
- **Feedback** — `Loading`, `EmptyState`, `AccessDenied`

`components/bundle.css` also ships the wider CSS-class vocabulary (`.filter-chip`, `.stat-card`, `.bar-chart`, `.toggle`, `.live-indicator`, `.qr-frame`, `.display-card`, `.sponsor-slot`, `.drop-zone`, `.list-item`, the `.hex-*` map classes). Use those classes directly for patterns that have no React component.

## Where this differs from @ocr/ui

Everything here is either `@ocr/ui` verbatim or a change listed below. The grounds — `--bg`, `--surface`, `--surface-hover` — are untouched, so the product still looks like itself.

1. **Fill and ink roles split.** New: `--accent-text`, `--live-text`, `--warn-text`, `--focus-ring`. `--error` and `--info` now point at ink primitives rather than fills.
2. **Text raised from AA to AAA.** `--text-muted` was 4.75:1 on `--surface` and 4.04:1 once
   hovered — under AA. Measured against `--surface`, `--accent` read 4.11:1 and `--danger`
   3.90:1. Precisely: `tests/tokens.test.ts:69-70` *does* assert body text on `--surface`;
   every **other** foreground is checked only against `--bg`, and `--surface-hover` is never
   a ground in any assertion. The three roles that actually fail are the untested ones.
3. **`--border-strong` added.** Every neutral step in the dark theme was between 1.15:1 and 1.63:1, so nothing reached the 3:1 WCAG 1.4.11 needs to identify a control.
4. **`--on-accent` is per-theme, and `.btn-primary` must read it.** `@ocr/ui` hardcodes
   `color:#000`, which is 3.33:1 on the light theme's accent — a live failure. Note this is a
   **value change, not just a wiring change**: `src/tokens.ts:92` and `:118` set `--on-accent`
   to white in *both* themes; this system sets dark to black (5.78:1 against the CARTO fill,
   versus 3.63:1 for white) and keeps light white (6.30:1).
5. **UEC gained a third variant.** `display` (poster and print) · `scan` (QR modules on white) · **`ui`** (chips and map cells). Seven of the ten display hues fell under 3:1 on the dark ground; `--uec-sponsor` read 1.44:1. See `guidelines/30-uec-and-maps.md`.
6. **Map tokens added** — `--map-ground`, `--map-cell-line`, `--map-halo`. The corridor map filled cells at 1.20:1 and stroked them at 1.36:1: functionally invisible, on the product's signature surface.
7. **Type rebased** for the 50–75 bracket, as above.
8. **`--tap-min-primary` and `--tap-gap` added.**

**2026-09-29 — one colour source, AA everywhere, 13px floor.** Item 2 above raised text to AAA; that target is replaced by **AA everywhere, for uniformity**, and the bundle's shared colours now mirror `src/tokens.ts` exactly (`tests/token-parity.test.ts`). That moved `--bg` to `#141F30`, `--accent` to `#52A6FF` with navy `--on-accent`, `--text-muted` to `#8AA1BC`, the danger/error/info roles to the shipped values, and — the one that mattered most — `--success` from the `--live` teal to emerald, so "done" never reads as "on air" (OSE-1328). `styles.ts` now routes every sub-13px size through `--text-min` (`tests/text-floor.test.ts`).

Not changed, and worth stating: the CARTO blue, the teal-not-green status rule, the no-shadow rule, the system font stack, the three-tier structure and the component inventory are all exactly as `@ocr/ui` has them.
