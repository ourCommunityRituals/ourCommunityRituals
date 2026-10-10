# Handoff: OCR design system, 2026-10-08

Written for Claude Code (and for Matt) so work can continue without re-explaining. Read this first, then `README.md` in this folder.

## Where things live

| What | Where |
|---|---|
| Colors (the single source) | `packages/tokens/src/primitive.ts` and `semantic.ts` |
| How `@ocr/ui` gets them | `packages/ui/src/tokens.ts` (`UI_FROM_OCR`) and the generated `packages/ui/src/generated/ocr-tokens.ts` |
| How to change a color, step by step | [`CHANGING-COLORS.md`](CHANGING-COLORS.md) |
| Design rules (latest at the top) | [`README.md`](README.md), section "Decisions of 2026-10-08" |
| Mockups of every screen | [`canvas/`](canvas/README.md), 64 boards; start with `Landing`, `Choice` and `Visuals` |
| Live design system page | "ourCommunityRituals" Design System on Claude: https://claude.ai/artifact/6HZTwaWYwRzrwbE2X8mqY9 |
| Live design canvas | "ourCommunityRituals" Design canvas on Claude: https://claude.ai/artifact/W138cUJLHH3yCsB3rV6dzK |

The two Claude links need Matt's login. The files in this repo are the copies Claude Code can read.

## What is done

- `@ocr/tokens` holds the OCR colors: charcoal and creme base for every brand, blue action for ourSharedEvents, amber for the flag side (`ow`), dark danger `#F08585`, plus `--status-success`, `--status-info`, `--border-strong`, `creme-150` (raised and hover) and `signal-800` (light action hover) so every pair clears AA.
- `@ocr/ui` maps its role names onto those colors through a generated copy, because spokes (ourWKRP's CI) stage only `packages/ui`. `npm run sync:tokens` regenerates; `npm run check:tokens` fails on drift.
- The `ow` brand theme is derived from `@ocr/tokens` and repaints only the accent (and visited links). Status colors are locked for every brand.
- Light mode is creme, replacing the plain-web white from PR #50. The web visited purple is kept for light-mode links.
- All on branch `feat/ocr-design-system-colors`: `@ocr/ui` 601/601 tests, `@ocr/tokens` 50/50, contrast AA, generated checks.

## What is next, in order

1. **Push and merge the colors branch.** `git push -u origin feat/ocr-design-system-colors`, open a PR, merge.
2. **Bump the ourSharedEvents pin.** After the merge, set `ourSharedEvents/.ocr-hub-ref` to the merge commit in a PR in ourSharedEvents. Expect visual baselines to change (navy to charcoal/creme). ourWKRP picks up hub main by itself.
3. **Build the visuals in `packages/ui`** (new branch on top of the colors work), matching `canvas/Visuals.dc.html`:
   - a media frame: fixed shape, photo crops to fill, flyer fits whole, image or short muted loop, stops under reduced motion, stock fallback with a credit line;
   - a sponsor panel near the top beside the event, same size for every sponsor, logo or name set in type (replaces the 13px footer `.sponsor-slot`);
   - map cells in neutral creme tones, not `--accent`; taller map with a full-screen control.
4. **Use them in ourSharedEvents pages**: event page header, event lists with thumbnails, corridor and attendee maps (`lib/corridor-map.ts` is fixed at 360px and its empty state hardcodes `#5a5a5a`; `lib/attendee-map.ts` fills cells with `--accent`).

## Product context that shapes the design

- **The Choice.** ourSharedEvents is the anonymous side ("Stay anonymous"); the plant-your-flag side is shown as ourSharedMosaics (formerly ourWKRP). ourAirwaves is used for personal and client pages. Hybrids where both sides meet: ourSharedRecords (artists, spoken word) and ourSharedGames (local sports).
- **ourSharedPulse** is the on-ramp into Games: layered community leagues (casual, serious, competitive, extra fun), which grow into tournaments, leagues, referees and trainings.
- **Overrides.** ourSharedMagnets and ourAirwaves provide custom overrides at the local, anchor and enterprise levels for both sides. Today `@ocr/ui` has one flat brand layer; layering is not built yet.
- **The loop.** Local sponsor, event and attendee engagement through the phone, with private collection via frictionless reporting: counts, never who.
- **Visual first.** Most organizers provide an image. Matt's own street photography (brokenbat) will be the stock set: choose shots without recognizable faces, credit them, and license them in writing from Matt to OurCommunityRituals LLC.

## Open questions (ask Matt, do not guess)

- Override layers: can a local site override what its anchor chose, or only fill in what it left open?
- Is ourSharedMosaics the on-screen name for the flag side, or the family name for hybrids like Records and Games?
- Map cells: creme tones (as mocked) or UEC category colors?
- `@ocr/tokens` still lists OW live as broadcast red (an open question in `semantic.ts`); `@ocr/ui` keeps live teal everywhere.
- The QR codes have not been print-tested on creme yet. Do it before anything is printed.
- There is no `[data-brand="ose"]` selector, so an anonymous-side block cannot be nested inside a flag-side section.

## House rules for writing

US spelling, no em dashes, sentence case, short words, details behind a tap.
