# Changing the OCR colors

**Read this every time you change a color.** You do not need to remember any of it. Just follow the steps in order.

Last checked: 2026-10-08.

---

## The short version

Open PowerShell and run these, one line at a time:

```powershell
cd C:\Users\mzdan\dev\ourCommunityRituals\packages\tokens
npm run build
npm test

cd ..\ui
npm run sync:tokens
npm test
```

If every command ends without a red error, you are done with the code. Then go to "Getting it to the live sites" below.

---

## Where the colors live

There is **one** place to change a color:

> `packages\tokens\src\primitive.ts` (the color values)
> `packages\tokens\src\semantic.ts` (which color is used for what)

Everything else is copied from there. Here is the path a color takes to reach a page:

1. **`packages/tokens`**: you change the color here.
2. **`npm run sync:tokens`** copies it into `packages/ui/src/generated/ocr-tokens.ts`.
3. **`packages/ui/src/tokens.ts`** gives it the names the pages use (`--bg`, `--accent` and so on).
4. **`/ui.css`** is served by each site, built from `packages/ui`.
5. **The pages** (ourSharedEvents, ourWKRP and the rest) link `/ui.css`.

**Never** edit `packages/ui/src/generated/ocr-tokens.ts` by hand. It gets overwritten the next time someone runs the sync.

---

## Why there is a copy (so you trust it)

The spokes do not all have the whole repo when they build. ourWKRP's build copies only the `packages/ui` folder. If `packages/ui` reached over to `packages/tokens` directly, that build would break.

So `packages/ui` keeps its own copy of the colors, and `npm run check:tokens` makes sure the copy matches the source. It is the same pattern the repo already uses for the generated flag files.

---

## Step by step

### 1. Change the color

Open `packages\tokens\src\primitive.ts` to change a color value, for example:

```ts
'--ocr-charcoal-950': '#1A1918', // dark ground
```

Or open `packages\tokens\src\semantic.ts` to change which color a role uses, for example which blue the button uses.

### 2. Rebuild the tokens package

```powershell
cd C:\Users\mzdan\dev\ourCommunityRituals\packages\tokens
npm run build
```

You should see: `@ocr/tokens: wrote dist/tokens.css + dist/tokens.json`

### 3. Test the tokens package

```powershell
npm test
```

You should see every test passed. A failure here usually means a color is too faint to read (contrast). The message names the two colors and the ratio.

### 4. Copy the colors into the UI package

```powershell
cd ..\ui
npm run sync:tokens
```

You should see: `@ocr/ui: wrote src/generated/ocr-tokens.ts`

### 5. Test the UI package

```powershell
npm test
```

You should see every test passed. These tests check every text color against every background, in dark and light, for both brands.

### 6. Optional double check

```powershell
npm run check:tokens
npm run contrast
```

- `check:tokens` should say the copy **matches packages/tokens**.
- `contrast` should end with **All pairs meet WCAG AA**.

---

## If something fails

| What you see | What it means | What to do |
|---|---|---|
| `src/generated/ocr-tokens.ts is out of date` | You changed `packages/tokens` but did not copy it over | Run `npm run sync:tokens` in `packages\ui` |
| A contrast test fails with a ratio like `4.2:1 (min 4.5)` | The new color is too hard to read on one of the backgrounds | Pick a darker color (light mode) or lighter color (dark mode) and start again at step 2 |
| `token parity` fails | The design-system preview file (`design-system/tokens.json`) still has the old value | Ask Claude: "update packages/ui/design-system/tokens.json to match src/tokens.ts, then run compile-tokens" |
| `check:generated` fails, but the diff looks empty | Windows line endings, not a real change | The `.gitattributes` file should prevent this. If it still happens, ask Claude to check line endings |
| `npm` says a command is missing | That package's tools are not installed | Run `npm install` in that folder, then try again |

---

## Getting it to the live sites

Nothing goes live until it is committed. After the tests pass:

1. **Commit** `packages/tokens` and `packages/ui` to the hub repo's `main` branch.
2. **ourWKRP** picks it up by itself: its build copies the newest `packages/ui` from `main`.
3. **ourSharedEvents** is pinned to a specific hub version. Update the commit in `ourSharedEvents\.ocr-hub-ref` to the new hub commit, then commit that in ourSharedEvents.
4. **On your own computer**, restart the dev server for a site to see the change. Both sites read `packages/ui` directly.

---

## What each page name means

Pages use the names on the left. They get their color from the role on the right, in `packages/tokens`.

| Page name | Comes from | Plain meaning |
|---|---|---|
| `--bg` | `--ground` | Page background (charcoal or creme) |
| `--surface`, `--card` | `--surface` | Cards and panels |
| `--surface-hover` | `--surface-raised` | Hovered rows, raised panels |
| `--border` | `--border` | Thin divider lines |
| `--border-strong` | `--border-strong` | Edges of inputs and buttons |
| `--text`, `--text-primary` | `--text` | Main text |
| `--text-muted`, `--text-secondary` | `--text-muted` | Labels and captions |
| `--accent` | `--action` | Main button, links (blue, or amber on the flag side) |
| `--accent-hover` | `--action-hover` | Button when hovered |
| `--on-accent` | `--on-action` | Text on top of the main button |
| `--live` | `--status-live` | Live right now (teal) |
| `--danger`, `--error` | `--status-danger` | Delete and errors (red) |
| `--danger-hover` | `--status-danger-hover` | Delete button when hovered |
| `--warn` | `--status-warn` | Caution (amber) |
| `--info` | `--status-info` | Information (light blue) |
| `--success` | `--status-success` | Done (green) |

`--live-hover` is the one name that still has its own value in `packages/ui/src/tokens.ts`.

The full list is `UI_FROM_OCR` in `packages/ui/src/tokens.ts`.

---

## The two sides

- **ourSharedEvents** (anonymous side) is the base: blue accent.
- **The flag side** adds `data-brand="ow"` to a page. It repaints **only** the accent to amber. Background, text and status colors stay the same.

**Status colors never change by brand.** Live stays teal, danger stays red, success stays green, everywhere. No client brand can make "delete" look calm.

---

## Don't

- Don't put a color hex (`#1A1918`) directly in a page. Use the names above. A check counts hardcoded colors and fails if the count goes up.
- Don't edit `src/generated/ocr-tokens.ts` or `design-system/tokens.css` by hand. Both are generated.
- Don't change colors in `packages/ui/src/tokens.ts`. Change them in `packages/tokens`.

---

## See also

- `CONSUMING.md` (this folder): how the design system files fit together
- The OCR design system page on Claude (the live, browsable version)
- `packages/ui/scripts/sync-ocr-tokens.ts`: the copy script, with notes at the top
