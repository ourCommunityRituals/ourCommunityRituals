---
name: work-intake
description: The four-field contract for handing work to Claude Code — Stated Problem, Definition of Done, Verification Steps, Formatting Requirements. Load when the owner is writing a ticket/task, when an intake is missing a field, or when Claude must restate an under-specified request before building. Enforces CCR (Critical, Conservative, Recursive) + "green is rented".
---

# OCR_STANDARD_workIntake (repo skill)

**Status:** ACTIVE · **Owner:** platform · **Last updated:** 2026-09-03

> The **work-intake contract** is the shape every non-trivial task is handed to Claude Code in:
> four fields — **Stated Problem**, **Definition of Done**, **Verification Steps**, **Formatting
> Requirements**. It is the *intake* twin of [[OCR_STANDARD_reconciliationLoop]]: reconciliation
> drives drift between intent and reality to zero *after* the fact; this contract states the intent
> and the proof *before* the fact, so there is a fixed target to reconcile against.
>
> **This standard is the durable process.** Individual tickets are filled-in instances, not new
> standards. Promotion to a propagating brain doc (`OCR-docs/docs/standards/OCR_STANDARD_workIntake.md`
> → spokes via `propagate-standards.yml`) is a follow-up, human-gated like #109/#110 were.

---

## 1. Why this exists

An under-specified request forces Claude to *guess* the target, the bar for "done", and the proof —
and a guessed target cannot be reconciled, only rationalized. The four fields remove the guessing:
they name the intent, make "done" objectively checkable, make the check **runnable**, and fence the
output. Each field feeds a doctrine already earned:

| Field | Feeds |
|---|---|
| Stated Problem | the *intent* half of reconciliation — bug = where intent & reality diverge ([[feedback-systematic-top-down-bottom-up]]) |
| Definition of Done | the lease terms — **green is rented** ([[honest-green-runnable-reconciliation]]); ≥1 line must be a runnable reconciliation |
| Verification Steps | runnable proof — assert **integrity, not presence** ([[sdet-artifact-integrity-standard]]) |
| Formatting Requirements | single-concern delivery + first-pass legibility ([[feedback-one-ticket-commit-pr-merge]] · [[feedback-first-pass-legibility]]) |

## 2. The template

```
### <TICKET-ID>: <title>

**Stated Problem:**
<what's wrong / the goal, and WHY — the intent, in the owner's words>

**Definition of Done:** (all must be objectively true)
- [ ] <criterion — checkable, not vibes>
- [ ] <≥1 is a RUNNABLE reconciliation, not "code written">

**Verification Steps:** (command → expected output / exit)
1. `<cmd>` → `<expected>`
2. …

**Formatting Requirements:**
- Commit: <e.g. conventional `ci(...)`, single-concern>
- Do NOT touch: <fences — files/areas out of scope>
- <comment density / naming / file-location conventions>
```

## 3. Field-quality bar (what makes each field paid-up vs vacuous)

| Field | Paid-up | Vacuous (send back / restate first) |
|---|---|---|
| Stated Problem | names the intent AND the why; falsifiable | "make it better", no why |
| Definition of Done | every line objectively checkable; ≥1 runnable | "works", "looks right", presence-only |
| Verification Steps | exact commands + expected output/exit | "run the tests" with no expected result |
| Formatting Requirements | explicit fences + commit shape | absent → assume single-concern + conventional-commit + don't-touch-unrelated |

## 4. How Claude Code consumes each field (the contract's other half)

1. **Missing/thin field → STOP and propose it before building.** Claude does not invent a DoD or a
   verification silently — that is the *Conservative* in CCR. It restates the request in this shape
   and gets confirmation first.
2. **Verification Steps are the acceptance test, not a suggestion.** Claude runs them and pastes the
   *actual* output. If they don't pass, it is not done, said plainly ([[feedback-fix-gates-never-bypass]]).
3. **"Done" means "verification reconciles THIS run"**, reported as paid-through, never owned-green
   ([[honest-green-runnable-reconciliation]]).
4. **Formatting Requirements are hard fences** — single-concern, don't-touch lists honored; audit
   `git diff --name-only main...HEAD` before delivery.
5. **Bracket on security** where the work touches an auth/egress/injection surface — open and close on
   a security assertion ([[feedback-flow-brackets-security]]).

## 5. Boundaries

* **Agent never controls authorization** ([[feedback-agent-never-controls-authorization]]): a
  Verification Step may *read* state or *run* tests; it never mints tokens, deploys, or merges — those
  stay owner actions.
* **One ticket → one PR** ([[feedback-one-ticket-commit-pr-merge]]); a DoD that spans concerns is a
  signal to split the ticket, not to bundle.
* This contract governs *intake*; the *runnable proof* it demands is produced and reconciled per
  [[honest-green-runnable-reconciliation]] and verified per [[feedback-reconciled-test-pyramid]].
