# CCR / Extended-Scrum Methodology — Case-Study Pack

> **Purpose.** Real, dog-fooded examples of the methodology (CCR confidence-gate + Extended Scrum with an embedded agentic-security veto + reconciliation + fail-closed honesty) catching things that "looks-fine" engineering would have shipped. These are the receipts.
>
> **Scrubbing convention.** Each case has two parts:
> - **Pattern** — fully generic and shareable as-is (no project specifics).
> - **Specifics [SCRUB]** — the concrete IDs/names/paths that identify this project. **Delete every `[SCRUB]` block before external sharing;** the Pattern stands alone as a teaching example.
>
> Source: one working session, 2026-08-27. All examples happened; none are constructed.

---

## Case 1 — The four-layer silent rot (a verification process that had no object whose job was to go red)

**Pattern.** A non-blocking "reporting" job that produced a trust-relevant artifact had been failing silently for ~3.5 weeks. Nobody noticed because it was informational — nothing went red. When finally inspected, the failure wasn't one bug; it was **four stacked failures, each hidden behind the one in front of it**:
1. a runtime-version incompatibility that made the job crash before doing anything;
2. a missing dependency-checkout that made it silently fall back to a stale hardcoded source;
3. that fallback source was itself out of date (undercounted the real total);
4. even once generating correctly, it could not deliver — the target was a protected branch that rejected its automated push.

The methodology's contribution: an **assessment whose explicit job was to find what's silently wrong** surfaced it; **verify-first** peeled the layers one at a time instead of "fixing" the top one and declaring victory; and the fix **shipped the test that would have caught it** (reactive correction), so it can rot silently again → never.

**Lesson.** "Green because nobody looked" is the most dangerous state. Every trust-relevant process needs an object whose job is to go red. A non-blocking gate is a blind spot with a clean conscience.

**Specifics [SCRUB].** Artifact = `conformance.json` (invariant-coverage meter). Layers: (1) workflow pinned Node 20 vs generator's `--experimental-strip-types` needing ≥22.6; (2) no OCR-docs checkout → fell back to `INLINE_INVARIANTS`; (3) inline registry stopped at #24, missing #25 sponsor_share_covenant; (4) protected-branch `GH006` rejected the bot push. Ticket OSE-1031; PR #406; frozen since 2026-08-03.

---

## Case 2 — Engineering's awesome solution, the security veto, and the generative "no"

**Pattern.** Engineering proposed a clean, minimal, obvious fix. Put in front of the security lens, the answer was **absolutely not** — for two reasons invisible to a functional review: (a) the chosen automation identity *structurally could not* trigger the required checks, so the change could never actually merge; and (b) a broadly-scoped write credential would sit in the environment while untrusted dependency-install scripts ran — a credential-exfil hole. Run through the confidence gate, the naïve version scored **7.5% and hard-stopped.** The veto did not kill the goal — it **produced a better solution**: the same outcome via a least-privilege, correctly-sequenced, human-merged path.

**Lesson.** Elegance is necessary, not sufficient. On exploitable findings the security veto is absolute (no partial credit — a 90%-secure clever solution is not a shipping state). Embed the veto *inside* every review, not as a final sign-off, so the "no" lands before sunk cost and before anyone's attached to the design. The best vetoes are generative.

**Specifics [SCRUB].** "Just have the workflow open a PR" for the meter refresh. (a) `GITHUB_TOKEN`-opened PRs don't trigger workflows → 0/7 required checks. (b) `OCR_PROPAGATE_TOKEN` (org-write) present during `npm ci`. Hardened path: token after `npm ci`, `persist-credentials:false`, `gh pr create` create-or-update, human/CODEOWNERS merge, App-migration fast-follow (OSE-1045). CCR worksheet on OSE-1031.

---

## Case 3 — Verify-first vs. a confident, fabricated answer

**Pattern.** A research/scout agent returned a thorough, authoritative map — including precise file paths for a dependency that, on a one-line existence check, **was not present at all**. The paths were fabricated with total confidence. Because the plan was checked against ground truth before acting, the real root cause (a runtime-flag incompatibility) turned out to be *different* from the plausible hypothesis the fabrication implied (a missing-path problem).

**Lesson.** AI output is plausible by construction; plausibility is not evidence. "Verified" requires a citable check (a file that exists, a log line, a test result), not "the agent said so." The bug is where *intent and reality diverge* — map both directions and act from the divergence, never from one confident narrative.

**Specifics [SCRUB].** An Explore subagent cited `OCR-docs/ocr-docs-brain/...` paths; a glob showed the brain repo wasn't checked out locally. Root cause was the Node flag, not the (also-real, lower-priority) missing brain checkout.

---

## Case 4 — The reconciliation loop whose output had no consumer

**Pattern.** An automated drift-detector correctly fired and opened tickets — but the tickets piled up unrouted, because the *check itself* was mis-shaped: it demanded, of a specialized repo, artifacts that only belong to a different repo. Result: **N identical false-red tickets, all one root cause**, and a standing "these tickets have no destination" complaint. The methodology move: root-cause the whole class to one owner, link them, establish a **routing rule** ("a ticket that only fails on cross-repo paths routes to the check-owner, never to the spoke"), and de-escalate — instead of hand-fixing N symptoms.

**Lesson.** A loop that generates work nobody consumes is worse than no loop — it manufactures noise that trains people to ignore the signal (alert fatigue → admin-merge-through). Before you *scale* a detect→ticket loop, make sure its output has a destination. Per-spoke false-reds are a reconciliation failure, not a spoke bug.

**Specifics [SCRUB].** Auto-drift-ticketer opened OCR-92/94/97/98 (WKRP PRs #37–40), all failing `invariant_test_files` demanding OSE-repo specs of WKRP. Root cause OCR-93/OCR-41 (OSE-shaped check). Routing rule posted on OCR-83.

---

## Case 5 — The stale-branch false-red (a "gate failure" that was rot, not a defect)

**Pattern.** A feature branch's security gate went red. It *looked* like a real finding. It was actually an artifact of the branch having been cut *before* an infrastructure fix landed on main — so it was running the old, broken tooling. The fix was not to debug the "failure" but to **sync the branch with main.** Corollary: any other open branch cut before that fix is failing the same way right now.

**Lesson.** Not every red is a finding; read the log for *finding vs. rot* before acting. Feature branches silently decay against main-landed infra fixes. "Sync, don't rerun" — and when you find one stale branch, assume siblings.

**Specifics [SCRUB].** PR #402's S2 crashed on unpinned-semgrep; the pin had landed on main via #404 after #402 branched. Fixed by merging main into the branch, not by "fixing" S2.

---

## Case 6 — Honest self-correction (refusing to declare done on an assumption)

**Pattern.** After a merge, the reviewer had claimed the system would "self-heal." It did not — the delivery step was rejected downstream, and the artifact stayed stale. Rather than let the auto-close stand, the ticket was **reopened**, the false claim corrected in the record, and the newly-discovered blocker documented. The definition-of-done ("the artifact actually shows the correct value") was *not* met, so the work was *not* done — regardless of the green merge.

**Lesson.** "Merged" ≠ "done"; "should work" ≠ "verified." When a post-hoc check falsifies an earlier claim, correct the record loudly and reopen — a ticket flipped to Done while its DoD is unmet is a *new* inconsistency. Verify outcomes, not intentions.

**Specifics [SCRUB].** Claimed the merge of OSE-1031 would regenerate the meter on main; branch protection rejected the bot push (Case 1, layer 4). OSE-1031 moved Done→In Progress with the finding recorded.

---

## Case 7 — Reconciliation means *every* surface, not just the tracker

**Pattern.** Two tickets were correctly flipped to Done in the tracker — but the working-memory ledger and its index still described the old state. The correction: reconciliation isn't complete when *one* surface is updated; every truth-surface (tracker ↔ docs ↔ working memory ↔ deployed state) must move together, in the same pass. Flipping one while leaving another is just relocating the drift.

**Lesson.** Doc-sync is *half* of reconciliation, not optional cleanup. Sync every surface in the same action, so the next reader (human or agent) inherits one consistent world.

**Specifics [SCRUB].** OSE-1016/1017 flipped Done in Linear while `ci-hosted-runner-migration.md` still called the PR "red"; both memory ledger + `MEMORY.md` index reconciled in the same pass.

---

## Case 8 — Phased security (don't let perfect block the launch; don't leave broad-scope permanent)

**Pattern.** A security-critical decision had a clean "best" answer that required privileged setup work (latency) and a "good, available now" answer with a documented residual. The call: **ship on the hardened available option now** to unblock the timeline, and **file the migration to the least-privilege option as a tracked fast-follow** — explicitly, so the residual is never silently permanent.

**Lesson.** Conservative-but-shipping. "Verified with a documented, tracked residual" is a legitimate state; "we'll fix the broad-scope token eventually" (untracked) is not. Name the residual, give it a ticket, and put a fence around when it must be closed.

**Specifics [SCRUB].** Reuse `OCR_PROPAGATE_TOKEN` (hardened) now vs. provision a least-privilege GitHub App (needs admin). Chose reuse-now + migration fast-follow OSE-1045, before the pattern spreads.

---

## Case 9 — The discipline applied to itself (the process reconciling its own artifacts)

**Pattern.** A working-memory index blew past its size budget **even though the rule to keep it lean already existed** — because slimming was treated as later cleanup, not part of each save. The fix moved the discipline *into the write itself*: compress to summary-plus-links at write time, every save. The system started policing its own artifacts the same way it polices the product.

**Lesson.** A rule without machinery re-drifts; discipline that isn't part of the action doesn't happen. The strongest signal a methodology is real is that it's applied to *itself* — the reviewer's own outputs get the same gate as the code.

**Specifics [SCRUB].** `MEMORY.md` hit ~29.6 KB vs a ~24.4 KB target despite a "≤200-char index lines" rule; slimmed to ~16 KB and the rule was re-encoded as a write-time step.

---

## The through-line (the shareable thesis)

Every case above is the same beam seen from a different angle:

- **Reconciliation** — drive every layer to agreement; the bug lives where they diverge (Cases 1, 4, 6, 7).
- **The embedded security veto** — awesome ≠ safe; the veto is absolute on exploitable findings and generative when embedded early (Cases 2, 8).
- **Verify-first / evidence-based** — plausible is not verified; check ground truth before acting (Cases 3, 5, 6).
- **Fail-closed honesty** — red/absent when unproven, never silently green; an object whose job is to go red (Cases 1, 9).
- **The CCR run at extended-scrum status** — the convergence gate where all of the above become one scored, auditable, defensible decision *before* ship.

In an era where anyone can generate a plausible solution in seconds, the scarce and sellable thing is a process that reliably tells you which ones will hold — and refuses to ship the ones that won't. These are the receipts that it does.
