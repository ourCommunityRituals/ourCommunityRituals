# Brain canon — what governs this system

This design system is a **spoke-shaped artifact living in the hub tier**. `@ocr/ui` is a
shared package serving both ourSharedEvents and ourWKRP, so nothing here is an OSE-local
decision. What governs it is `OCR-docs` — the shared brain — not this repo.

Read this page before changing a token. Everything below was checked against
`ocr-docs-brain/architectural-invariants.yaml` and
`docs/architecture/OCR_ARCHITECTURE_oseOwHybridDesignBrief.md` §11.

## The tier map

```
Shared Brain / OCR-docs   canon, invariants, live-read enforcement scripts
        │
   ourCommunityRituals    the hub — @ocr/ui, @ocr/flags, @ocr/tokens
        ├── ourSharedEvents   anonymous base of the choice infrastructure
        ├── ourWKRP           named, plant-your-flag
        ├── ourSharedMagnets  Bruno API testing, solution engineering, custom md-driven sites
        └── ourAirwaves       the flag verticals — art, sports, community service,
                              spoken word, science, academics, …
```

## Invariant #22 — Cross-Repo Import Isolation (`live`)

**This system is explicitly permitted.** The invariant states:

> *"Shared OCR packages (@ocr/flags, @ocr/ui under packages/) are explicitly permitted —
> they are designed cross-product packages."*

So a design system spanning OSE and OW is sanctioned, not a wall violation. What the
invariant forbids is a **module-level import** across the OSE/WKRP boundary, because that
would couple two opposite identity models in code. The one permitted data flow is the HTTP
seam at `GET /api/events/:id/music`, Pact-tested, with CORS controls.

Enforcement is `enforcement_kind: brain_script` — the canonical guard is brain-resident and
live-read from `OCR-docs/main`, with a per-product `block`/`warn` plane. OSE blocks today;
WKRP and OAW run `warn` until their side of the seam lands (OW-112).

**The permission covers the dependency structure, not the content.** A shared package whose
stylesheet silently drops a third of OW's classes is still a defect — see `CONSUMING.md`.

## Invariant #14 — Mobile Workability (`partial`)

| Canon floor | This system | |
|---|---|---|
| Tap targets ≥ 44×44 pt | 48px (`--tap-min`), 56px primary | exceeds |
| Input font-size ≥ 16px — suppresses iOS auto-zoom | 16px, same reason | **meets exactly** |
| Text contrast WCAG AA minimum on every readable surface | AAA 7:1 | exceeds |
| Primary CTA above the fold on the floor viewport | not specified | **GAP** |
| No horizontal scroll at 375px | specified 320–390px, floor not named | **GAP — named now: 375px** |

**The floor viewport is iPhone 13 Mini, 375×812.** iPhone X / XS / 11 Pro share it; 390+
passes by being wider; Android 360px is a separately verified edge case. Design to 375.

The invariant also carries a `design_system_dependencies` record that reads
`"ose: ouroboros-ds (Button, Input, Card)"`. **That record is unverified and probably stale** —
the same block says `"osm: n/a — Postman tooling, no customer UI"`, and OSM is Bruno-based
with md-driven custom sites. Do not treat it as authoritative until someone reconciles it.

## Invariant #3 — UEC Encoding (`live`, mechanically gated)

A brain test computes WCAG contrast for every `scan_hex` against white and asserts the
declared grade. So the `-scan` variants here are **gated canon** — changing one without a
brain amendment breaks a live gate.

`--uec-*-ui` is a **third variant this system introduces** and the brain does not declare.
It must be proposed as a brain amendment, not shipped hub-local. Until it is, treat it as
provisional.

Canon requires **word + path + tier on every code** and *"pairwise CVD separation checked
computationally."* That is stronger than this system's "hue + glyph" — the word is mandatory,
not a nicety, and colourblind separation is a computation the brain already runs rather than
a judgement made by eye.

## §11 Design language — the source this system should have been built from

- **Mobile-first, dark default.** OSE navy/blue; **ourWKRP amber-on-black**. Brand affects
  chrome only — UEC hues never re-theme. See `20-colour-and-contrast.md` for the verified
  `[data-brand="ow"]` values.
- **Copy is load-bearing and plain.** The privacy promise is stated as fact, in situ.
  Canonical strings, to be used verbatim rather than paraphrased:
  - "no account · nothing stored"
  - "You picked this area. We didn't look."
  - "We count the room, never the person."
  - "The act of choosing is the consent."
  Legal-ese never appears on an attendee surface.
- **Honest at any density.** Empty and quiet states are designed first — they are the common
  case: day-one corridors, below-floor nights, dormant stages.
- **Structure encodes truth** — see below.
- **Accessibility floor:** AA on all scan colours, pairwise CVD separation computed,
  word + path + tier on every code, 44px+ targets, one-tap flows. *"A vote is one tap;
  a scan is the only gesture."*
- **Nothing may overclaim.** The platform *underclaims by construction*, and that is the brand.

## Structure encodes truth

A non-colour encoding channel, and the answer to a problem colour cannot solve: the flag
verticals in ourAirwaves are an open-ended set, and an unbounded taxonomy cannot be
hue-encoded at all. Canon resolves it — a new vertical changes **the taxonomy row, not the
engine**.

| Form | Means |
|---|---|
| **Solid** border or fill | Counted. Real, measured, in the aggregate. |
| **Dashed** border | Claimed, dormant, or planned. Not counted. |
| **Held** (muted + a stated reason) | Suppressed with reason — below the count floor, or withheld. |

Status chips distinguish **live / rollout / planned**. This is mandatory on any surface that
shows a number or a place: a dashed hex on the corridor map means claimed-not-counted, and a
held one carries its reason in words. Never communicate this with colour alone, and never let
a planned thing render as though it were counted.

## What this system still owes canon

1. `--uec-*-ui` needs a brain amendment against invariant #3.
2. "Primary CTA above the fold at 375px" is unspecified here.
3. The canonical copy strings are not yet wired into the component defaults.
4. `ouroboros-ds` vs `@ocr/ui` must be reconciled in invariant #14.
5. **There is no design contract in the brain to be held against.** This was previously
   written here as "brain-parity and shared-gate-drift don't cover it", which was wrong:
   `brain-parity` runs the brain's own pyramid against `flags-contract.yaml` and is
   flags-specific; `shared-gate-drift` checks vendored Python modules. Neither is a
   generic canon hook, and `flags-contract.yaml` has no design counterpart. The fix is a
   brain PR proposing `design-contract.yaml` — see
   `docs/decisions/ADR-design-system-brain-canon.md` in the hub.

   Meanwhile the floors ARE enforced, hub-locally: `packages/ui/tests/contrast-matrix.test.ts`
   runs 48 assertions across every ink role × ground × theme and is in the gate, and
   `stylesheet-tokens.test.ts` fails on any literal colour in the stylesheet. Real
   enforcement — but the brain does not know the contract exists, so a spoke can diverge
   without anything going red.
