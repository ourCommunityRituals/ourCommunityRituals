# One shape, every layer

The reason this component set is small is that the product is the same structure repeated at six scales. A region contains corridors, a corridor contains events, an event contains a site, a site contains kiosks, a kiosk contains routes. Draw it and it is a web: nodes joined by threads, and the join looks the same wherever you cut it.

```
region ── corridor ── event ── site ── kiosk ── route
   every node: a page · a code · a category · a phase · a map of its children
```

> **This is a composition claim about the API and UI layer. It is NOT a schema.**
> Do not build it as a generic polymorphic nodes+adjacency table — that defeats the
> hardest read this product has ("tonight plus ninety days, local area" on a bar panel),
> which wants flat per-type tables indexed on lat/lng, start/end and category, not
> `WITH RECURSIVE` walks. Compose the children-map at request time from typed child tables.
>
> Three specific consequences:
> - **Phase is computed, never stored.** `now()` against `{start, end}` on the existing row.
>   A stored `phase` column goes stale the moment an organizer moves a start time.
> - **Corridor has no stored identity.** It is an H3 abstraction computed from poster reach
>   (see `60-map-archetypes-and-venues.md`). Do not create a `corridors` table to satisfy
>   the five-things-per-node phrasing.
> - **Category is a column on each existing typed row**, not a new generic entity. Site-map
>   stall sub-categories are a second, smaller enum scoped to stalls — do not conflate them.

## The node

Every node in the web has exactly five things, and no node has a sixth:

1. **A public page.** Reachable without an account, before during and after.
2. **A code.** One UEC short link, `/s/<BASE><SUFFIX>` — see the taxonomy below. This is why
   the category palette has to work at every scale.
3. **A category.** Hue and glyph together — see `30-uec-and-maps.md`.
4. **A phase.** Before, during, after. What a node offers depends on it.
5. **A map of its children**, if it has any. A leaf just has no map.

A route is a leaf. A kiosk is a node whose children are routes. A site is a node whose children are kiosks. Nothing changes but the scale.

## What this buys the design system

**One detail component.** `MapDetail` works at every layer because every layer has the same shape: a name, a when, a where, and a list of things you can do. Tapping a corridor, an event, a stall or a stop all produce the same card. That is not a coincidence to be admired — it is the reason there is one component instead of four.

**One token set.** The `--uec-*-ui` hues and their glyphs mean the same thing whether they are colouring a hex cell, a map point or a route row. A reader learns the vocabulary once, at whatever layer they entered, and it holds everywhere else.

**Three archetypes, not thirty.** `60-map-archetypes-and-venues.md` describes corridor, area and site maps. Those three cover every layer, because what changes between layers is scale and whether points are ordered — not structure.

**Zoom is navigation.** Moving between layers is the primary interaction in the whole product. So it gets the primary treatment: a visible trail of where you are (`Region › Maple corridor › Street Fair › Food row`), every step of it tappable, and a way back out that is always in the same place. For a reader who is not confident, knowing how to get back is what makes them willing to go in.

## Short links: the suffix taxonomy

One base code per event; a single-letter suffix per route. The base is the event, the suffix
is what you are doing. From the live poster: `Event page /s/TRV24` · `Menu /s/TRV24M` ·
`Donate /s/TRV24D`.

| Suffix | Route | UEC |
|---|---|---|
| *(none)* | Event page — the 5Ws | `enter` |
| `M` | Menu | `shop` |
| `D` | Donate | `shop` |
| `S` | Sponsors — who's backing this | `sponsor` |
| `F` | Feedback | `feedback` |
| `H` | Help | `help` |
| `A` | Alert | `alert` |

**This alphabet is normative.** It previously existed only as ad-hoc strings in a preview
fixture, which is three engineers away from three incompatible schemes. A resolver must not
ship before this table is agreed and mirrored in the brain; adding a route means adding a row
here first.

Codes are opaque by design, which is good for the poster and bad for a person's ability to
eyeball where a code goes. Generation must be non-sequential and rate-limited — an enumerable
scheme lets someone walk adjacent events. That is a property of the minting service, not of
this system, but the spec states the requirement.

## Where the hybrid model fits

The two sides meet at the node.

**ourSharedEvents** is the anonymous side — events and magnets. Anyone reaches any node by scanning: no account, no trace, nothing to sign.

**OurWKRP** (ourSharedMosaics, with OurAirwaves) is the plant-your-flag side. An organizer, a vendor, a venue or a listener **claims** a node and speaks from it under a name they chose.

Same node, two relationships to it — that is the hybrid model. That is what lets the web connect at every layer instead of only at the top: a market can be claimed while its individual stalls are not, a stall can be claimed inside an unclaimed market, a corridor can carry claimed and unclaimed events side by side. The web does not need a single owner to be coherent.

The design rule that falls out of this is the most important one in the system:

> **Every surface works with zero identity, and gets better when identity is present. Never the reverse.**

Concretely:

- No screen begins with sign-in. Scanning always resolves to content.
- Claiming is an *upgrade* offered after the value is visible, never a gate before it.
- A claimed node and an unclaimed node look the same to a visitor except for what the claimant added. Claiming buys voice, not prominence — the same principle as the sponsor covenant, one layer up.
- Anything a person accumulates without an account — a saved shortlist from a pre-map, a visited stall — lives on the device and survives without one. Offering to carry it across devices is a reason to claim an identity; losing it is not a punishment for declining.

For the 50–75 reader this is not an architectural nicety, it is the whole difference between using the product and not. An account wall is the most common place this audience stops, and the web is specifically built so there never has to be one.
