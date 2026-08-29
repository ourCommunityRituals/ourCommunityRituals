# Cost Sustainability & Free-Forever Guardrails — Backlog

> Durable monorepo record of the structural cost-efficiency effort.
> System of record for execution is Linear (OSE team, project **"Cost Sustainability & Free-Forever Guardrails"**).
> This document is the evidence-anchored plan; keep it in sync with the ADR (COST-501).

## Execution status — updated 2026-08-16

**Milestone M1 — Integrity First: ✅ COMPLETE (all merged to `main`).**

| Story | PR | Outcome |
| --- | --- | --- |
| COST-201 — CI false-green fix | ourCommunityRituals#22 | `brain-parity` + `shared-gate-drift` self-checkout the brain and hard-fail if absent; silent-skip removed. Verified: both jobs ran + passed. |
| COST-111 — sponsor weight reconcile | ourSharedEvents#329 | `SPONSOR-PRICING.md` → canonical 7x/3x/1x. Code/YAML already agreed; docs-only. |
| COST-101 — runtime-LLM-free gate | ourSharedEvents#328 | New `tests/e2e/0-architecture/runtime-llm-free.invariant.spec.ts`, wired into the blocking T0 step. Fails CI on any runtime model-SDK import; allowlist = `ai-sanitization.ts`. |

**Side items handled during M1:**
- Closed stale security issue ourSharedEvents#256 (was a SBOM-tooling failure, green on `main` for weeks — not a vulnerability).
- Filed **OSE-790** (Security Hardening project) for the real find: 29 open Dependabot alerts (1 critical / 14 high / 14 medium); GHAS code-scanning not enabled on OSE.
- Runner incident (COST-221 evidence): org runner BLOODRAVEN-2 was offline ~1h, stalling all hub PRs; revived via targeted `GitHubActionsRunner-2` scheduled-task bounce (spared the busy repo runner BLOODRAVEN-3).

**Next: Milestone M2 — Efficiency** (not started). Clean/independent first: COST-102 (seam ADR + CODEOWNERS), COST-103 / COST-112 (docs). Then hub `ci.yml` work COST-211/212 (unblocked now that #22 merged). COST-221's real fix = provision a second always-on org-level runner (infra).

## Provenance

Derived from a three-angle, evidence-only audit and its synthesis pass (the full Phase 1–3
tables and the R1–R7 mapping are in the [EVIDENCE-PACK.md](EVIDENCE-PACK.md), COST-502):

1. **Unit-cost measurement** — real token cost per operation.
2. **File/context structure audit** — how context flows to agents; duplication; over-broad reads.
3. **CI/CD pipeline cost audit** — per-gate cost, redundancy, runner contention.
4. **Synthesis** — ranked recommendations R1–R7.

**Governing finding:** served-user runtime operations cost **~0 LLM tokens** (deterministic Cloudflare Workers compute: D1/KV/R2 + local crypto — no model API in any runtime path). The free-forever promise to churches + chosen clients is **structurally sustainable — but only while the runtime stays LLM-free and Tier Equity stays byte-accurate.** The dormant `ai-sanitization.ts` (imported nowhere) is the canary. The full standing rationale — evidence, the load-bearing property, the 10×/100× reasoning, and the canary — is written up in [FREE-FOREVER-THESIS.md](FREE-FOREVER-THESIS.md) (COST-103).

## Constitution (every story is checked against this)

- **Invariants:** Tier Equity · Inert Monetization · Deprecation Lock.
- **Wall doctrine:** S0-first / S2-last security brackets; status is *derived*, never purchased; K-anon / never-who privacy.
- **Standard:** structural (reorganization / tighter scoping / dedup) preferred; "clever" (caching / skipped verification) is higher-scrutiny and must justify safety. **Cost efficiency never buys a security or privacy shortcut. No gate weakened; no re-scan removed without an equivalent guarantee elsewhere.**

## Legend

**SCRUM roles:** PO · SM · BIA (Backend/Infra) · DVO (DevOps/CI-CD) · SRE · SEC (Wall-Keeper, owns S0/S2) · QA · TW (Tech Writer).

**Test-pyramid tiers (specified):** L0 Security (`flags:level0`) → L1 Lint → L2 Schema/drift → L3 Unit (vitest) → L4 Regression/`invariants.test.ts` → L5 Boundary → L6 Integration → L7 Contract → L8 Pact (brain parity) → L9 Academic; plus `tests/e2e/{0-architecture,1-smoke,2-pages,3-flows,4-negative}`.

> ⚠️ **Reconciliation correction (2026-08-29).** This line previously read
> "*(real, from repo)*". That claim was **false for L1 Lint**, and the wording is
> corrected to "specified" above. Verified: there is **no ESLint configuration in
> this repository in any form** — no `.eslintrc*`, no `eslint.config.*`, and no
> `eslintConfig` key in any `package.json` — so `eslint` exits 2 on a config
> error before evaluating a single file. **No workflow invokes lint at all**
> (`grep -rn lint .github/workflows/` returns nothing). Two packages
> (`@ocr/flags`, `@ocr/data-provider`) ship a `lint` script that cannot run.
>
> **L1 is specified but does not execute.** It was never red and never green —
> it is *absent*, which is invisible from any tier above it.
>
> **This reverberates upward through the whole pyramid** (see Case 11 in
> `docs/methodology/ccr-extended-scrum-case-studies.md`):
> - The **priority hierarchy inverts in practice.** `ci.yml` states the pipeline
>   order honors *Quality > Security > …*. Quality is the top band and it is the
>   one missing a gate; Security's L0 runs, and runs first. The Quality band
>   executes drift + `tsc --noEmit` + vitest — **typecheck is not lint.**
> - **Every green tier above L1 was measured against a base never established.**
> - **The ratchet has no floor.** A verified property becomes a regression lock,
>   but at L1 there is no mean to not-recede from.
> - **Every story closed under the Wall DoD above inherits the gap** — no Done
>   ever had a lint assertion, because none existed to run.
> - **A tier-counting coverage meter overcounts L1 as present** — the companion
>   error to Case 1's meter undercounting invariants.
>
> Closing it means landing a **strict** config and fixing what it finds. A
> permissively-tuned config adopted to turn the cell green would make the absence
> permanent and invisible — worse than the honest gap, and forbidden by this
> backlog's own standard (*no gate weakened*).
>
> **Untracked — needs a ticket.** Owners: DVO (lead) + QA. Pyramid: L1, plus a
> meta-test that lint is actually invoked by CI, so this cannot recur silently.

**Wall DoD (every story):** opens with **S0** (pre-execution semgrep/L0 green), closes with **S2** (post-execution security re-assertion). No story is Done until S2 confirms no wall/invariant regression.

---

## EPIC 1 — Runtime Cost-Integrity Guardrails  _(R1, R2)_
Protects the free-forever thesis + fixes the live invariant conflict. Owners: PO + SEC.

### Feature 1.1 — Runtime-LLM-free guardrail (R1)
- **COST-101** — Add `no-runtime-model-import` static gate; allowlist only `ai-sanitization.ts`.
  - Roles: SEC (lead), BIA, DVO, QA · Pyramid: L0 + L2 + `e2e/0-architecture` invariant spec · DevOps: new `gate`-job step after `flags:level0`, reusable for spokes · Wall DoD: S0 includes new assertion; S2 confirms no runtime import slipped in.
- **COST-102** — Ratify `ai-sanitization.ts` as the single sanctioned AI seam (ADR + CODEOWNERS review-lock).
  - Roles: PO, SEC, TW · Pyramid: L7 Contract · DevOps: CODEOWNERS forcing SEC review · Wall DoD: S0/S2 on merge.
- **COST-103 (DOC)** — Document the free-forever sustainability thesis in the monorepo. ✅ [FREE-FOREVER-THESIS.md](FREE-FOREVER-THESIS.md).
  - Roles: TW, PO · Pyramid: L1 doc-lint/link-check · Wall DoD: S2 review.

### Feature 1.2 — Sponsor-weight reconciliation (R2)
- **COST-111** — Reconcile allocation weights to canonical 7x/3x/1x (`SPONSOR-PRICING.md:34-38` → brain `sponsor-allocation.yaml:151-154`, same PR).
  - Roles: BIA (lead), PO, QA, SEC · Pyramid: L2 OSE-336 byte-equiv drift (`sponsor-allocation.ts:104-107`) + L4 + `e2e/0-architecture` Tier-Equity spec · DevOps: byte-equiv drift gate blocks on mismatch · Wall DoD: S0 open; S2 asserts Tier Equity intact.
- **COST-112 (DOC)** — Record the drift resolution + fold the two root pricing-plan docs.
  - Roles: TW, PO · Pyramid: L1 link-check · Wall DoD: S2 review.

---

## EPIC 2 — CI Pipeline Integrity & Efficiency  _(R3, R4, R6)_
False-green fix + waste collapse + runner SPOF. No gate weakened. Owners: DVO + SEC.

### Feature 2.1 — Kill the false-green (R3)
- **COST-201** — Point `brain-parity` + `shared-gate-drift` at the gate's checked-out `OCR-docs/`; make absence a hard fail on self-hosted (replace silent `exit 0` at `ci.yml:209-214`, `:234-236`).
  - Roles: DVO (lead), SEC, QA · Pyramid: L8 Pact + L2 drift + meta-test that skip can't fire on self-hosted · DevOps: consume `$GITHUB_WORKSPACE/OCR-docs`; negative test proves missing brain now fails · Wall DoD: strengthens the gate; verify no silent-skip remains.

### Feature 2.2 — Collapse zero-security-value waste (R4)
- **COST-211** — Single authoritative install + shared pnpm store across jobs; retain `--frozen-lockfile`; drop redundant checkouts.
  - Roles: DVO (lead), QA · Pyramid: L1/L2 install-integrity meta-test · DevOps: refactor 4 jobs to share workspace/store — ⚠️ clever-flag: reuse store, never skip integrity check · Wall DoD: S2 confirms lockfile verification intact.
- **COST-212** — Run invariants once authoritatively; keep the dedicated invariants job as the named gate (dedupe `flags:test` `:151` vs invariants job `:175` **without deleting the gate**).
  - Roles: DVO, QA, SEC · Pyramid: L4 — prove invariants run exactly once and still block · Wall DoD: S2 asserts the three Vision invariants still gated.

### Feature 2.3 — Relieve runner SPOF (R6 / OSE-699)
- **COST-221** — Parallelize the 3 independent downstream jobs (second executor / concurrency).
  - Roles: DVO (lead), SRE · Pyramid: L6 Integration under parallel executors · DevOps: provision 2nd self-hosted executor / matrix concurrency, targeted so runner-2 flake doesn't regress · Wall DoD: S0/S2 unchanged (infra only).
- **COST-222 (DOC)** — Update CI runner runbook (`workers/oursharedevents/docs/ops/`) with new topology.
  - Roles: TW, DVO · Pyramid: L1 link-check · Wall DoD: S2 review.

---

## EPIC 3 — Cost Observability (never-who)  _(R5)_
Standing, aggregate-only visibility. Owners: SRE + SEC.

### Feature 3.1 — Aggregate-only runtime cost metric
- **COST-301** — Emit per-operation-*type* cost line: Workers CPU-ms + subrequest count + D1 rows. No user identifiers.
  - Roles: SRE (lead), BIA, SEC · Pyramid: L0 (no-PII assertion / never-who) + L5 Boundary + L4 · DevOps: structured-log sink + dashboard; sampling documented (no silent caps) · Wall DoD: S0 includes no-identifier assertion; S2 re-verifies aggregate-only.
- **COST-302** — Surface CI cost line from the `gh` run API into the same dashboard.
  - Roles: SRE, DVO · Pyramid: L6 Integration · DevOps: scheduled collector job · Wall DoD: S2.
- **COST-303 (DOC)** — Document the cost-metric contract + never-who guarantee + the 100x D1/BigQuery watch-item.
  - Roles: TW, SRE, SEC · Pyramid: L1 + L7 Contract (metric schema) · Wall DoD: S2 privacy review.

---

## EPIC 4 — Context / Doc Structural Hygiene  _(R7)_
Reduces the only real measured token cost (session context-load surface). Intentional drift-gated mirrors left untouched. Owners: BIA + TW.

### Feature 4.1 — Retire sprawl & split monster docs
- **COST-401** — Archive superseded `OSE_SPONSOR_PRICING_PLAN_2026-08-14.md` (3MO supersedes); fold overlapping root planning docs. Roles: TW, PO · Pyramid: L1 link-check · Wall DoD: S2.
- **COST-402** — Split ≥1.3k-line docs (CF_ZONE 3007L, FRONTEND/ARCH analyses) into single-concern files. Roles: TW, BIA · Pyramid: L1 anchor-check · Wall DoD: S2.
- **COST-403** — Add worker-scoped `workers/oursharedevents/CLAUDE.md`. Roles: BIA, TW · Pyramid: L1 + lint that scoped file exists · Wall DoD: S2.

---

## EPIC 5 — Documentation of the Effort (capstone, monorepo)
Explicit requirement: dedicated stories documenting the effort. Owners: TW + SM.

- **COST-501** — Master "Cost Sustainability" ADR in OCR-docs (`docs/adr/`, next contiguous number) linking R1–R7 → tickets → invariants. Roles: TW, PO, SEC · Pyramid: L1 + ADR template conformance (L2) · Wall DoD: S2 governance review.
- **COST-502** — Publish the pooled-audit evidence pack (Phase 1–3 tables) into the monorepo. Roles: TW, SRE · Pyramid: L1 · Wall DoD: S2.
- **COST-503** — Add the 100x watch-item (SharedReport D1 fan-out + BigQuery egress) to OSE architecture docs + Linear as a tracked, non-actioned risk. Roles: TW, BIA, SRE · Pyramid: L1 · Wall DoD: S2.
- **COST-504** — Update `OCR_STANDARD_perStoryTestPyramid.md` if the new runtime-LLM-free L0 assertion should be reflected as a standard. Roles: TW, QA, SEC · Pyramid: L2 standard conformance · Wall DoD: S2.

---

## Delivery ranking (mirrors synthesis)

1. **Integrity first:** COST-201 (false-green), COST-111 (weight conflict), COST-101 (guardrail).
2. **Efficiency:** COST-211/212 (waste), COST-221 (SPOF).
3. **Observability:** Epic 3.
4. **Hygiene:** Epic 4.
5. **Documentation:** Epic 5 — continuous, lands alongside each epic.

_No recommendation weakens a security gate, an invariant, or the wall. Proposals only; humans decide what to implement._
