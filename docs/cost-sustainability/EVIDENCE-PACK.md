# Cost-Sustainability Audit — Pooled Evidence Pack

> The raw evidence behind the *Cost Sustainability & Free-Forever Guardrails* effort:
> the three-angle audit (Phase 1–3) and the synthesis (R1–R7) it produced. This is
> the "show your work" companion to [FREE-FOREVER-THESIS.md](FREE-FOREVER-THESIS.md)
> (the *why*) and [BACKLOG.md](BACKLOG.md) (the *plan/status*). The canonical decision
> record is fleet **ADR-006** (`OCR-docs/docs/adr/ADR-006-cost-sustainability-free-forever-guardrails.md`).
>
> Story: **COST-502** (OSE-787). Audit date: 2026-08-15.

---

## Method (and its limits)

The audit was **evidence-only**: each finding is anchored to a file, a CI job, or a
measured wall-clock, and recommendations were kept separate from measurements so the
reader can check the evidence without inheriting the conclusion. Three independent
angles were run and then pooled in a synthesis pass:

1. **Phase 1 — Unit-cost measurement.** Real per-operation cost of the served-user runtime.
2. **Phase 2 — File / context-structure audit.** How context flows to agents; duplication and over-broad reads (a real, measurable token cost).
3. **Phase 3 — CI/CD pipeline audit.** Per-gate cost, redundancy, and runner contention.

**Honest limits of the evidence.** Phase 1's "zero" is a *structural* zero (no
model-provider SDK import / API hostname in any runtime path), not a metered
per-request token count — there is no meter because there is no model call. Phase 3's
wall-clock figures are from specific runs on the self-hosted fleet, not a statistical
distribution. Where a finding is qualitative ("duplicated", "over-broad") it is marked
as such rather than dressed with a false number.

---

## Phase 1 — Unit-cost measurement

**Question:** what does one served-user operation actually cost?

| Operation | What runs at runtime | LLM token cost | Marginal cost driver |
| --- | --- | --- | --- |
| Create / edit event | Worker + D1 write | **0** | CPU-ms + a few D1 rows |
| Poster / QR render | Worker + deterministic QR encode | **0** | CPU-ms |
| Scan → check-in | Worker + D1 write (hourly bucketed) | **0** | CPU-ms + 1 row |
| SharedReport render | Worker + D1 read + aggregation | **0** | CPU-ms + D1 read rows |
| Feature-flag resolve | In-Worker 3-tier resolve | **0** | CPU-ms |

**Evidence:** no model-provider SDK import and no model-provider API hostname exists in
any runtime `.ts` under `workers/oursharedevents/src/`. The one model-adjacent module,
`src/lib/ai-sanitization.ts`, is imported by **no runtime caller** (the canary).

**Finding:** the served-user path sits entirely on the **deterministic cost curve**
(fixed, tiny compute per op) rather than the **token-metered curve** (per-request price
set by a third party). Cost scales with cheap primitives — CPU-milliseconds and
single-digit row counts — never with token metering. → drives **R1**.

---

## Phase 2 — File / context-structure audit

**Question:** the one cost that is *not* ~0 is the token cost of the context every agent
loads each session. Where is that surface inflated?

| # | Finding | Evidence | Cost | → Rec |
| --- | --- | --- | --- | --- |
| 2.1 | Superseded planning docs left at repo root | Dated one-shot reports (HANDOFF / OVERNIGHT / audit / migration-plan) living as living docs; a superseded 3-month pricing plan alongside the current one | Re-loaded into context as if current; drift risk | **R7** (COST-401) |
| 2.2 | Monster docs exceed single-concern size | `docs/security/CF_ZONE_CONFIG_BASELINE.md` at **3007 lines**; other >1.3k-line analyses | Whole file pulled to read one section | **R7** (COST-402) |
| 2.3 | No worker-scoped context file | Hot-path import bans + two-DB isolation lived only in prose, not at `workers/oursharedevents/CLAUDE.md` | Agents rediscover the rules each session | **R7** (COST-403) |
| 2.4 | Sponsor-weight documentation conflict | Docs said 3×/2×/1× while brain `sponsor-allocation.yaml` said 7×/3×/1× | A reader could act on the wrong (integrity) number | **R2** (COST-111/112) |

**Finding:** the only measured non-trivial token cost is **context-load surface**, and
it is reducible by *structural* means (archive dead docs, split by concern, scope the
rules to where they apply) — no cleverness, no risk. → drives **R7** (and surfaces the
**R2** integrity conflict as a side effect of reading the pricing docs).

---

## Phase 3 — CI/CD pipeline audit

**Question:** what does the pipeline cost, and how much of it buys no security?

| # | Finding | Evidence | Cost | → Rec |
| --- | --- | --- | --- | --- |
| 3.1 | **CI false-green (integrity)** | Hub `ci.yml` `brain-parity` + `shared-gate-drift` could `exit 0` without running when the OCR-docs brain wasn't at the expected path | The exact drift checks silently pass — worse than slow: *wrong* | **R3** (COST-201) |
| 3.2 | Cold, duplicated install | The `invariants` job installed from cold while the gate had already warmed a pnpm store with the same lockfile hash | Redundant install wall-clock, no added safety | **R4** (COST-211) |
| 3.3 | Invariants run twice | Gate's `flags:test` re-ran `invariants.test.ts` already run by the dedicated invariants job | Double execution of the same gate | **R4** (COST-212) |
| 3.4 | Repeated checkout across jobs | 4 jobs each re-checkout (GHA job isolation) | Structural to GHA — *not* actioned (would trade safety for speed) | noted, not R-listed |
| 3.5 | **Runner single-point-of-failure** | 3 independent downstream jobs serialized on one self-hosted org executor; BLOODRAVEN-2 offline ~1h stalled all hub PRs | Serial wall-clock + a real availability SPOF | **R6** (COST-221/222) |
| 3.6 | No cost observability | No runtime or CI cost telemetry existed (NOT FOUND) | The 10×–100× regression the canary warns about is unobservable | **R5** (COST-301/302/303) |

**Measured outcome after R6:** adding a second always-on org executor took the
independent downstream jobs from serial to overlapping — **downstream wall-clock
133s → 61s (~2×)** on the validating run (proof = overlapping job start timestamps;
`runner_name` is null for self-hosted in completed-run JSON).

**Constraint held throughout Phase 3's recommendations:** no gate was weakened and no
re-scan removed — waste was collapsed by **deduplicating execution**, never by dropping
a check (3.4 was deliberately *left alone* because removing a checkout would trade
isolation for speed).

---

## Synthesis — R1–R7 → tickets → outcome

Ranked **integrity-first** (a wrong green outranks a slow green outranks a big doc):

| Rec | Recommendation | Stories | Landed |
| --- | --- | --- | --- |
| **R3** | Kill the CI false-green (hard-fail on missing brain) | COST-201 | hub #22 |
| **R2** | Reconcile sponsor weights to canonical 7×/3×/1× | COST-111, COST-112 | OSE #329, #331 |
| **R1** | Fail CI on any runtime model import; ratify the sole AI seam | COST-101, COST-102, COST-103 | OSE #328, #330; hub #24 |
| **R4** | Collapse zero-security-value CI waste (dedupe, don't delete) | COST-211, COST-212 | hub #25 |
| **R6** | Relieve the runner SPOF (2nd org executor) + runbook | COST-221, COST-222 | (infra) ; hub #27, OSE #332 |
| **R5** | Stand up aggregate-only, never-who cost observability | COST-301, COST-302, COST-303 | OSE #333, #336, #334 |
| **R7** | Context/doc structural hygiene | COST-401, COST-402, COST-403 | hub #28; OSE #337, #338 |

Documentation of the effort (Epic 5): the master decision record is **ADR-006**
(COST-501); this evidence pack is **COST-502**; the 100× egress/fan-out watch-item is
**COST-503**; and the runtime-LLM-free assertion in the per-story pyramid standard is
**COST-504**.

**The single load-bearing conclusion:** free-forever is sustainable because the
served-user runtime is on the deterministic curve (Phase 1) — and every recommendation
either *defends* that property with a red gate (R1, R3), *keeps the promise honest*
(R2), or *reduces cost without touching a security guarantee* (R4, R6, R7), with R5
standing watch so a future regression is seen, not merely feared.

---

## References

- [FREE-FOREVER-THESIS.md](FREE-FOREVER-THESIS.md) — the standing "why" (COST-103)
- [BACKLOG.md](BACKLOG.md) — the full Epic 1–5 plan + execution status
- **ADR-006** — the canonical fleet decision record
  (`OCR-docs/docs/adr/ADR-006-cost-sustainability-free-forever-guardrails.md`, COST-501)
- Linear: OSE-787 (COST-502), project **Cost Sustainability & Free-Forever Guardrails**
