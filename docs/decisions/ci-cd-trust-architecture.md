# CI/CD Trust Architecture — Decisions

**Date:** 2026-04-21
**Scope:** OSE (OurSharedEvents) CI/CD trust infrastructure — WAF bypass,
smoke-test framework, `/status` route, CI observability data.
**Status:** Accepted. Tickets follow from this doc.

---

## Why this doc exists

Multiple ticket drafts were surfacing the same three architecture questions
implicitly. Writing specs before answering the questions was committing us to
positions we hadn't named. This doc names them, records the call, and lets
downstream tickets be mechanical rather than decision-laden.

---

## Decision 1 — Shared packages vs OSE-local: promote later

CI/CD trust infrastructure (smoke-test assertion library, `/status` route
shape, CI-auth header primitive, etc.) is built **inside OSE** today. It is
promoted into `packages/*` only when a second sibling (OW, OA, or another)
actually needs the same primitive.

**Rationale.** `packages/*` is the cross-sibling contract layer. It shouldn't
host speculative contents — a package with one consumer is indistinguishable
from a local module with extra import overhead. Extraction is a PR, not a
re-architecture. YAGNI wins until the second consumer is real.

**Consequence for tickets.** "Build X as a shared package" is not a valid
scope for new CI/CD trust work until a named second consumer exists. If a
ticket proposes it, bounce back to "build in OSE; extraction ticket opens
when sibling #2 lands."

---

## Decision 2 — CI observability data is isolated from app data: commit now

Smoke-test results, drift reports, and other CI-produced observability data
do **not** share a D1 database with app data. Options:

- Separate D1 binding (`ocr-ci-db` or similar). Preferred.
- Same D1 but schema-fenced — clearly namespaced tables (`ci_*` prefix)
  excluded from app migrations. Acceptable if an extra binding is genuinely
  prohibitive; unlikely to be.

**Rationale.** Blast-radius separation. A CI retention-policy change must
not risk app data. An app schema migration must not break the CI dashboard.
The cost is one extra D1 binding. The cost of entanglement — coupling
observability lifecycle to product lifecycle — is high and discovered late.

**Consequence for tickets.** Tickets that create CI observability tables
name the D1 binding explicitly. No implicit fallthrough to the app D1.

---

## Decision 3 — `/status` route design: scope to OSE, extract on demand

The `/status` route is designed and deployed inside the OSE Worker. It is
**not** designed up-front for cross-sibling portability. When sibling #2
needs `/status`, we extract the route shape under Decision 1.

**Rationale.** Same YAGNI as Decision 1. Generalizing an API with one
consumer produces abstractions that rot before they're reused. Concrete
OSE-shaped code is cheaper to refactor than premature abstractions are to
unwind.

**Consequence for tickets.** `/status` work is OSE-team work, not
cross-sibling work. Route-shape debates ("what does /status return for a
generic sibling?") are out of scope until there's a second consumer.

---

## Ticket-routing implication

CI/CD-infrastructure work lands on the **OSE team** unless it explicitly
concerns cross-sibling contracts (at which point see Decision 1 —
"cross-sibling contract" is a high bar requiring a named second consumer).

Known routing mismatch: **OSM-1** (CF WAF bypass for automated API
consumers) lives on OurSharedMagnets but all implementation is in the OSE
Cloudflare zone. Re-route or split (OSM-1 as impact-tracker, new OSE ticket
for implementation) when OSM-1 is next touched.

---

## Explicitly deferred

These are real questions but do not need answers to move forward. Decide
each when the first ticket forces the question, not before:

- **CI secret naming convention** (`OCR_CI_*` vs `OSE_CI_*` vs per-concern).
  Decide when we introduce the first CI-only secret.
- **Drift-report + smoke-result co-location.** One D1 with two tables, or
  two D1s. Punt to the implementation ticket; either is consistent with
  Decision 2.
- **`/status` auth model.** Public, signed, or IP-allowlisted. Decide on
  the OSE implementation ticket.

---

## How to use this doc

- Before drafting a CI/CD-trust ticket, check which decision(s) it touches.
  Ticket acceptance criteria inherit from the decision; they don't re-litigate
  it.
- If a ticket needs a decision not listed here, that's a signal to update
  this doc first, not to commit the decision inside ticket acceptance
  criteria.
- This doc supersedes any inline architectural commitments made in prior
  ticket drafts.
