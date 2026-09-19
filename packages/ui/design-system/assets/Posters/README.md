# Posters — showcase photography

Artwork for showcase and demonstration posters. **This group is empty until real images are supplied.** Nothing here is generated, and no placeholder art ships with the system.

## What the poster is

A poster is photography or artwork with the event's information laid over it, plus a QR frame and route chips. The real Masquerade poster is the reference: full-bleed art, event details in opaque tinted panels, route chips along the bottom, and the `ourSharedEvents` lockup in the footer.

This is the **only** surface in the system that carries imagery. Everywhere else the ground is flat `--bg` with no gradients, imagery or textures — see the brand book. A poster is the exception because a poster has to stop someone walking past.

## Type over photography

The system's whole contrast argument collapses if type sits directly on an image: you cannot know what is behind any given pixel, so you cannot know the contrast. Two safe patterns, and no third.

**An opaque panel.** What the real poster uses. Event details sit in a solid tinted block — a UEC display hue works well:

| Panel | `--text` on it |
|---|---|
| `--uec-sponsor` `#1d3557` | 11.18:1 AAA |
| `--uec-archive` `#6c3483` | 7.73:1 AAA |
| `--uec-enter` `#2d6a4f` | 5.78:1 — AA only, so use it for short labels, not body copy |

**A scrim at 75% or more.** Measured against the worst case, a pure-white pixel, with `--bg` `#0F1824` as the scrim colour and `--text` on top:

| Scrim opacity | Contrast | Verdict |
|---|---|---|
| 60% | 4.26:1 | fails AA |
| 65% | 5.01:1 | AA |
| **75%** | **7.15:1** | **AAA — the floor** |
| 85% | 10.26:1 | comfortable |

So: **75% is the minimum scrim, and it is a hard floor, not a starting point.** Below it the poster is only legible over images that happen to be dark, which is not something a generator can rely on.

## The QR over art

The `.qr-frame` stays opaque white with its four-module quiet zone, over any artwork. It is never tinted to match the poster and never made translucent. Module fill comes from the `-scan` variants, which are AA-validated on white:

```
uec-sponsor-scan  10.42:1      uec-enter-scan  6.59:1      uec-live-scan  5.16:1
```

Size the code for the distance it will be read from — a poster on a wall is 2500mm, which means a 250mm code. See `guidelines/40-displays-and-qr.md`.

## What makes an image usable

- **Landscape and portrait both needed.** Posters print portrait; the display and public page crop wide.
- **Leave room.** Busy edge to edge means every panel has to be opaque and the art disappears behind them. Images with a calmer third compose far better.
- **Avoid text in the artwork.** It competes with the event details and cannot be translated or resized.
- **Dark-leaning images are easier** but must not be required — the scrim rule exists so bright images work too.
- **Resolution:** at least 2000px on the long edge for print. Below that the poster is a screen-only asset and should be marked as such.

## Licensing — required before anything is added

Every image in this group carries its rights. Add a row here when you add a file:

| File | Source | Licence | Credit required | Notes |
|---|---|---|---|---|
| _(none yet)_ | | | | |

Photography supplied by the project owner is recorded as such. **Nothing goes in this group without a licence line** — a community platform cannot ship art it cannot account for, and a showcase poster is the most likely thing to be screenshotted and reshared.
