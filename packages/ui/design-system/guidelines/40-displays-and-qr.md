# Venue displays, touch maps and QR sizing

A venue display is the one surface in this product where the reader is not holding the screen. That changes the rules: sizes stop being a pixel decision and become a **physical** one.

## QR size is millimetres, never pixels

A phone camera reads a code from roughly **ten times its width**. So the code's physical width must be at least the scan distance divided by ten.

| Posture | Distance | Minimum QR width |
|---|---|---|
| Touching the screen (kiosk) | 450mm | **45mm** |
| Standing at a rail | 900mm | **90mm** |
| Across a room, poster wall | 2500mm | **250mm** |
| Back of a venue | 5000mm | **500mm** |

What 50mm costs in pixels depends entirely on the panel:

| Display | px/mm | 50mm QR | 90mm QR |
|---|---|---|---|
| 27" 1080p monitor | 3.21 | 161px | 289px |
| 32" 1080p portrait kiosk | 2.71 | 136px | 244px |
| 43" 4K | 4.03 | 202px | 363px |
| 55" 4K | 3.15 | 158px | 284px |
| 55" 1080p | 1.58 | **79px** | 142px |
| 12.9" tablet | 10.42 | 521px | 938px |

**The trap:** CSS `mm` assumes 96px per inch. On a 55" 4K panel that is 1.20× wrong; on a 55" 1080p panel it is **2.40× wrong**. A QR that measures correctly in a browser can be half the size it needs to be on the wall. CSS physical units cannot be trusted on a display.

So the display kit carries a per-install custom property:

```css
:root { --display-ppmm: 3.15; }        /* measured at install, per panel */
.qr-frame canvas { width: calc(var(--qr-mm) * var(--display-ppmm) * 1px); }
```

`--qr-mm` is 50 for a reachable kiosk and 90 once a code is armed for scanning. Measure `--display-ppmm` once per installation and record it with the venue.

**Quiet zone is not optional.** Four modules of clear white on every side. A 25×25-module code at 50mm has 2.0mm modules and needs an 8mm quiet zone, so the white `.qr-frame` is never smaller than about 66mm. The frame stays white in both themes — a dark-themed QR is an unscannable QR.

## A touch map with a thumbnail QR

This works, and it works *because* it is a touch screen: someone touching the panel is at arm's length, where a 45–50mm code is plenty. A thumbnail is legitimate here in a way it never is on a poster.

Three rules make it safe.

**1. The QR grows when it is armed.** People touch up close, then lift the phone and often step back — and a 50mm code dies at 900mm. So the code is a 50mm thumbnail while browsing and enlarges to 90mm the moment a selection arms it. The size change is also the clearest possible signal that this one is ready to scan, with no words at all.

**2. Selection locks the code.** If anyone can touch the map, the next person's tap will swap the code out from under someone lining up a shot. A selection holds the QR for 20 seconds, and the panel names what it will open: "Scan for: Maple Street Fair · Sat 7pm". A visible countdown or a "Keep it up" button beats a code that changes silently.

**3. The map is never the only route.** The display opens already showing tonight's answer and a scannable code. Touch reveals more; it is never required to get the basic thing. Pan-and-zoom in particular is the hardest gesture there is — offer named jumps as 56px buttons instead.

## Physical placement

- Anything interactive sits between **380mm and 1220mm** from the floor — the forward-reach range that keeps a kiosk usable from a wheelchair.
- Keep the QR out of the top band of a tall panel: a code above about 1600mm is awkward to photograph square-on, and an off-axis shot loses modules.
- Matte panels only where you can choose. Glare destroys a scan faster than any sizing error.
- The `.qr-frame` white must be real white (`--ocr-light-100`), never a tinted surface.

## Display type

A venue display is read from further away than a phone, so the phone scale does not transfer. Step `cta` up to 28–32px and the supporting line to 20px, keep one idea per screen, and never animate anything a person may be mid-scan of. `.display-card` is capped at 360px on phones and 480px above 768px — those caps are for the *preview* of a display, not for the panel itself.

## The bar panel: a 38–40" touch map

A local-area map on a 38–40" panel, showing what's on tonight, that you touch while sitting at the bar. It is the most demanding surface in the product, because two distances are in play at once: you **reach** to touch it (~600mm) and you **read** it from your stool (~1000mm).

| Panel | px/mm | 1px = |
|---|---|---|
| 38" ultrawide 3840×1600 | 4.31 | 0.23mm |
| 40" 4K 3840×2160 | 4.34 | 0.23mm |
| 40" 1080p | 2.17 | 0.46mm |
| 43" 4K | 4.03 | 0.25mm |

**The phone scale does not transfer.** To subtend the same angle at 1000mm that it does on a phone at 400mm, text has to be 2.5× larger. On a 40" 4K panel:

| Style | On a phone | On this panel at 1000mm |
|---|---|---|
| body | 16px | **46px** (10.6mm) |
| button | 18px | **52px** (11.9mm) |
| page-title | 22px | **63px** (14.6mm) |

Because the whole scale is in `rem`, one root font-size carries it. `[data-surface="display"]` derives it from two measured numbers:

```css
[data-surface="display"] {
  --view-mm: 1000;        /* browse distance */
  --display-ppmm: 4.34;   /* MEASURE. 40" 4K = 4.34, 40" 1080p = 2.17 */
}
```

**Touch targets are millimetres, not CSS pixels.** A 48px target is 12.7mm on a phone and 11mm on this panel — too small for an arm extended across a bar. Reaching wants 20mm, and a primary action 24mm. The tier redefines `--tap-min` from `--display-ppmm` so every existing class inherits it.

**Points and clustering.** A map point is 20mm across with 12mm between centres — 32mm pitch. A 40" panel measures 886 × 498mm, so it holds about **27 × 15 = 405 non-colliding points**. Past roughly 200 visible points they start to overlap and the map becomes unusable. Clustering is therefore a capacity rule with a number behind it, not a nicety: cluster above ~150 points and show a count in a `.map-cluster`.

**QR at the bar.** A 50mm thumbnail only works if you lean in to about 500mm. Armed, the code goes to **100mm** — which reads from roughly 1000mm, i.e. from the stool, without anyone standing up. That is why `[data-surface="display"]` sets `--qr-mm: 100` on an armed code rather than the 90mm used on a reachable kiosk.

**Bar-specific conditions.** Dim room, so the dark theme is correct here and should be forced with `data-theme="dark"` rather than left to `prefers-color-scheme`. Expect glare from bar lighting: matte panel, and keep the QR out of the top band where ceiling lights reflect. Expect more than one person at the screen — see the selection lock in the touch-map rules above, which matters more here than anywhere else.

## Tapping a point: the poster minus its art

Touching a point opens `MapDetail` — the event's poster with the artwork stripped out. Art is dropped for two reasons: it does not survive at this size, and it does not help anyone choose what to do next. Identity is carried by type, which this system is built for.

What the card shows is the event's **routes** — `/public`, `/donate`, `/checkin`, `/feedback`, `/sponsors` — each one a UEC category, so each arrives with its hue and its glyph already meaningful.

**One armed code at a time.** The obvious design is a grid of small codes, one per route. It fails: at 20mm apiece nothing scans, and at scannable size a person cannot tell which code their phone is pointed at. So the routes are a list of large rows, and tapping one arms its code — which then grows and is labelled "Scan for: Chip in". The label is not decoration; it is the only thing that makes a shared screen safe to scan from.

This also gives someone browsing at a bar exactly the right rhythm: read the map, tap a point, read what's on offer, tap the one thing they want, lift the phone.

## Tamper — the risk the geometry does not cover

Everything above makes a code *scannable*. None of it makes it *trustworthy*. A sticker
placed over a public QR redirects every scan to an attacker's URL, and it is the easiest
attack against any surface in this product. Our own one-tap framing removes exactly the
friction that would let someone notice a swapped destination.

- **Print the destination in words beside the code.** "Goes to oursharedevents.com" — canon
  already requires word + path + tier on every code, and this is why.
- **A code on an unattended surface gets checked.** Venue displays render the code; they are
  not stickered. A printed poster in the wild is the exposed case — build a walk-past check
  into canvassing, and say so in the organizer flow.
- **A short link is opaque by design.** That is good for the poster and bad for a person
  eyeballing where it goes. Minting must be non-sequential and rate-limited so adjacent
  events cannot be enumerated.
- **Never ask for anything sensitive behind a scanned code.** No credentials, no payment
  details entered on a page reached only by scanning an unattended code.

## The floor viewport

**375 × 812 — iPhone 13 Mini.** Invariant #14 names it. iPhone X / XS / 11 Pro share it;
390+ passes by being wider; Android 360px is a separately verified edge case. No horizontal
scroll at 375, and the primary CTA sits above the fold there.
