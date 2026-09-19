# Brand

**Empty, and deliberately so.** No logo, mark, icon set or font file exists in `@ocr/ui`, and none has been drawn for this system.

## There is no mark

Wherever a logo would go, the product renders the name in type. This is not a gap waiting to be filled by a generated mark — approximating one would put a fake identity into every surface that reads this system. If a real mark is supplied it goes here; until then, type.

## The wordmark

```
ourSharedEvents
brought to you by OurCommunityRituals
```

- **Casing is literal: `ourSharedEvents`** — lowercase leading "o", capital S and E. Not "OurSharedEvents", not "OSE" in running text, not all-caps. The real product chrome renders it this way in the header and the poster footer.
- **`OurCommunityRituals`** takes a capital O. The two are cased differently on purpose; do not normalise them to match.
- The attribution line is 0.875rem (`meta`) in `--text-muted`, directly under the name, and travels with it in the header and poster footer.
- Set in the system stack at 700 weight. No webfont, no letterspacing, no effects.
- `.brand` is the other form — 13px uppercase with 0.12em tracking in `--accent-text` — used for a section label like ADMIN, never as the product name itself.

There is no JavaScript global: the system ships no bundle and no framework.

## What goes here when it exists

| Sub-path | For |
|---|---|
| `Brand/logo/` | A real mark, if one is ever made. SVG plus a PNG fallback |
| `Brand/sponsor/` | Sponsor mark slots. Remember the covenant: same size, same spots — a sponsor mark is placed in a fixed frame and is never scaled to its buyer's preference |
| `Brand/fonts/` | Only if the system stops using the system stack. Font files live in `fonts/`, not here, and must be listed in `tokens.json` `type.fonts[]` |

## Rules for any supplied mark

- Copy the file verbatim. Never redraw, re-trace or "clean up" a supplied mark.
- SVG displays through `<img>` only — no inline SVG for a logo, because a single-ink mark using `currentColor` will not inherit. If the mark is single-ink, name its ink here rather than relying on `currentColor`.
- Provide it for both themes, or state which ground it requires. A mark that only works on white needs a white plate on the dark theme, and that plate is part of the asset.
- Record the licence and who owns it, as in the Posters group.
