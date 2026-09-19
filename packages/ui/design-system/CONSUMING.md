# Consuming this design system

This folder is the **specification**, committed so it is readable offline, in VS Code, and by any agent working in this repo. It is deliberately inert: importing nothing from here changes no rendered output today.

The live, browsable version is the Design System artifact it was published from. This copy and that one are the same files.

## What is here

| Path | What | Edit? |
|---|---|---|
| `README.md` | The brand book. **Start here.** | Yes |
| `guidelines/*.md` | Eight sections: the 50–75 reader, colour, UEC and maps, displays and QR, the CSS vocabulary, map archetypes, rotating displays, the recursive web | Yes |
| `tokens.json` | The source of truth for every token | Yes |
| `tokens.css` | Compiled custom properties + type-style classes | **No — generated** |
| `compile-tokens.mjs` | `node compile-tokens.mjs` regenerates `tokens.css` | Yes |
| `components/bundle.css` | **Preview-only.** A SUBSET of `src/styles.ts` — see the warning below | Yes |
| `components/bundle.js` | **UNREVIEWED THIRD-PARTY ARTIFACT — see the warning below** | **No** |
| `components/index.d.ts` | Types as documentation | Yes |
| `components/<Comp>/README.md` | Per-component guidelines | Yes |
| `components/<Comp>/preview.html` | Live preview, rendered by the artifact | Yes |
| `design-system.json` | The artifact index, kept so the system can be re-synced | **No** |

## ⚠ Two artifacts you must not trust

**`components/bundle.js` was not built from this repo.** It came from an external handoff
bundle. There is no build script in `packages/ui` that produces it (`scripts` are `test`,
`scan`, `typecheck` — no `build`), so it cannot be regenerated or verified. `scripts/bundle-divergence.mjs` now answers precisely how far it diverges, and the answer
is narrower than feared. Of the 13 declared components, **11 are literal-identical to
`src/react`** — same class names, same `aria-*`, same defaults, same copy. Two are not:

| Component | Divergence |
|---|---|
| `AccessDenied` | bundle has `icon=🔒` and "Ask the event organizer for an invite link"; src has `🎧` and "This area is for DJs" |
| `FormGroup` | src accepts `className` and `data-testid`; the bundle's signature has neither |

Both are consistent with the bundle being a **stale build of `src`**, not a rogue fork.

The larger finding is what the header does not declare: the file defines **42 functions**,
not the 15 it claims. The other 29 are the handoff's demo-kit layer — `AdminDashboard`,
`PublicPre`, `ReportPost`, the sponsor steps, plus helpers like `PhoneShell`, `QRBlock`,
`HexMap`, `UecChip`. They have no `src` counterpart to verify against at all.

So: **the previews are trustworthy for the 11, and the bundle is not a component library.**
Still do not adopt it wholesale — there is no build script here that can regenerate it, so
it can only be replaced, not refreshed. `pnpm ui:check:bundle` pins today's drift in a
committed baseline and fails on anything new, and on anything fixed, so the baseline
shrinks rather than rots.

**`components/bundle.css` is a SUBSET of `src/styles.ts`** — 122 classes against 134.
The 34 it lacks are almost all ourWKRP surfaces (`.genre-link*`, `.genre-popup*`,
`.contributor-*`, `.grid-*`, `.track-grid`, `.progress-*`, `.preview-table*`, `.result-*`).
Adopting it in place of `styles.ts` would silently delete a third of OW's rendered surfaces.
**The adoption target is a patch to `src/styles.ts`, not this file.**

## Reading it as an agent

Read `README.md` first — it is the brand book and it names everything else. Then read the specific `guidelines/` section or `components/<Comp>/README.md` for whatever you are about to build. `tokens.json` and `index.d.ts` are for tools; pass them by path rather than summarising them.

## Using the tokens in an app

```css
@import '@ocr/ui/design-system/tokens.css';
@import '@ocr/ui/design-system/bundle.css';  /* optional: the class vocabulary */
```

`tokens.css` puts the dark roles on bare `:root`, so dark is the default exactly as `@ocr/ui` has it. Light arrives via `prefers-color-scheme`, and `data-theme="light"` or `data-theme="dark"` forces either one.

`bundle.css` defines `--font` from `--font-sans` for you, so `@ocr/ui`'s existing class vocabulary keeps working unchanged.

## The one rule to carry into code

**A token is either a ground or something you read. Never both.**

- **FILL** roles — `--accent`, `--live`, `--danger`, `--warn` — are grounds. They need 3:1 against their surroundings.
- **INK** roles — `--text`, `--text-muted`, `--accent-text`, `--error`, `--live-text`, `--warn-text` — are read. They clear 7:1 on `--bg` and `--surface`.
- **LINE** — `--border` is decorative and may never be the only thing marking a control; `--border-strong` marks anything meaningful and clears 3:1.

So a primary button is `--accent` with `--on-accent` text; a link is `--accent-text`. Getting this backwards is the failure the whole revision exists to fix.

## How this differs from what `packages/ui` currently ships

`README.md` ends with the full list. In short: fill and ink roles split, text raised from AA to AAA, `--border-strong` added, `--on-accent` made per-theme, UEC given a third `-ui` variant, map and display tiers added, and the type scale rebased for readers aged 50–75.

**None of it is wired in.** `packages/ui/src/tokens.ts` and `styles.ts` are untouched, so the
running product is unchanged. Adoption means porting the values into `tokens.ts` and widening
`tests/tokens.test.ts` (see the README for exactly which grounds it does and does not cover).

Because `partials.ts` emits only class names — zero inline styles, zero literal hex — landing
the migration in `styles.ts` carries it to the server-rendered surfaces for free. The entire
literal-colour migration is eight lines in `styles.ts`: 27, 31, 124, 182, 216, 253, 259
(267 stays literal white; a QR frame is white in both themes). Three of those — `.attr-btn`,
`.genre-filter-btn`, `.contributor-avatar` — are ourWKRP surfaces carrying the identical
`color:#000` bug, so fixing `--on-accent` once fixes both sides of the hybrid.
