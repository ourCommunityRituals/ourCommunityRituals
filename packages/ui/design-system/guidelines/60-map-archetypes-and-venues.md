# Map archetypes and venue contexts

"The map" is three different objects in this product, and conflating them is the fastest way to build one that works for none of them. Each has its own unit, its own zoom, and its own reason to exist.

| Archetype | A point is | Scale | Who reads it |
|---|---|---|---|
| **Corridor map** — H3 hexes | A cell of poster reach | Neighbourhood | Organizer, planning canvassing |
| **Area map** — event points | A whole event | Town | Attendee, choosing what to do |
| **Site map** — stops and stalls | A thing *inside* one event | One venue or one route | Attendee, already there |

They share the token set — `--map-ground`, `--map-cell-line`, `--map-halo`, the `--uec-*-ui` hues and their glyphs — and nothing else. Do not reuse a layout between them.

## Corridor map

The original: H3 hexes showing where posters reach. Abstract, organizer-facing, never shown to attendees. Empty cells are stroke-only; filled cells carry `--uec-*-ui`. Covered in full in `30-uec-and-maps.md`.

## Area map — "what's on near me"

The bar-panel map. Points are events, each carrying its category hue and glyph.

- **Capacity is a hard number.** A 20mm point on a 32mm pitch means a 40" panel holds about 400 non-colliding points, and past roughly 200 they visibly collide. Cluster above ~150 and show a count in a `.map-cluster`.
- **A library of future events is a filter, not a second map.** Time scope sits beside category as `.filter-chip` rows: *Tonight · This week · This month · Later*. Default to Tonight — the question someone at a bar is actually asking. "Later" is a named range, never a date picker: a calendar grid is a competence test, and this is the audience least served by one.
- **Always offer the list.** Not everyone reads a map, and plenty of people in the 50–75 bracket will reach for a list first. The same events, same hues, same glyphs, as `.list-item` rows sorted by time. The map is an alternative view, never the only route.
- **A future event's routes differ from tonight's.** Tapping a point three weeks out should not offer "Check in at the door". `MapDetail` takes whatever routes the event actually has; the caller filters by phase.

## Site map — inside one event

This is the archetype the system did not have, and it is what a farmers market, a rec centre or an art walk actually needs.

**There is no basemap.** A market's stall layout, a rec centre's floor plan and an art walk's stops are drawn geometry on `--bg`. That makes them *easier* than the area map, not harder: every colour underneath is a token, so the `--map-halo` casing becomes optional and the `--border-strong` stroke is doing predictable work.

Two shapes:

- **Placed** — farmers market stalls, rec centre rooms and courts. Points have no order. Category is the sub-type, and it is what people navigate by: produce, bakery, prepared food, crafts, kids. These sit under `--uec-shop` at the event level, but *within* the site map they need their own small palette — treat it exactly as UEC is treated: pick hues that clear AA on `--bg` and `--surface`, and pair every one with a glyph. Never more than eight.
- **Ordered** — art walks, community run-walks. Points are a sequence, so the number *is* the information: stop 1, 2, 3. Draw the connecting path in `--border-strong` with a `--map-halo` casing, and number every stop. This is the one place in the system where numbered markers are legitimate, because the order is real and the reader needs it. Show distance between stops for a run-walk; for an art walk show nothing but the order.

**Stall and stop detail uses `MapDetail`.** A stall is an event's child with its own routes — the vendor's page, a way to pay, feedback. Same rule as everywhere: one armed code at a time, always named.

**Say where the reader is.** A site map is read by someone standing inside it, so it needs an orientation anchor — "You are near the Maple Street entrance" — and a fixed north or a fixed landmark. Never rotate the map under them.

## Cross-functional events

A Saturday morning that is a run-walk, an art walk and a farmers market at once is one occasion with several categories, not three events stacked on a pin.

- **One point, a primary hue, and an honest count.** The point takes the category of the thing starting soonest and carries a small "+2" marker. Do not split a hue into wedges — at 20mm nobody can read a pie chart, and colourblind readers cannot read it at any size.
- **The detail card lists the strands**, each with its own hue, glyph and time, and each with its own routes. `MapDetail`'s route list already does this; the strands are just route groups with a heading.
- **Filters are inclusive.** Someone filtering for "Farmers market" must still see the cross-functional Saturday, because it *is* a farmers market. Filtering by any of an event's categories matches it.

## Venue contexts

The surface tier (`40-displays-and-qr.md`) sets sizes. These set everything else.

**Bar.** Dim, so force `data-theme="dark"` rather than trusting `prefers-color-scheme`. Expect glare from bar lighting and more than one person at the screen — the 20-second selection lock matters more here than anywhere. Seated reading distance ~1000mm, reach ~600mm. Browsing forward is the main activity, so the time filter is the primary control, not an afterthought.

**Rec centre.** Daylight, families, and the widest age range of any venue — and often the one place a neighbourhood's oldest residents already go. So it is the venue this system is most for. Practical consequences: force `data-theme="light"` in a bright hall, mount inside the 380–1220mm reach band so it works seated and from a wheelchair, and assume a first-time user every single time. No onboarding, no accounts, no "tap to begin" — the screen shows today's answer at rest, and touching it is optional. Expect people to walk away mid-interaction, so reset to the default view after about 60 seconds of no touch, and never reset while a code is armed.

**Farmers market / outdoors.** Full sun is the hardest condition in the product and the reason no text role is allowed below AA, anywhere. Force `data-theme="light"` outdoors — a dark screen in sunlight is a mirror. Assume gloved or wet hands, which is another argument for 20mm targets. Assume patchy connectivity: the site map and the armed codes must render from cache, because a market's map is worth nothing if it needs a signal to draw.
