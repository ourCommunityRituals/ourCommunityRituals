# OSE-1167 / OSE-1181 — SharedReport permutation matrix: design

> **Status:** Draft for owner ratification (see §10). **Date:** 2026-09-02.
> **Epic:** OSE-1167 (CI redesign) → Feature C OSE-1172 → Story C2 OSE-1181, with prereqs in C1 OSE-1180.
> **Verified against:** `ourSharedEvents@81c98aa` (post OSE-1191 Bruno merge, PR #445) and `OCR-docs@793c038`.
> **Lands in:** this hub repo (design + cross-repo reconciliation), then OSE (code, fixtures, CI) and OCR-docs (standards + brain). Routing per `OCR_STANDARD_knowledgeHomes.md`: one home per truth, everything else points. §9 says which piece goes where.

## 0. What this doc decides

The epic's owner-ratified direction is settled: layer by cost, push every assertion to the lowest honest layer, exhaustive auth/contract matrix at the API layer, thin UI. This doc turns the SharedReport half of that into something buildable:

1. The exact **axes and cells** of the tier × event-state × section matrix, derived from code rather than hand-written.
2. The **expected wire result per cell**, so a cell is a row in a table, not a bespoke test.
3. Where each assertion **honestly lives** (L0 unit / L1 API matrix / L2–L3 UI), seeding the SharedReport rows of the Security Ledger (F1, OSE-1185).
4. The **skip self-classification contract** the epic's DoD demands, in a form a guard script can count.
5. The **prerequisites** that are owner-boundary (secrets, fixtures) versus agent-buildable.
6. Reconciliation findings surfaced while grounding this: the current spec is stale, not just masked; and OSE-1194's scope is missing this hub repo.

It does not reorder any YAML. Honest-green-first still applies: the matrix is what makes T4f honest; the reorder (B1, OSE-1178) comes after.

## 1. Ground-truth findings (read before building)

Each item was verified by reading source at the SHAs above. They change the plan, so they come first.

**F1 — The masked spec is broken, not merely skipped.** `tests/e2e/3-flows/sharedreport-depth.spec.ts` asserts `body.depth === 'premium'` and reads `body.upgrade` at the top level. The handler (`shared-report-read.ts`, `handleGetSharedReport`) returns `{ ok, report }` with no `depth` field, and places `upgrade` **inside** `report` (OSE-816). The unit spec `shared-report-read.spec.ts` ("single endpoint response has no depth or upgrade field", and the OSE-816 block) confirms the current shape. Consequence: minting the four `SMOKE_RPT_*` secrets would not turn T4f green; it would turn it red on 3 of the 8 skipped tests. The ticket's "seed the tokens so T4f actually runs" step needs a rewrite of the spec, which is exactly what the matrix replaces.

**F2 — `corridor_map` is a MID section, not premium-only.** `report-depth.ts` `DEPTH_SECTIONS.mid` includes `corridor_map` (OSE-682, ratified 2026-08-10). The epic text, OSE-1172 and OSE-1181 all say "corridor_map premium-only", and the existing spec asserts "MID → no corridor_map". Both are stale against code. The section axis of the matrix must therefore be **generated from `DEPTH_SECTIONS`** and snapshotted, never typed by hand (same pattern as Invariant #21's `shared-report.snapshot.json`).

**F3 — Sponsor depth caps at mid; "ADMIN/premium" is a role, not a sponsor tier.** `resolveDepth` returns premium for `admin`, `bar_owner`, `internal`, ignoring any depth claim. A sponsor claiming premium fails closed to **local**. A sponsor with no `sponsor_id` sees zero impression rows (OSE-595), and the mint endpoint refuses to mint such a token at all. So the viewer axis is a set of **roles × claims**, not a five-value tier list.

**F4 — "Ended" is not a phase; the API does not gate on phase at all.** The brain's `event-phase-contract.yaml` defines phase ∈ {pre_event, event, post_event}, derived from `status` + dates, and states the SharedReport phase gate is a **rendering** gate ("phase = post_event gates full-report rendering"). `handleGetSharedReport` never reads `events.status`; the only phase-sensitive behaviour on the wire is `Cache-Control` (max-age 300 while `end_date` is null or future, 3600 after). "Ended" in the ticket maps to `status='archived'` (forces post_event) and is invisible to the API. Consequence: at L1 the event-state axis asserts cache headers and null-section/suppression shape; the "no full report before post_event" rule is **UI-only** and belongs in E1 (OSE-1184), not the L1 matrix. This is a Security-Ledger carve-out the CCR verdict predicted ("nearly all API-provable" was overstated).

**F5 — 409 MATERIALIZATION_PENDING is not the pre-event answer.** `buildSharedReport` returns `MATERIALIZATION_PENDING` only when the event has **no `start_date`**. A scheduled pre-event with no scan rows returns 200 with `unique_gatherings: null` and `_meta.suppression_reasons[]`. So the matrix has one singleton 409 cell (an event with null start_date), not a whole 409 row for the pre phase.

**F6 — A second mask sits above T4f.** The `Seed smoke fixtures` step in `T4 Functional → Staging` is `continue-on-error: true`. If the seed fails, T4d/T4e/T4f run against whatever staging happens to hold and skip "cleanly". This belongs in Story A (honest-green floor): a failed seed must be a visible distinct status, not green.

**F7 — CI identity self-certifies object scope (CCR must-fix #1, confirmed in code).** `isAdminObjectInScope` returns `true` unconditionally when `scope.mode === 'all'`, which is the key-actor + `ADMIN_SCOPE_ALL=true` path CI uses. Any cross-brand cell run under that identity proves nothing. The matrix uses `ADMIN_KEY` **only for the mint call**; object-scope cells authenticate as a scoped-email operator via `ADMIN_BRAND_MEMBERSHIP`.

**F8 — The engine is Bruno now, and the legacy Bruno SharedReport collection is GAS-era.** OSE-1191 is Done (PR #445). The T2 job is `T2 Contract → Staging (Bruno)` and runs `npx bru run . -r --env ose-staging --reporter-junit`. `bruno/ose-sharedreport/` still targets `api_getSharedAnalytics`-style behaviour (`gate_test_event_f6`, "Export to Sheets"); so do the four Event-POV Playwright specs the epic names (`shared-reporting.spec.js`, `admin-surface-sharedreport.spec.js`, `shared-report-mobile.spec.js`, `shared-report-name-resolution.spec.js`), which drive `api_getSharedAnalytics` and Sheets export. Under Invariant #10 (deprecation lock) these are candidates for retirement, not folding. §8 lists the disposition.

**F10 — Live tenant-isolation gap in `headcount_trend` (CCR Loop 1, backend lens; verified by the lead).** `event_series` (migration 0033) has no `brand_id`. The auto-detector (`shared-report.ts`, series detector) clusters on `location` + weekday + hour with no brand predicate, and the trend read (`shared-report-builder.ts`, instances query) selects every event with the series id, again with no brand predicate. Two brands sharing one venue string on the same cadence cluster into one series; once an admin confirms it, a premium viewer on one brand's event receives the other brand's per-instance `unique_gatherings`. Aggregate-only and K-floored, so never-who holds, but Invariant #9 (`tenant_isolation`) does not. This predates the matrix and is Security-owned now: read-time `AND brand_id = ?` bound to the anchor event (the one-line stop), the same predicate in the detector (defence in depth), a data audit for existing cross-brand series, and a new matrix cell asserting every `headcount_trend.instances[].event_id` shares the token event's brand (§3.6).

**F11 — T4f is double-masked.** Beyond the seed step (F6), the `T4f` step itself is `continue-on-error: true` with no `Fail check` behind it, while the sibling `T2 Contract → Staging (Bruno)` job already pairs `continue-on-error` with an explicit `Fail check` step that reads `steps.*.outcome` and exits 1. T4e in the same job had its mask removed under OSE-852 for exactly this reason. Cheapest change in the whole programme: remove the line, add the T2-style fail check.

**F12 — The current sponsor-isolation test asserts nothing on today's fixtures.** `sharedreport-depth.spec.ts` guards its isolation assertions with `if (impressions.length > 0)`; the fixture SQL seeds no placements or aggregates, so the branch never runs and the test passes with zero assertions. The matrix spec must not inherit this: every sponsor cell asserts a minimum row count on B3/B4 or emits `SKIP[precondition-unmet]` (§6), and distinguishes "nothing scanned yet" on B1/B2 from "fixture not seeded".

**F13 — The "post_event gates full-report render" rule exists nowhere.** `shared-report.html` (signed-link render path) has no phase or status branch; it renders whatever `report.*` contains. E1 (OSE-1184) is therefore a **build** story with a design question, not a test-coverage story, and the brain contract's "phase = post_event gates full-report rendering" line describes intent, not code. Owner ruling needed (§10, M-Q7).

**F9 — OSE-1194 scope omits this hub repo.** The retirement ticket lists OSE files and the OCR-docs brain invariant #11. This workspace also carries self-hosted runner apparatus: `packages/runner-fleet/` (with `runner-fleet:*` scripts in the root `package.json`), `_provision-runner-4.ps1` and `_reregister-runner-3.ps1` at the root, and `docs/methodology/ocr-recon-fleet-dispatch-runbook.md` referencing runner workers. Nothing here is deleted by this PR; it is a scope addition for OSE-1194 item 5, to land in lockstep with the brain PR (item 4).

## 2. Vocabulary (do not invent a fourth tier axis)

| This doc | Code | Source |
| --- | --- | --- |
| **Viewer** | signed-link `role` ∈ {bar_owner, sponsor, admin} + service class ∈ {internal, cross_product} | `shared-report-auth.ts` |
| **Depth** | `ReportDepth` ∈ {local, mid, premium}; sponsor max = mid | `report-depth.ts` |
| **Phase** | {pre_event, event, post_event}; archived forces post_event | `event-phase-contract.yaml` |
| **Section** | top-level key of the `report` object | `DEPTH_SECTIONS` |

Flag tiers (free/mid/enterprise) and display tiers (title…primary) are **not** matrix axes; the tier-vocabulary equity assertion checks they never appear on the wire.

### 2.1 Where this matrix sits in the six-axis model (owner, 2026-09-02)

The owner's fuller model has six axes: **Depth, Scope, Composition, Tier/flags, Role, Stateful config**, with privacy-by-construction as the enterprise unlock. That model is captured in OCR-docs, `docs/proposals/PROPOSAL_sharedreport-six-axis-model-and-privacy-unlock.md`, including a verified clash/dovetail analysis against code and the test derivation for every axis. This doc is the **CI leg** for the axes that exist in code today:

| Axis | This doc | Status in code |
| --- | --- | --- |
| Depth | §3.1 A5–A7, A10–A11; §3.3 | live (`report-depth.ts`) |
| Scope | sponsor slice on every sponsor cell; §3.4 brand object scope | live (OSE-595, OSE-1080) |
| Phase (event state) | §3.2 | live, API phase-blind (F4) |
| Composition, Tier/flags, Role, Stateful config | not here | not built; see the proposal §3 (the differencing-oracle clash C3 gates them) |

Adding those axes later means adding rows to the same cells file, not a new harness.

## 3. The matrix

### 3.1 Axis A — viewer (12 values)

| # | Viewer cell | How the request is built | Expected |
| --- | --- | --- | --- |
| A1 | no token | no `Authorization` header | 401 `UNAUTHORIZED`, `WWW-Authenticate: Bearer` |
| A2 | malformed token | `Bearer not.a.token` | 401 `UNAUTHORIZED` |
| A3 | expired token | mint with `ttl_days:1` is the floor, so expiry is proven at L0 (unit), **not** L1; the cell is recorded as `covered-at: L0` | n/a at L1 |
| A4 | wrong-event token | token minted for `evt_smoke_pre`, sent to `evt_smoke_post` | 403 `FORBIDDEN` |
| A5 | sponsor @ local | mint `{role:'sponsor', depth:'local', sponsor_id:'sp_test'}` | 200, local sections, `upgrade.next_depth='mid'` |
| A6 | sponsor @ mid | mint `{role:'sponsor', sponsor_id:'sp_test'}` (depth defaults to mid) | 200, mid sections, `upgrade.next_depth='premium'` |
| A7 | sponsor claiming premium | mint `{role:'sponsor', depth:'premium', sponsor_id:'sp_test'}` | 200, **local** sections (fail-closed), `upgrade.next_depth='mid'` |
| A8 | sponsor without sponsor_id | mint refused | 400 `sponsor_id is required` (mint-time cell) |
| A9 | sponsor not placed on event | mint `{sponsor_id:'sp_not_placed'}` | 400 `sponsor_id does not belong to this event` (mint-time cell) |
| A10 | bar_owner | mint `{role:'bar_owner'}` | 200, premium sections, **no** `upgrade` key |
| A11 | admin | mint `{role:'admin'}` | 200, premium sections, no `upgrade` |
| A12 | cross_product service token (batch) | `WKRP_SERVICE_TOKEN` on `POST …/shared-reports/batch` | 403 `CROSS_PRODUCT_ACCESS_PENDING`, no data |

A12 and the `internal` class are already exercised at L0 by `shared-report-read.spec.ts`; A12 stays in the matrix as the one live tripwire because it is the anonymity boundary (ADR-0001). Object-scope cells on the **mint** endpoint are a separate pair, §3.4.

### 3.2 Axis B — event phase (4 fixtures + 2 singletons)

| # | Fixture | `status` | Dates (relative, never rot) | Wire expectation |
| --- | --- | --- | --- | --- |
| B1 | `evt_smoke_pre` | active | start +2d | 200; `unique_gatherings:null`; suppression reasons present; `Cache-Control: private, max-age=300` |
| B2 | `evt_smoke_live` | active | start −1h, end +3h | 200; `max-age=300` |
| B3 | `evt_smoke_post` | active | end −7d | 200; `max-age=3600`; seeded aggregates ≥ K so sections carry values |
| B4 | `evt_smoke_archived` **(new)** | archived | end −30d | 200; `max-age=3600`; identical body shape to B3 (API is phase-blind, F4) |
| B5 | `evt_smoke_nostart` **(new)** | active | start null | 409 `MATERIALIZATION_PENDING` (singleton, admin token) |
| B6 | nonexistent id | — | — | 404 `NOT_FOUND` with a valid token for that id (singleton) |

B1–B3 exist in `tests/ui/smoke/fixtures/smoke-events.sql`. B4 and B5 are additions to the same file. B4 is the honest reading of the ticket's "ended": it proves the API does **not** change on archive, which is the property the UI gate in E1 relies on.

### 3.3 Axis C — sections, generated

The expected present/absent set per (viewer, phase) is **derived** from `DEPTH_SECTIONS` and the two special rules in `filterReportByDepth`:

- `sponsor_impressions` is scoped to `sponsor_id` for sponsor tokens (every row's `sponsor_id === 'sp_test'`), unfiltered for bar_owner/admin.
- `sponsor_class_breakdown` and `_meta` are present at every depth (OSE-719).
- `upgrade.locked_sections` equals `DEPTH_SECTIONS[next] − DEPTH_SECTIONS[depth]`, restricted to keys the built report actually has.

Today (F2) that yields:

| Depth | Present | Absent | `upgrade.next_depth` |
| --- | --- | --- | --- |
| local | event_id, event_title, event_start_date, event_end_date, unique_gatherings, sponsor_impressions, sponsor_class_breakdown, _meta | campaign_summary, poster_attribution, return_rate, corridor_density, **corridor_map**, headcount_trend | mid |
| mid | local + campaign_summary, poster_attribution, return_rate, corridor_density, **corridor_map** | headcount_trend | premium |
| premium (bar_owner/admin) | everything | — | (no `upgrade` key) |

Plus the cross-depth wire checks that apply to every 200 cell: no `"sponsor_tier"`, `"flag_tier"`, `"free"`, `"enterprise"` in the text; no `anon_id`/`anon_id_hash`; no `corridor-map`/`hex-cell` markup in JSON; `_meta.suppression_reasons[].detail` contains no raw H3 cell id; `Vary: Authorization`.

### 3.4 Object-scope pair on the mint endpoint (BOLA, CCR must-fix #1)

| # | Identity | Target | Expected |
| --- | --- | --- | --- |
| S1 | scoped operator, brand `ose` (via `ADMIN_BRAND_MEMBERSHIP`) | `POST /api/v2/admin/events/evt_smoke_post/shared-report/mint-link` | 200 |
| S2 | same operator | mint-link on an event owned by another brand (`evt_smoke_otherbrand`, **new** fixture, `brand_id='sp_other'`) | 403/404 per `isAdminObjectInScope` deny path |

Both run **without** `ADMIN_SCOPE_ALL` on the identity. If the job cannot obtain a scoped identity, S1/S2 skip as `precondition-unmet`, and the summary shows that, never green.

### 3.6 Tenant-scope cell on `headcount_trend` (F10)

| # | Fixture | Expected |
| --- | --- | --- |
| T1 | a confirmed series whose members span `brand_id ∈ {ose, sp_other}` at one venue string (**new** fixture rows) | premium token on the `ose` member: every `headcount_trend.instances[].event_id` resolves to `brand_id = 'ose'`; the `sp_other` instance is absent, not nulled |

Red today. Goes green with the read-time predicate. This is the first proof of the doc's own claim that adding a cell is a row, not a harness.

### 3.5 Cell count

| | Today | Matrix |
| --- | --- | --- |
| viewer × phase cells | 5 (all on `evt_smoke_post`, 8/9 skipped) | 8 read-viewers (A1,A2,A4–A7,A10,A11) × 4 phases = **32** |
| singletons | 0 | A8, A9, A12, B5, B6, S1, S2 = **7** |
| section assertions per 200 cell | 2–4 | ≈ 14 (present + absent + upgrade + scope + wire checks) |
| **total requests per run** | 9 | **39**, ≈ 20 of them mints |

Adding a section, a depth, or a fixture is one row; the generator recomputes the rest.

## 4. Engine and system of record

Owner decision (CCR loop, 2026-09-02): **hybrid**. Code-parametrised tests are the gating system of record; Bruno is for exploration/onboarding and PR-reviewable contract examples. Concretely:

1. **`tests/api/sharedreport-matrix.cells.json`** (OSE) — the committed cell table: one object per cell with `viewer`, `phase`, `expect.status`, `expect.present[]`, `expect.absent[]`, `expect.upgrade`, `expect.cacheControl`, `expect.scope`. Human-readable in a PR diff.
2. **`tests/unit/sharedreport-matrix.derivation.spec.ts`** (OSE, T0 unit shard) — regenerates the table from `report-depth.ts` and fails if the committed JSON differs. This is what makes F2-style drift visible at PR time instead of at the nightly sweep. It is the Invariant #21 snapshot pattern applied to entitlement.
3. **`tests/api/sharedreport-matrix.spec.ts`** (OSE) — Playwright `request`-only (no browser), `test.each(cells)`. Setup mints every needed token once per run with `ADMIN_KEY`, `ttl_days:1`, and stores them in memory only. Runs under `scripts/pw-guarded.sh` with the all-skipped extension (§6). Named check: **`L1 API · sharedreport-matrix`**.
4. **`bruno/ose-sharedreport-matrix/`** (OSE) — generated from the same cells file: one `.bru` per cell, `bru run --env ose-staging` from the command line. Non-gating; retire the GAS-era `bruno/ose-sharedreport/` when it lands.

The matrix is the **Newman collection the tickets describe, rebased onto Bruno and onto code** per OSE-1191 and the CCR verdict. Update the wording in OSE-1172/OSE-1181 ("Newman/Postman collection") when C2 starts.

### Token hygiene (CCR must-fix #2)

- `ttl_days: 1` on every mint; tokens live in process memory, never in `$GITHUB_ENV` or artifacts.
- Playwright `request` failures echo headers. The matrix spec wraps every call so that a failure prints `Authorization: Bearer <redacted:len=N>`; a static unit test asserts the raw header never reaches `console`/reporter output (mutation-test candidate for G1).
- Staging `ADMIN_KEY` ≠ prod `ADMIN_KEY` is an OSE-1191 Part 2 rotation item, owner boundary; the matrix does not run until it is confirmed.
- Mint rate limit is real, not noise: the mint key is `mint:<clientIp>:<eventId>` capped at `RATE_LIMIT_MINT_MAX = 10` per minute, and 7 of the 8 viewer cells mint against one event from CI's single egress IP. The setup **serialises mints per target event with backoff from the first PR**, never `Promise.all`. Side note, low severity: that limiter runs before `requireAdmin`, so an unauthenticated caller can pollute the bucket and lock a legitimate admin out of minting for one event for a minute (pre-auth DoS); record it, do not block on it.
- The JSON reporter the guard extension parses does not exist yet: `playwright.e2e-smoke.config.ts` and `playwright.ui-smoke.config.ts` emit `html` + `line` only, and `retries: 2` on CI produces a `flaky` bucket the all-skipped rule must classify (a retried-then-passed test is a pass, and is counted). §6's extension is new infrastructure with a negative control, not a tweak.

## 5. Layer assignment — Security Ledger seed rows for SharedReport

Lowest honest layer per assertion. "Already" means an existing test proves it today at that layer.

| Assertion | L0 unit / static | L1 API matrix | L2/L3 UI | Notes |
| --- | --- | --- | --- | --- |
| no token / bad token / expired → 401 | already (`shared-report-read.spec.ts`) | A1, A2 tripwire | — | expiry stays L0 (A3) |
| token event ≠ path → 403 | already | A4 | — | |
| sponsor capped at mid; premium claim → local | already (OSE-816 block) | A7 | — | |
| sponsor without sponsor_id sees no rows; mint refuses | already | A8 | — | |
| sponsor slice isolation (`sp_test` only) | already (Q6 tests) | every sponsor cell, all phases | — | live data proves the SQL path, not just the filter |
| campaign_summary re-derived after scope | already | sponsor cells on B3/B4 | — | needs multi-sponsor campaign fixture to be non-vacuous |
| section set per depth, `upgrade.locked_sections` | already | all 200 cells | — | generated (§3.3) |
| `sponsor_class_breakdown` at every depth | already | all 200 cells | — | |
| K≥5 floor: sub-K buckets dropped before sum | already (`shared-report-kanon-floor.spec.ts`) | B3 with seeded mixed buckets | — | composition/differential re-id is **not** proven anywhere → G3 (OSE-1189) |
| no H3 cell ids in suppression detail | already | every 200 cell text scan | — | |
| tier-vocabulary equity on the wire | — | every 200 cell text scan | — | |
| cross_product token fails closed | already | A12 | — | anonymity boundary; keep live |
| object-level scope on mint-link | already (`admin-object-scope.invariant.spec.ts`, structural) | S1/S2 | — | only honest when run as scoped operator (F7) |
| cache policy by phase | already (Q7 tests) | B1–B4 | — | |
| **`headcount_trend` members share the viewer's brand** (F10) | new unit test on the builder query | T1 (§3.6) | — | Invariant #9; red today |
| **phase gate on full-report render** (post_event only) | — | not API-provable (F4) | **E1 — build, then test** | rule is not implemented anywhere (F13); owner ruling M-Q7 |
| locked sections absent from LOCAL viewer DOM | — | — | **E1** | client-leak |
| corridor-map SVG injection / exclusion list | — | — | **E1 + G2 DAST** | CCR must-fix #3 |
| CSP / nonce on `/sharedReport` | — | — | **G2** | |

Everything in the L1 column is one `test.each` row. Everything in the UI column is explicitly **not** duplicated in L1.

## 6. Skip self-classification contract (epic DoD, owner rule)

A skip is a declared fact, not a silent branch. Format, machine-countable:

```
SKIP[<kind>] <what was checked> — observed: <evidence> — expected: <what would make it run>
```

| kind | meaning | counts as |
| --- | --- | --- |
| `precondition-unmet` | fixture, token, secret, or seed missing | **coverage gap**; the summary shows it; a job where all tests are this kind is **red** |
| `n/a-by-design` | the assertion names a surface or product this cell cannot apply to | correct permanent skip; must name the surface ("WKRP named-identity, OSE is anonymous") |
| `covered-at:<layer>` | assertion is honestly proven lower (A3 → L0) | recorded, never run here |

Examples the matrix will emit:

```
SKIP[precondition-unmet] mint sponsor@local for evt_smoke_pre — observed: 400 "sponsor_id does not belong to this event" — expected: sponsor_placement row for sp_test on evt_smoke_pre (C1)
SKIP[precondition-unmet] scoped-operator identity — observed: ADMIN_BRAND_MEMBERSHIP unset in job env — expected: scoped email→brand map for S1/S2
```

A bare `test.skip(cond, 'fixtures not seeded')` (the current spec, 8 times) is a defect under this contract.

**`pw-guarded.sh` extension (A1, OSE-1176):** add a `json` reporter with file output to both Playwright configs; after the run, parse it; `passed + flaky === 0 && skipped > 0` exits 1 with "all-skipped ≠ green"; the step summary prints `passed / flaky / failed / skipped[precondition-unmet] / skipped[n/a-by-design] / skipped[covered-at]`, parsed from the skip-reason prefix. Unknown prefix counts as `precondition-unmet` (fail-closed). **Negative control before it gates anything** (per `OCR_STANDARD_artifactIntegrityChecks.md`): a synthetic all-skipped run must exit 1 and a one-real-pass run must exit 0, both asserted by a test in the T0 shard.

## 7. Prerequisites and who owns them

| # | Item | Owner | Why |
| --- | --- | --- | --- |
| P1 | `wrangler secret put SHARED_REPORT_SIGNING_SECRET` on staging | owner (auth boundary) | mint → 503 `CONFIGURATION_ERROR` without it |
| P2 | Confirm staging `ADMIN_KEY` rotated and ≠ prod (OSE-1191 Part 2) | owner | CCR must-fix #2 |
| P3 | Scoped operator identity for CI (`ADMIN_BRAND_MEMBERSHIP` entry, email actor) | owner | F7; S1/S2 are vacuous otherwise |
| P4 | Fixture SQL: `sp_test` sponsor_business + `sponsor_placement` on all four fixture events; `evt_smoke_archived`, `evt_smoke_nostart`, `evt_smoke_otherbrand`; `scan_aggregates` rows for B3/B4 with ≥ K distinct hashes plus one sub-K bucket; one second sponsor sharing a `campaign_id` on B3 | agent (C1 PR) | non-vacuous section and scope cells |
| P5 | `Seed smoke fixtures` step loses `continue-on-error`; **T4f step loses `continue-on-error` and gains the T2-style `Fail check`** | agent (A2 PR, can land today) | F6, F11 |
| P6 | Cells JSON + derivation test + matrix spec + Bruno mirror; matrix spec removes the `if (rows.length > 0)` pattern (F12) | agent (C2 PR) | §4 |
| P7 | Named check `L1 API · sharedreport-matrix` lives in **`contract-staging` (T2)**, using its existing `continue-on-error` + `Fail check` idiom, with `needs: [security, gate, deploy-staging]`; T3/T4 gate on it. Not appended after the T4 browser journeys. Auth, scope and boundary cells (A1, A2, A4, A12, S1, S2) run against **live staging**, never miniflare: the CF Access edge and the Bearer check underneath are the property under test. Only pure depth/section cells are miniflare candidates, and only as a later cost phase. | agent (B1 PR, after A) | honest-green-first ordering; DevOps lens |
| P8 | Read-time `brand_id` predicate on the trend instances query + detector predicate + data audit (`SELECT series_id, COUNT(DISTINCT brand_id) … HAVING > 1`) + T1 fixture | agent (own PR, Security-owned) | F10 |

P1–P3 are the only things an agent cannot do. Everything else can be built and reviewed while they are pending, with the matrix reporting `precondition-unmet` in the meantime (which is the DoD-compliant state, not green).

## 8. Disposition of existing SharedReport tests

| File | Disposition | Why |
| --- | --- | --- |
| `tests/e2e/3-flows/sharedreport-depth.spec.ts` | **retire** when `sharedreport-matrix.spec.ts` gates | every assertion maps to a cell; 3 of 9 encode a stale wire shape (F1); 1 encodes stale entitlement (F2) |
| `bruno/ose-sharedreport/` | **retire**, replaced by generated `bruno/ose-sharedreport-matrix/` | GAS-era targets (F8) |
| `bruno/ose-api/OSE-R-003 …/` (3 requests) | keep | already the A1/A2 contract in Bruno form; the matrix mirror can absorb them later |
| `shared-reporting.spec.js`, `admin-surface-sharedreport.spec.js`, `shared-report-name-resolution.spec.js` | **verify against Invariant #10, then retire or rewrite** | drive `api_getSharedAnalytics` / Sheets export; not folded into event-mutations as the epic first proposed |
| `shared-report-mobile.spec.js` | **retire and rewrite** in E1 against the real page, with the OSE-1070 device ladder | navigates the GAS `?page=report` route, mocks `api_getSharedAnalytics`, asserts selectors the current template does not have; nothing to port (CCR Loop 1, frontend lens) |
| `.claude/skills/frontend-integration.knowledge.md` | fix the "not yet ported" row for sharedReport | the page is ported and routed (`handleSharedReportPage`); the role's own knowledge base is stale |
| `0-architecture/shared-report-schema.invariant.spec.ts` | keep (T0) | Invariant #21; the derivation test in §4 is its entitlement sibling |
| `workers/.../tests/shared-report-*.spec.ts` (unit) | keep (T0) | the L0 column of §5 |

## 9. Cross-repo landing plan

| Repo | Artifact | Ticket |
| --- | --- | --- |
| **ourCommunityRituals** (this PR) | this doc | OSE-1167 |
| **OSE** | fixture SQL additions; cells JSON; derivation unit test; matrix spec; Bruno mirror; guard-script extension; `docs/features/SHARED-REPORT-MATRIX.md` as a one-page pointer to this doc + the cells file | C1 OSE-1180, C2 OSE-1181, A1 OSE-1176, A2 OSE-1177 |
| **OSE** | named L1 check, `needs:` chain, infra-consistency meta-test + T4 summary table update | B1 OSE-1178, B2 OSE-1179 |
| **OSE** | `docs/security/coverage-ledger.md` SharedReport rows = §5 | F1 OSE-1185 |
| **OCR-docs** | `docs/proposals/PROPOSAL_sharedreport-six-axis-model-and-privacy-unlock.md` (six-axis model, privacy unlock, clash/dovetail, test derivation) — pushed on branch `claude/ose-1167-sharedreport-matrix-tfqtei` in OCR-docs, no PR yet | OSE-1167 (brain leg) |
| **OCR-docs** | skip self-classification contract (§6) as a fleet standard (new `OCR_STANDARD_skipSelfClassification.md`, or a section in `OCR_STANDARD_testNaming.md`) | new OCR-docs ticket under OSE-1167 |
| **OCR-docs** | `OCR_STANDARD_perStoryTestPyramid.md` still names Postman/Newman as the contract layer; update to Bruno per OSE-1191 | drift, fix with the above |
| **OCR-docs** | brain Invariant #11 retirement (`architectural-invariants.yaml`) + `standards-index.md` | OSE-1194 item 4 |
| **ourCommunityRituals** | remove `packages/runner-fleet`, root `_provision-runner-4.ps1` / `_reregister-runner-3.ps1`, `runner-fleet:*` scripts; update recon-fleet runbook. **No CI enforces ordering here** (the hub has no `brain-contract-check.yml`), so this needs its own explicit checklist item on OSE-1194 rather than inherited sequencing. | OSE-1194 scope addition (F9) |

## 10. Owner ratification — tiered (CCR Loop 1, product lens: one packet, not eleven questions)

**Must decide (owner only):**

- **M-Q1** — Event-state axis = {pre, live, post, **archived**} with B5/B6 singletons, replacing "ended"? (F4)
- **M-Q5** — Add this hub repo's runner apparatus to OSE-1194 scope (infra/cost call)? (F9)
- **M-Q7** — Is a mid/premium signed link rendering real accrued data (poster scans, impressions) **before** an event ends acceptable product behaviour, or a gap to close? No phase gate exists in the template today (F13). The answer decides whether E1 is a one-day test ticket or a template-logic build with its own design questions (blank sections, banner, or the existing suppression-note pattern).

**Team-decided, recorded here for the owner's veto, not approval:**

- **M-Q2** — System of record = Playwright `request` + `test.each` over a committed cells JSON, with a T0 derivation test; Bruno mirror non-gating. Applies the ratified CCR hybrid decision.
- **M-Q3** — `sharedreport-depth.spec.ts` retired outright, not repaired (F1, F2, F12 make it three-ways wrong).
- **M-Q4** — GAS-era Event-POV specs go to Invariant #10 review, not into `event-mutations` (F8).
- **M-Q6** — Skip-contract prefix format in §6 proposed as the fleet standard in OCR-docs.
- **M-Q8** — The L1 check lives in `contract-staging` (T2), per P7.

## 11. OSE-1191 and OSE-1194 as of this doc

**OSE-1191 (Done, PR #445):** Part 1 tooling swap landed; CI runs `bru run` in T2. Part 2 (rotation) is owner-boundary and is P2 above; the matrix does not run against staging until the staging `ADMIN_KEY` is confirmed rotated. Downstream text drift: OSE-1172/1181 and `OCR_STANDARD_perStoryTestPyramid.md` still say Newman.

**OSE-1194 (Backlog):** `deploy-production` and `smoke-production` still `runs-on: self-hosted` (lines 1636 and 1847 of the CI workflow at 81c98aa); `runner-env-validation.yml` still exists and will hang every PR until item 1–3+5+7 land with the brain PR. Add item 5b: this hub repo's runner apparatus (F9). Nothing in this PR deletes any of it.

## 13. CCR verdict — three loops, Security-led (2026-09-02, recorded 2026-09-30)

Run per `OCR-docs/CCR/OCR_REFERENCE_ccrProtocol.md` on this doc and the OCR-docs proposal, six extended-scrum lenses with Security integrating. **Do not advance. Final confidence 45%.** Below the 70% floor: stop and surface. The documents' own claims (F1–F9) all verified in code; the score fell because pressure-testing the premise underneath them found live defects in OSE that neither document, nor the epic's earlier CCR, had seen.

| Loop | Confidence | Key finding |
| --- | --- | --- |
| 1 Surface | 78% | Docs accurate. Missed the live cross-brand leak through `headcount_trend` (F10). Security veto on the GTM language. Corrections landed in this doc (F10–F13, §3.6, P5–P8, §10 tiering). |
| 2 Pressure | 45% | "The single-node K floor is uniform" is false in code: three fields ship raw and one suppression string prints the number it hides. T2 placement has unbuilt wiring. |
| 3 Confirm | 45% held | The unfloored-field list confirmed complete. Two severity corrections cancel. One new unpriced defect: no rate limit on the single-event GET. |

**Live defects in OSE at 81c98aa, each verified by direct read (not inference):**

1. **Cross-tenant leak, absolute veto on shipping `headcount_trend` at premium depth** (F10). `event_series` has no brand column; the detector clusters on venue string + weekday + hour; the trend query filters on series id only. Invariant #9.
2. **Unfloored counts on the wire** (`shared-report-builder.ts`): `corridor_density.this_event_count` assigned raw, and the density ratios derive from it, so fixing the field alone is insufficient; `return_rate` gates at 3 not K=5, so percentages ship with a sub-K denominator, and its suppression detail prints the exact sub-K count; `sponsor_impressions[].count` raw at every depth beside the floored rollups computed from the same rows, defeating the floor inside one payload. Loop 3 downgraded the last from "person-derived" to "operational counter" (rows are unauthenticated public POSTs, no dedup): severity is inconsistency, not identity.
3. **No rate limit on the single-event GET.** Only the batch endpoint calls the limiter; `poster_attribution` is a live join, so a token holder can poll and watch one poster's floored count tick at ~150 m granularity. Presence, not identity, but unbounded.
4. **Impression rows are written by unauthenticated public POSTs** with no dedup and no route rate limit.

**Security veto, widened in Loop 2:** "provably anonymous", "legal by construction", "no consent overhead", "no processing agreement" stay off every external surface. Loop 1 held them pending composition proofs; Loop 2 found the single-node premise itself is not yet true in code. No current external surface uses those phrases (grep of `OCR_VISION.md`, OSE docs/public/templates: zero hits).

**Design-doc gaps the lenses found**, all recorded above as findings, none fixed in code by this PR: T4f double-masked (F11); T4b/T4c/T4c-phase2 have no zero-discovery guard; `contract-staging` has no `BASE_URL` and its fail check would not see a new step; a manual dispatch with `run_functional=true` bypasses the T2 gate; mint retries can cascade under the 10/min limiter; the existing isolation test asserts nothing on current fixtures (F12); no post-event render gate exists anywhere (F13); the mobile spec is dead GAS-era code; `frontend-integration.knowledge.md` is stale.

**Owner-only decisions:** whether `event_series` may ever cluster across brands; whether a pollable real-time counter at that granularity is within the anonymous contract's "roughly when" tolerance once rate-limited; whether a pre-event signed link showing accrued data is acceptable (decides if E1 is build or test). **Agent-buildable with no policy call:** brand predicate on the trend query and detector; floor the three fields and the suppression string; add the existing limiter to the single-event GET; the T4 mask and guard fixes; `BASE_URL` and fail-check wiring in T2.

**Since this verdict (2026-09-30):** OSE `main` moved 20+ commits (Bruno folder 12 now covers verify-qr; `PUT status` now enforces the transition table). The go-live evidence gate and the admin code ledger shipped on OSE branch `claude/verify-qr-evidence-tfqtei` under OSE-1420; none of items 1–4 above are addressed by that branch.

## 12. Resume pointer

**Standing rule (owner, 2026-09-30):** the privacy claim (never-who, aggregate-only, K-floored) and the brain invariants are the basis structure, to be perpetuated through the entire end-to-end flow — poster → scan → landing → form → report → admin card. Every artifact this programme adds (a cell, a fixture, an endpoint, a card, a log line) is checked against them before it lands, and §13's four live defects are the places where that basis is currently not carried through.

The rule covers the **deduction methods** already ruled on, not just the fields. A payload that is aggregate-only and K-floored on its face can still be undone by inference; these are the routes closed so far, and every new cell, fixture or endpoint is checked against each one:

| # | Deduction method | Ruling | Where it is held |
| --- | --- | --- | --- |
| D1 | **Complementary-release differencing** — two releases whose scopes differ by one person (sponsor scope vs corridor scope, one event vs the series) let the reader subtract. | K floors act on the *difference*, not only on each release; a release is refused when the complement is under K. | §3.6 T1, §7 P5–P8 (this doc); OCR-docs proposal §2 composition axis. |
| D2 | **Linear combination across overlapping releases** — depth × scope × role × stateful config yield many payloads over the same rows; summing and subtracting them recovers a cell the floor hid. | The per-release ledger (`per_release_ledger`) is the unit of accounting; the floor is enforced on every reachable combination, not per endpoint. | OCR-docs proposal `per_release_ledger`, C9/C10; §13 defect 2 (`sponsor_impressions[].count` raw beside floored rollups is this method inside one payload). |
| D3 | **Temporal polling delta** — a live join polled repeatedly turns a floored count into an arrival log at the poll interval's granularity. | Live joins are rate-limited and no payload carries anything finer than the hour. | §13 defect 3 (single-event GET has no limiter — open); OSE-1376 / PR #691: buckets stay the stored UTC hour, the report shows nothing finer than the hour. |
| D4 | **Small-cell and mosaic** — a cell under K, or a suppression string that prints the number it hides, or a category so rare it identifies. | Suppress below K and say only *that* it was suppressed, never the count; label the cell for the reader, never re-bucket it. | `report-depth.ts` floors; §13 defect 2 (`return_rate` at 3, suppression detail prints the sub-K count — open). |
| D5 | **Re-bucketing under a label** — presenting a stored hour bucket under a local-time label, then re-cutting the buckets to the local boundary, moves rows between cells so the 60-minute floor and the K=5 per-bucket floor no longer act on the same cells. | **Label, never re-bucket.** The cells are the stored UTC hours; a zone label is applied on top, the floors act on exactly the same cells before and after. | OSE-1376 / PR #691, `tests/shared-report-event-zone.spec.ts` header. |
| D6 | **New temporal disclosure by histogram** — a per-hour scan histogram is a new release class, not a relabel; it opens D3 against the report itself. | Not added. Any per-hour histogram is held behind `docs/security/SCAN_TIME_BUCKETING_DISCLOSURE_MODEL.md` and needs that model's sign-off first. | OSE `docs/security/SCAN_TIME_BUCKETING_DISCLOSURE_MODEL.md`; PR #691 body. |
| D7 | **Never-who on every payload** — any per-person field (id, token, email, IP, UA, anonymous_id, session) on any surface, admin included, is a leak regardless of floors. | Every new endpoint carries a banned-field gate in its spec; the code ledger's payload is asserted on this (`tests/code-ledger.spec.ts`), the event-zone report is asserted on this (PR #691). | OSE-1420 code ledger spec; OSE-1376 zone spec; invariant #1, #7. |

D1–D4 come from the §13 CCR; D5–D7 from the OSE-1376 / PR #691 session (`claude.ai/code/session_01HRxhB8tZHtNUMYRSPmH6St`). The go-live gate and code ledger (OSE-1420) comply: they emit codes, counts and reasons, never a person. §13 defects 1–4 are the open violations of D1/D2 (defect 1, 2), D3 (defect 3) and D7's write side (defect 4).

For a fresh session: this doc is the design for the CI leg; the OCR-docs proposal (§2.1) is the brain leg and holds the owner's six-axis model. Both await the owner's answers to §10 here and §6 there. Next concrete step is **C1 (OSE-1180) fixture SQL + P5**, which is agent-buildable now and non-vacuous only after P1–P3. Do not start B1 (YAML reorder) before A and C2 gate. Read §1 before touching `sharedreport-depth.spec.ts`; it is stale, not merely masked.
