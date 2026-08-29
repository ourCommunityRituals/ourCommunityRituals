# OSE-1070 (S2.1) — `tests/e2e` coverage / risk map

> **Pyramid-demotion audit for OSE-1062 (F2).** Classification only — **no code moves.**
> Produced 2026-08-29 against `oursharedevents@be3a7f8`. Mechanical capability detection
> per spec, then spot-verified by reading source.

## Headline

**10 of 133 specs are genuinely only-E2E** (143 of 2094 test blocks).

The ticket estimated ~150 specs / ~20–30 only-E2E. Real inventory is **133 specs** — the
ticket's per-directory counts are exact, only the ~150 headline drifts — and only-E2E is
**lower** than estimated.

## Method, and its limits

| Signal | Detected by | Implies |
| --- | --- | --- |
| Browser | `page.goto/click/fill/locator/evaluate` | needs a browser at all |
| Layout engine | `boundingBox`, `getComputedStyle`, `setViewportSize`, screenshots | component/viewport, real engine, no deploy |
| Edge behaviour | CF-Access, redirects, response headers, 3xx | genuinely only-E2E |
| Network | `request.*`, `fetch(` | contract or integration |
| Filesystem only | `readFileSync`/`readdirSync` with **no** browser call | static — never was E2E |

**Limit — read before acting.** First-pass classifier plus spot-checks, not a per-assertion
review. Specs are classified on file-level capability profile; one edge-dependent assertion
inside an otherwise demotable spec would be missed. Each batch gets an assertion-level read
before it moves, and per the epic's own rule mutation score must hold after each move. This
map does not substitute for that proof.

**No minute estimates.** The ticket asks for "est. minutes saved". Producing those honestly
needs real per-step timings from CI run history, which this pass did not measure. Fabricated
minutes would be precisely the vanity metric the epic exists to kill. Method for getting
them is in *Next*.

## The map

| Target layer | Specs | Tests | Destination |
| --- | ---: | ---: | --- |
| ONLY-E2E (live edge) | 10 | 143 | stays on live staging |
| COMPONENT / VIEWPORT | 47 | 995 | **real-engine Playwright CT on Chromium *and* WebKit** — no deploy |
| INTEGRATION (browser, no edge) | 35 | 483 | in-job miniflare / wrangler dev |
| INTEGRATION (browser + net) | 8 | 90 | in-job miniflare / wrangler dev |
| CONTRACT (API shape) | 4 | 46 | Newman contract tier |
| UNIT (static / code-shape) | 22 | 201 | Vitest — never was E2E |
| UNIT (no browser used) | 7 | 136 | Vitest |

**123 of 133 specs (1951 test blocks) do not require live staging.**

### Engine policy for the component/viewport batch

Per EPIC correction #5 the 47-spec batch runs on a **real layout engine, never jsdom** —
and per F4 device tiering that means **both Chromium and WebKit (Safari)**. Safari is not
optional here: this batch is where responsive layout and computed-style assertions live, and
WebKit is exactly where those diverge from Chromium. Demoting them to a Chromium-only CT
runner would retire less risk than the live-staging run it replaces — a coverage loss
disguised as a cost win, which the equal-or-higher mutation rule is meant to catch.

### Device ladder — mobile / tablet / desktop, and it already exists

The verification target is **mobile, tablet and desktop**, on **both engines**. The device
ladder for this is **already built** — `playwright.config.ts` defines exactly it:

| Project | Class | Note (verbatim from the config) |
| --- | --- | --- |
| `iPhone SE` | mobile (floor) | *"Smallest modern iPhone — the WCAG floor."* |
| `iPhone 14 Pro Max` | mobile (ceiling) | *"Largest current iPhone — validates nothing collapses on wide mobile."* |
| `iPad Air` | **tablet** | `devices['iPad Air 5']` |
| `Desktop Safari` | desktop | `viewport: 1280×900` |

**It is quarantined.** That config's `testDir` is `tests/playwright`, and it is driven by a
separate workflow (`mobile-workability-audit.yml`) against a single spec. The demoted
component/viewport batch should **point at this existing ladder**, not have a new one built.

The one real gap: every project in that ladder carries a Safari/WebKit UA — there is **no
Chromium column**. So the target matrix is **{Chromium, WebKit} × {mobile, tablet, desktop}**
= 6 projects, of which the WebKit column exists today and the desktop-Chrome cell exists in
`e2e-smoke`/`e2e` configs. This is assembly of proven parts, not new infrastructure —
`npx playwright install --with-deps chromium webkit` is already in CI
(`oursharedevents-ci.yml:1356`). Related in-flight: OSE-1058/1059.

## MINE-0 (OSE-852) — Gate 0 confirmed, with a concrete instance

MINE-0's zero-discovery claim is **confirmed** on at least one step. Checking every
`npx playwright test` invocation in `oursharedevents-ci.yml` against its config's `testDir`:

```
L1512  T4e: Attendee Arc Journey
       --config=playwright.e2e-smoke.config.ts   (testDir: ./tests/e2e)
       tests/ui/smoke/journey-attendee-arc.smoke.spec.ts   <-- OUTSIDE testDir
```

Playwright filters positional arguments against `testDir`, so this step **discovers zero
tests and exits 0**. The file exists, which is why it reads as fine.

**This step is insulated from going red three separate ways**, any one of which would be
enough on its own:

1. the positional path lies outside the config's `testDir` → zero discovery;
2. a Playwright run that discovers nothing exits 0 → green;
3. the step carries `continue-on-error: true` → even a genuine failure is swallowed.

That is the same shape as OSE-834 (*"a blocking tier goes green on an empty staging
database: the seed step is `continue-on-error`"*). MINE-0 records **two** zero-discovery
steps; static analysis evidences **this one**. The second is not disproven — it may live in a
path-glob or a config default this method cannot resolve — but it is not evidenced here, and
should not be reported as confirmed until it is.

All other invocations resolve inside their `testDir` and their paths exist.

## The `0-architecture` finding — the safest batch, and it isn't a demotion

**22 of 25 `0-architecture` specs never open a browser**, yet CI runs the whole directory
against live staging (`playwright test --config=playwright.e2e-smoke.config.ts tests/e2e/0-architecture/`).

These specs **declare their own tier in their headers**:

```
Pyramid coverage for this invariant:
  L0 STATIC (this file)   — code shape: ...
  T4 DEPLOYED (planned)   — runtime spec against staging
```

1. **They were never E2E.** Moving them is a relocation to the tier they already name, not a
   judgement call. Mutation score cannot fall — no browser assertion is removed. Lowest-risk
   batch in the F2 line, and the natural first move once F1's baseline exists.
2. **Their genuine T4 counterparts are marked `planned` — unwritten.** The live-edge coverage
   these invariants are supposed to have does not exist. Relocating the static half makes that
   gap visible instead of hiding it behind a green E2E directory. A coverage finding, not only
   a cost finding — it belongs in F5's risk manifest.

Consistent with EPIC correction #2 (reconciled pyramid preserved): the multi-layer
corroboration is by design in these files. Nothing collapses to one layer — the L0 half moves
where it says it belongs, and the T4 half gets written.

## Genuinely only-E2E — the 10 that stay

| Spec | Tests |
| --- | ---: |
| `tests/e2e/3-flows/sponsor-journey.spec.ts` | 25 |
| `tests/e2e/4-negative/surface-navigation-negative.spec.js` | 22 |
| `tests/e2e/stage-2/staging-worker-cutover.spec.js` | 21 |
| `tests/e2e/stage-2/html-surfaces.spec.ts` | 13 |
| `tests/e2e/2-pages/sponsor-page-gating.spec.js` | 12 |
| `tests/e2e/1-smoke/api-contract.spec.js` | 11 |
| `tests/e2e/1-smoke/security-smoke.spec.js` | 10 |
| `tests/e2e/0-architecture/geo-resolution.invariant.spec.ts` | 10 |
| `tests/e2e/3-flows/forms-shortlinks-qr.spec.js` | 10 |
| `tests/e2e/1-smoke/critical-smoke.spec.js` | 9 |

## Additional flow matrix — and why it does not multiply out

Requested coverage adds three axes on top of the device ladder:

| Axis | Values |
| --- | --- |
| Config path | wizard · advanced |
| Event scope | Local · Regional · Enterprise |
| Sponsor class | Local · Regional · National |

Multiplied naively against the 6-project device matrix that is
**2 × 3 × 3 × 6 = 108 live-staging combinations** — the exact cost explosion this EPIC
exists to prevent. It does not need to be paid, because **the three axes are not the same
kind of axis.**

### Sponsor class is an invariance axis, not a differentiating one

Under Invariant #25 `sponsor_share_covenant` and #5 `tier_equity`, sponsor class **must not
drive presentation**. So this axis does not produce three expected renderings to assert —
it produces **one assertion, iterated across the axis, that the rendering is identical**.

```
WRONG SHAPE   3 classes × 3 expected outputs           = 3 specs, and it encodes the covenant violation
RIGHT SHAPE   1 spec iterating all classes, asserting  = 1 spec; adding a 4th class costs nothing
              identical geometry / typography / size
```

This is already the shape OSE-854 uses (D1/D2/D3, Q1/Q2, P1: *"every `display-sponsor-item`
returns an identical `boundingBox()`"*). The axis multiplies the **fixture**, not the spec
count. It does need the real layout engine and the device ladder, because that is where a
tier-driven size difference would actually show — so this is the one axis that legitimately
crosses with {Chromium, WebKit} × {mobile, tablet, desktop}.

### Event scope is a genuine differentiating axis — and it is cheap

`Local | Regional | Enterprise` resolves through `src/lib/feature-flags.ts` and
`src/handlers/feature-flags.ts` — it gates **features**, so the three values genuinely have
different expected outputs. But feature-gate resolution is pure logic: it belongs at
**Vitest unit**, not live staging. Only where a scope changes a *rendered surface* does it
need a browser, and then only once per surface, not once per scope × device.

### Config path is an equivalence axis

`wizard | advanced` are two entry paths to the same end state. The high-value assertion is
not "each path works" twice over, but that **both converge on equivalent event state** — a
single equivalence/metamorphic test at the integration layer. `tests/e2e/3-flows/admin-wizard-flow.spec.js`
already covers the wizard path end-to-end (12 tests incl. keyboard + mobile viewport); the
advanced path needs its counterpart plus the one equivalence assertion, not a parallel suite.

### Net effect

| | Combinations |
| --- | ---: |
| Naive full cross-product on live staging | **108** |
| Sponsor covenant, iterated, across the device ladder | 6 |
| Event scope at unit + one render check per surface | ~cheap, no live staging |
| Config-path equivalence at integration | 1 |

The axes collapse because two of the three are not presentation axes at all. This is the
same lever as the `0-architecture` finding: the saving comes from putting each assertion
where it belongs, not from asserting less.

## Blocker for the sponsor axis — the vocabulary does not exist yet

**Three incompatible sponsor vocabularies are live simultaneously:**

| Surface | Vocabulary | Evidence |
| --- | --- | --- |
| admin CSS ladder | `title` `platinum` `gold` `silver` `bronze` `primary` | `admin.html:935-958`, applied at `:2949` |
| reporting / data | `local` `mid` `premium` | `local-impressions`, `sponsor-class-row-local\|mid\|premium` |
| **requested for testing** | **Local · Regional · National** | this request |

**A spec written against `Regional` or `National` today binds to no testid and no class.**
The sponsor axis cannot be implemented until this is reconciled — tracked as **OSE-1011**
(*first-pass legibility: tier nomenclature reconciliation*). That ticket is a prerequisite
for the sponsor axis and should be linked as such.

**Open question, not a finding.** `admin.html` renders `spon-tier-pill` with the tier as a
CSS class against a six-rung colour ladder. Whether that is a #25 violation or legitimate
descriptive labelling is a **decision, not something this audit should assert** — OSE-854
already ruled the analogous `advanced-metrics-tier-badge` legitimate because it labels depth
rather than ranking a sponsor, and an operator-facing admin table naming a tier may fall the
same way. Recorded here so the reconciliation makes the call explicitly. It is distinct from
the confirmed rendering violations in OSE-878 (display 64px vs 48px) and OSE-864 (poster
40/34/28/22px), which are attendee-facing.

## Blocking caveat — this map is measured over a suite that may not run

`tests/e2e` carries **185 skip guards**, and the repo contains
**zero** `test.fixme` — no annotated skips exist anywhere. OSE-852 (MINE-0) records this class
at 288 repo-wide; the current count is higher.

This bears directly on F2's proof mechanism. F1's mutation baseline (OSE-1066) would be computed
over a suite whose *executed extent is unknown*, and demotion validated against that same
baseline — so the score can hold steady **because both measurements share the blindness**, not
because coverage held.

**Recommended DAG edge: OSE-1066 `blockedBy` OSE-852.** Correction #3 already blocks demotion on
the baseline; nothing blocks the baseline on the harness being honest.

## Next

1. **OSE-852 (MINE-0)** — before any mutation baseline.
2. **Minutes**: pull per-step durations from CI run history for the Playwright steps and join on
   this map's spec→step mapping. That yields defensible minutes; nothing else does.
3. **Assertion-level read of the 47-spec component/viewport batch** — largest group, and
   where a stray edge-dependent assertion is most likely to hide.

