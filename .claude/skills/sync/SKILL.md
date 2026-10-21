---
name: sync
description: >
  Run a sync (the reconciliation loop) — drive drift to zero across the truth
  surfaces (Linear <-> code <-> brain <-> memory), verify-first, and emit the
  workflow readout. Scope with an arg: `memory`, `process`, or none (= both +
  readout). Use when the user types /sync, asks to sync/reconcile memory or the
  process chain, or closes out a work session and wants the workflow assessed.
---

# sync — the reconciliation loop, on call

When invoked, run the standing sync. **Assess-first: surface drift as a graded
register; apply nothing until the owner decides.** Never handle tokens or
merges — the owner controls all writes (see feedback-agent-never-controls-authorization).

## 1. Scope (from the argument)
- `memory`  — memory <-> brain <-> Linear only. Pointer freshness: MEMORY.md
  index vs the files, stale claims, spent dated snapshots, dead `[[links]]`.
- `process` — the process chain only: Shared Brain -> Invariant -> Code -> CI/CD
  -> Test Pyramid -> Results -> Reporting -> back to Brain. Find where intent and
  reality diverge; sweep in all four directions.
- (no arg)  — both, in one pass, then the readout.

## 2. Load the doctrine (don't improvise)
Read `OCR_STANDARD_reconciliationLoop` (everyday name: the sync loop) and the
memory pointers `memory-reconcile-loop`, `feedback-reconciliation-definition`.
Work from the canonical process, not memory alone.

## 3. Verify-first (always)
- Confirm each claim against reality (git, CI, live state) before flipping anything.
- Every Done-flip cites `sha:<7+hex> - ancestor_verified:true - pr:#NNN`.
- Comment, don't flip, on stalled items. Never duplicate — fold into the owner.

## 4. Sync every surface in the pass
Linear AND brain AND memory. A flip on one surface without the others is new
drift, not a fix.

## 5. Emit the workflow readout + append to the run log
Use the fixed per-process template — one line each, **expected vs actual
(found / did / skipped)**:

    ## Workflow readout — <date>   Trigger: /sync (manual) | scheduled
    | Process           | Expected                    | Actual (found/did/skipped) | Drift filed |
    | Governance        | invariants enforced         | ...                        | ID / -      |
    | Memory-sync       | memory <-> brain <-> Linear = 0 | ...                    | ...         |
    | Process-sync      | chain green end-to-end      | ...                        | ...         |
    | Documentation     | one source of truth, found  | ...                        | ...         |
    | Tickets (queue)   | classified, no mis-lane     | gate: N violations         | ...         |

    Signals: recurrence=<n> - new-drift=<n> - time-to-detect=<...>
    Trend (vs last runs): recurrence up/down - drift-per-run up/down
    Verdict: healthy-derivative | watch | ANDON

Append it to the sync run log (the memory-reconcile-loop run log). The trend —
not a green light — is what you read. This is why /sync also *assesses* the
workflow each run, not just tidies it.

## 6. Churn rule (what earns a tracked ticket)
Only `action` / `field` / `ops` / a live `spike` becomes a tracked Linear story.
Vision, decision records, and references become labels + brain-docs — never
churning tickets. (See OCR_STANDARD_storyClassification section 6.)

## 7. Close with a one-line verdict + the register
State `healthy-derivative | watch | ANDON`, then list improvements as a graded
register. Apply nothing — the owner decides, then a separate build phase lands it.
