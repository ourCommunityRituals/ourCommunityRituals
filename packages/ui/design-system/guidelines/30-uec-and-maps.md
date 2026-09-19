# UEC categories and the corridor map

## Three variants, not two

A Universal Event Code carries its category in its hue. That hue has to work in three completely different physical situations, and one value cannot serve all three.

| Variant | Where it lives | Validated against |
|---|---|---|
| `--uec-<k>` | Poster chrome, print, display headers | Its printed ground |
| `--uec-<k>-scan` | QR module fill, inside the white `.qr-frame` | AA on white — a printed code has no theme |
| **`--uec-<k>-ui`** | Chips, legends, map cells | AA on `--bg` **and** `--surface`, per theme |

`@ocr/ui` had the first two. The rule "hue carries meaning, never mode-flip" is exactly right for a printed code and exactly wrong for a chip on a navy screen: seven of the eleven display hues fell under 3:1 on `--bg`.

```
uec-sponsor  1.44:1      uec-shop     1.80:1      uec-utility  2.01:1
uec-archive  2.09:1      uec-staff    2.14:1      uec-enter    2.79:1
uec-checkin  2.82:1
```

The `-ui` variant keeps the hue family and moves only lightness, so the category still reads as itself. Two honest consequences: on dark, `staff` (#a00020, a deep maroon) becomes a visibly pink #ff466b, and `sponsor` (#1d3557, near-navy) becomes #658fcc. At these lightnesses "same hue family" is what survives, not "same swatch". The display and scan variants are untouched, so posters and printed codes are unaffected.

## The categories

| Key | Glyph | `display` | `-ui` dark | `-ui` light | Meaning |
|---|---|---|---|---|---|
| `enter` | 🚪 | `#2d6a4f` | `#439e75` | `#2d6a4f` | Access and entry. You may come in. |
| `checkin` | ✅ | `#006b6b` | `#009e9e` | `#006b6b` | Check in at the door. |
| `live` | 🔴 | `#e07a5f` | `#e07a5f` | `#c54726` | Now. What is happening this minute. |
| `alert` | ⚠️ | `#b8960a` | `#b8960a` | `#896f07` | Urgent notice pushed to a corridor. |
| `staff` | 🎽 | `#a00020` | `#ff466b` | `#a00020` | Staff only. |
| `help` | 🆘 | `#d4668e` | `#d56b92` | `#c83c6f` | Care. Ask a person, find first aid, report a problem. |
| `feedback` | 💬 | `#c4930a` | `#c4930a` | `#906c07` | Voice. Tell the organizer what you thought. |
| `sponsor` | 🤝 | `#1d3557` | `#658fcc` | `#1d3557` | Sponsor and trust surfaces. The covenant colour. |
| `archive` | 📦 | `#6c3483` | `#b177c9` | `#6c3483` | Memory. Past events and SharedReports. |
| `shop` | 🛍️ | `#1a4a48` | `#379c97` | `#1a4a48` | Buy something on site. |
| `utility` | 🔧 | `#4a4a4a` | `#8e8e8e` | `#4a4a4a` | Utility codes with no category of their own. |
## Eleven categories is more than hue can carry

Roughly eight is the practical ceiling for reliable colour separation among sighted users, and this palette has eleven. Under deuteranopia `enter` / `checkin` / `shop` converge, and so do `help` / `live`. Ageing eyes lose blue–navy discrimination first, which is precisely where `sponsor` sits.

**So category is always encoded twice: hue plus glyph.** The glyph column above is canonical. Map cells carry it, legends carry it, chips carry it wherever there is room. This costs nothing, needs no icon library — they are the same functional emoji the nav and empty states already use — and it is the single highest-leverage accessibility decision in the system.

## The H3 corridor map

The corridor map is the product's visual signature and, before this revision, its least legible surface. `HexMap` filled every cell `--surface` on `--bg` and stroked it `--border`:

```
cell fill vs page ground    1.20:1        cell stroke vs fill   1.36:1
uec-sponsor cell vs fill    1.21:1
```

The map was, in practice, invisible.

### Rules

**An empty cell is stroke-only.** A `--surface` fill on `--bg` is 1.20:1 and will never read at any size. Empty cells have no fill and a `--map-cell-line` stroke (3.60:1 on `--bg`).

**The map panel keeps the page ground.** `--map-ground` is deliberately identical to `--bg`. Every candidate map tint tested landed at 1.02–1.04:1 against the page — invisible as a seam. The panel is marked by a `--border-strong` edge, not by a fill. This is also why the dark theme works on a map at all: `--bg` is hue 214°, luminance 0.0088, within a hair of CARTO Dark Matter's land tone (#12161C, hue 216°, 0.0079). Chrome and basemap already sit in the same tonal world; they only differ in saturation.

**Every label and overlay stroke gets a halo.** A 2px `--map-halo` casing under map text and lines is what lets them survive over basemap imagery, where the ground underneath is not a token and cannot be predicted. Dark theme uses `--map-halo` (#0b1017); light uses `--map-halo-light` (#ffffff). This is standard cartographic practice and it is the difference between a map that works in the field and one that works in a screenshot.

**Filled cells use `-ui` and carry their glyph.** A cell that means something is filled with `--uec-<k>-ui` and marked with the category glyph. The legend repeats hue and glyph together.

**Selection is a stroke weight, not a colour.** A selected cell keeps its category hue and gains a 3px `--focus-ring` stroke. Changing the hue to show selection would destroy the only thing the hue is for.

### Touch maps

A corridor map on a touch display must open already showing the answer — tonight's event, tonight's poster spots. Touch is an enhancement, never the only route. Pan-and-zoom is the hardest gesture there is, and a map that requires it locks out exactly the people this platform is for. Provide named jumps ("Your venue", "All poster spots") as 56px buttons beside the map, and make every one of them do what a gesture would have done.
