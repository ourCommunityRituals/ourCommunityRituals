# MapDetail

The poster minus its art. Tap a point on a map and it opens into the event's route list — everything you can do here, each one scannable.

**Intentional addition.** This is not part of `@ocr/ui`; it was designed for the touch-map surfaces described in `guidelines/60-map-archetypes-and-venues.md`.

## Why the art is gone

Poster artwork does not survive at this size and does not help anyone choose a route. Stripping it leaves identity to type, which this system is built for — and leaves the routes as the only thing competing for attention, which is the whole point of the card.

## One armed code at a time

The obvious design is a grid of small codes, one per route. It fails twice: at 20mm apiece nothing scans, and at scannable size a person cannot tell which code their phone is pointed at. On a shared screen at a bar that is not a small problem.

So the routes are a list of large rows, and tapping one **arms** its code. The armed code grows — 90mm on a reachable kiosk, 100mm on a bar panel — and is always labelled "Scan for: Chip in". The growth is the affordance; the label is what makes it safe.

## Rules

- Rows are `--tap-min` tall with `--tap-gap` between them. On a display tier that is 20mm and 12mm physical.
- Every route carries its UEC glyph on a `--uec-*-ui` ground, so category reads by hue **and** glyph. Eleven categories is past what hue alone can separate.
- The armed row is marked by a 2px `--focus-ring` border and the words "Ready to scan" — border weight and text, never hue alone.
- **Routes are phase-dependent.** An event three weeks out should not offer "Check in at the door". The caller passes the routes that actually apply; the component renders what it is given.
- The sponsor line is verbatim covenant language and is never softened.
- Selection holds for 20 seconds on a shared screen before reverting — and the panel never resets while a code is armed.

## The consumer provides

`routes` as `{ path, label, sub, uec }[]`, the currently `armed` path, and `onArm`. The component is controlled; it holds no state. Rendering the real QR is the caller's job — the preview shows the slot.

## Props

`name` · `when` · `where` · `routes` · `armed` · `onArm` · `onClose` · `sponsor`
