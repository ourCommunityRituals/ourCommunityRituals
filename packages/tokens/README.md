# @ocr/tokens

One token source for the fleet. Three tiers, two orthogonal axes, two outputs.

## The two axes

```
[data-brand]    changes PAINT ONLY    ose · ow · <client, at runtime>
[data-surface]  changes SCALE ONLY    console · public · tv · poster
```

A brand may not change scale; a surface may not change paint. Held by
construction, not convention: `semantic.ts` emits no sizes, `surface.ts` emits no
colors, and `tests/axes.test.ts` fails if either starts to.

This is what makes five surfaces across three apps one design system instead of
fifteen forks. TV is not a separate theme — it is the same palette at a 2.2x type
scale. OW is not a separate build — it is the same structure with a carbon ground
and an amber action.

## The three tiers

| Tier | File | Holds | Referenced by |
|---|---|---|---|
| 1 primitive | `primitive.ts` | raw values — `--ocr-navy-950`, `--ocr-size-4` | tier 2 only |
| 2 semantic | `semantic.ts` | roles — `--ground`, `--action`, `--text-muted` | tier 3, and brands repaint here |
| 3 component | `component.ts` | properties — `--button-primary-bg`, `--poster-qr-size` | **component CSS** |

Component CSS references tier 3 and nothing else. That is what lets
`check-raw-values.mjs` be an honest grep: if a stylesheet contains a literal, it
is either a token nobody defined or a decision made in the wrong file.

## Two ground families, on purpose

OSE reads on blue-black (`#0F1824`); OW reads on neutral black (`#0A0A0A`). Both
ship today. Collapsing them into one "dark" would force one app to change how it
looks in order to adopt the tokens — which is how a shared layer gets rejected.

## The brand contract (ourAirwaves, Wave 2)

OA clients paint their own sites, so a brand is untrusted runtime input:

```ts
import { validateBrand } from '@ocr/tokens';

const violations = validateBrand({ dark, light });
// [{ mode: 'light', role: '--text',
//    reason: '--text on --ground is 2.11:1, below the 4.5:1 minimum.' }]
```

Three things are enforced rather than documented:

1. **`BRAND_OVERRIDABLE` is a closed set.** A client cannot reach structure,
   spacing, or the UEC palette. `--status-danger` is deliberately excluded — no
   skin gets to make "delete everything" look calm.
2. **Both modes are required.** One flat accent clears AA on one ground and fails
   on the other.
3. **AA is measured.** A failing palette is rejected with the ratio, not shipped.

## Commands

```bash
pnpm --filter @ocr/tokens build             # → dist/tokens.css + dist/tokens.json
pnpm --filter @ocr/tokens test              # contrast · axis separation · tier chain
pnpm --filter @ocr/tokens check:generated   # fails if dist/ is stale
node scripts/check-raw-values.mjs <path...> # the §5 gate
```

`check-raw-values.mjs` scans `.css` files, `<style>` blocks, **and CSS built as a
template literal in `.ts`/`.js`** — both fleet apps build stylesheets that way
(`@ocr/ui`'s `componentStyles`, the OSE Worker's `pages.ts`), and a gate that
only reads `<style>` tags reports those files clean while they carry hundreds of
raw values.

## Consuming it

```html
<html data-brand="ose">
  <link rel="stylesheet" href="/tokens.css">
  <main data-surface="public"> … </main>
</html>
```

Node tooling (poster generation, docs) reads `dist/tokens.json`, which is
generated in the same pass as the CSS and therefore cannot disagree with it.
