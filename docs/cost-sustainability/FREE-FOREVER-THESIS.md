# The Free-Forever Thesis — why the promise is structural, not charitable

> Durable monorepo record of *why* OurSharedEvents can promise free-forever to
> churches and chosen clients without it being a subsidy that must one day end.
> System of record for execution is Linear (OSE team, project
> **"Cost Sustainability & Free-Forever Guardrails"**). This is the standing
> "why" behind [BACKLOG.md](BACKLOG.md) Epic 1.
>
> Story: **COST-103** (OSE-772). Related decision:
> ADR-014 (`ourSharedEvents/docs/adr/ADR-014-ai-sanitization-sanctioned-seam.md`).

---

## The claim

**Free-forever is a property of the architecture, not an act of generosity.**

A subsidy is a decision to eat a cost you incur. If serving a free user cost
real money, "free-forever" would be a promise to lose money forever — and every
such promise is eventually broken when the subsidy runs out. OurSharedEvents does
not make that promise. It makes a narrower, sturdier one: **serving a free user
costs approximately nothing, so there is no subsidy to withdraw.**

The rest of this document is the evidence for "approximately nothing," the one
property that keeps it true, the mechanical guardrails that hold that property,
and the one place at scale where the number could stop being ~0.

## The evidence: served-user runtime costs ~0 model tokens

Every served-user operation is deterministic Cloudflare Workers compute over
edge primitives — D1 (SQLite), KV, R2 — plus local crypto. None of it calls a
metered intelligence API. Concretely, the load-bearing user paths:

| Operation | What runs | Marginal cost driver |
| --- | --- | --- |
| Create / edit event | Worker + D1 write | CPU-ms + a few D1 rows |
| Poster / QR render | Worker + deterministic QR encode | CPU-ms |
| Scan → check-in | Worker + D1 write, hourly bucketed | CPU-ms + 1 row |
| SharedReport render | Worker + D1 read + aggregation | CPU-ms + D1 read rows |
| Feature-flag resolve | In-Worker, 3-tier | CPU-ms |

The unit-cost audit (the R1 measurement pass behind this backlog) found the
per-operation **LLM token cost is zero** across all of these, because there is
no model-provider SDK import and no model-provider API hostname anywhere in the
runtime. Cost scales with **cheap deterministic primitives** (CPU-milliseconds
and single-digit row counts), never with **per-operation token metering**.

That is the whole thesis in one line: **a free operation is cheap because it is
deterministic, and it stays cheap because it stays deterministic.**

## Why "LLM-free runtime" is the single load-bearing property

The distinction that makes free-forever sustainable is not "we are frugal." It
is **which cost curve each operation sits on.**

- A **deterministic** operation costs a fixed, tiny amount of compute regardless
  of how clever it is. Ten thousand poster renders cost ten thousand cheap
  CPU-slices. The curve is flat and low.
- A **token-metered** operation costs money *every time it runs*, priced by a
  third party, and the price grows with the size of the input and the ambition
  of the output. Ten thousand model calls is a bill that scales with usage — the
  exact shape a free tier cannot absorb.

The moment **one** runtime path makes a per-request model call, the operation it
serves moves from the flat cheap curve to the metered curve. A ~0-token
operation silently becomes a token-metered one, and "free-forever" quietly turns
back into a subsidy — a promise to pay a growing per-use bill on behalf of every
free user, forever. There is no amount of frugality elsewhere that offsets a
per-operation meter on a free path.

So the promise reduces to exactly one invariant: **no served-user runtime path
may call a model.** Everything else about cost is optimization; this is the load
bearing wall.

## The 10× / 100× reasoning: where scale changes the number, and where it doesn't

Scaling the platform does **not** threaten the thesis on the compute axis:

- **10× the events, scans, and reports** → 10× the cheap deterministic
  primitives. The curve is linear and the slope is tiny. Edge compute + SQLite
  reads at 10× community-event volume is still rounding-error money. Free-forever
  is untouched.

The thesis has exactly **one** place where 10×→100× could bend the curve, and it
is *not* the LLM axis — it is **data egress and fan-out at report time**:

- **100× SharedReport volume** with a growing **BigQuery export / cross-corridor
  analytics** path (the OER/intelligence layer, phase-5) introduces a cost that
  scales with **data movement**, not tokens — D1 read fan-out per report and
  BigQuery egress per export. This is the one genuinely usage-scaling cost on the
  horizon. It is tracked, deliberately, as a **non-actioned watch-item**
  (COST-303 / COST-503 in [BACKLOG.md](BACKLOG.md)), not a present problem:
  today's reports are edge-local and cheap.

The rule that falls out of the 10×/100× analysis: **keep every per-user
operation on the deterministic curve, and treat any usage-scaling cost (egress,
fan-out, and above all token metering) as a guarded exception that must be
justified, bounded, and watched — never a silent default.**

## The canary: `ai-sanitization.ts`

The guardrail is not a hope that nobody adds a model call. It is a **dormant,
pre-positioned choke point** that makes the LLM-free property mechanically
enforceable.

`ourSharedEvents/workers/oursharedevents/src/lib/ai-sanitization.ts` is a
sanitizer with **no runtime caller today**. Its dormancy is the point: it is the
**single sanctioned door** through which any future AI feature must enter, so the
first model call inherits a reviewed, injection-hardened entry point instead of
inventing an unreviewed one under deadline pressure. It is the canary — if it is
ever wired, that is the visible, reviewed moment the platform takes on its first
token-metered path, and it happens **on purpose, once, in daylight.**

## How the property is held (the guardrails, not vigilance)

Three mechanical legs keep the runtime LLM-free. None depends on a reviewer
remembering the rule (see ADR-014 and [BACKLOG.md](BACKLOG.md) Epic 1):

1. **Allowlist-of-one static gate (COST-101).** A CI invariant
   (`tests/e2e/0-architecture/runtime-llm-free.invariant.spec.ts`) fails the
   build if any runtime `.ts` imports a model-provider SDK or references a
   model-provider API hostname. The allowlist contains exactly one file — the
   `ai-sanitization.ts` canary.
2. **CODEOWNERS review-lock (COST-102).** The seam, the invariant spec, and
   ADR-014 require an explicit security-owner review; the cost posture can't be
   changed by a PR that rides through under a broad default-owner rule.
3. **Governance contract test (COST-102).** An L7 contract test asserts all
   three legs stay wired on every PR, so the guardrail can't silently regress.

Together these turn "the runtime is LLM-free" from a claim into a
**CI-enforced invariant**: introducing a per-operation model call is not a code
review judgment call, it is a red build.

## What would falsify this thesis

Stating the thesis honestly means stating what would break it:

- **A model call on a served-user path.** Directly converts a free operation to
  a metered one. Blocked today by COST-101/102; this is the primary threat and
  the reason the guardrails exist.
- **An unbounded usage-scaling egress/fan-out cost** (BigQuery export, D1 report
  fan-out) shipped without a bound or a watch. Tracked as COST-303/503; not a
  present cost, but the one to watch as the intelligence layer matures.
- **Tier Equity drift** that quietly re-prices the marketplace. Out of scope for
  the *compute*-cost thesis, but part of the same "the promise stays honest"
  posture — see the sponsor allocation-weight drift resolution recorded alongside
  `ourSharedEvents/docs/features/SPONSOR-PRICING.md` (COST-111/112).

As long as the runtime stays on the deterministic curve, none of these fire, and
free-forever remains what it claims to be: **not a gift the platform pays for,
but a cost the platform never incurs.**

## References

- [BACKLOG.md](BACKLOG.md) — the full Cost Sustainability effort (Epics 1–5, R1–R7)
- ADR-014 — `ai-sanitization.ts` as the single sanctioned AI seam
  (`ourSharedEvents/docs/adr/ADR-014-ai-sanitization-sanctioned-seam.md`)
- COST-101 — the runtime-LLM-free static gate
  (`ourSharedEvents/tests/e2e/0-architecture/runtime-llm-free.invariant.spec.ts`)
- COST-303 / COST-503 — the 100× D1 fan-out + BigQuery egress watch-item
- Linear: OSE-772 (COST-103), project **Cost Sustainability & Free-Forever Guardrails**
