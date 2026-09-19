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
| `components/bundle.css` | The full CSS class vocabulary, refined | Yes |
| `components/bundle.js` | `@ocr/ui`'s React layer as one classic script, plus `MapDetail` | **No — built from `packages/ui/src/react/*`** |
| `components/index.d.ts` | Types as documentation | Yes |
| `components/<Comp>/README.md` | Per-component guidelines | Yes |
| `components/<Comp>/preview.html` | Live preview, rendered by the artifact | Yes |
| `design-system.json` | The artifact index, kept so the system can be re-synced | **No** |

## Reading it as an agent

Read `README.md` first — it is the brand book and it names everything else. Then read the specific `guidelines/` section or `components/<Comp>/README.md` for whatever you are about to build. `tokens.json` and `index.d.ts` are for tools; pass them by path rather than summarising them.

## Using the tokens in an app

```css
@import '@ocr/ui/design-system/tokens.css';
@import '@ocr/ui/design-system/components/bundle.css';  /* optional: the class vocabulary */
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

**None of it is wired in.** `packages/ui/src/tokens.ts` and `styles.ts` are untouched, so the running product is unchanged. Adopting it means porting the values into `tokens.ts` and extending `tests/tokens.test.ts` to assert contrast against `--surface` and `--surface-hover` rather than only `--bg` — which is where the current suite misses every failure listed in the README.
