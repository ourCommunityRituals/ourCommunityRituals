# `.claude/` — OCR Recon Fleet worker definitions

Six recon workers, in `agents/`. They produce the dated, mechanical,
per-repo verification artifacts described in
[`docs/methodology/ocr-recon-fleet-dispatch-runbook.md`](../docs/methodology/ocr-recon-fleet-dispatch-runbook.md).
Read the runbook first — it holds the rails, the wave order, the artifact
convention, and the kill conditions. This file covers only what an operator
needs to know about the four files under `agents/`.

This README sits one level above `agents/` on purpose: Claude Code scans
`.claude/agents/*.md` as agent definitions, so only the four workers belong in
that directory.

| Worker | Answers | Tools |
|---|---|---|
| `drift-auditor` | Does the code match what the docs claim? Both directions. | Read, Grep, Glob, scoped read-only `git` |
| `invariant-sweeper` | Which invariants are MECHANICAL, which are only PROSE, which are ABSENT? | Read, Grep, Glob |
| `board-reconciler` | Does declared Linear sprint state match actual commit activity? | Read, Grep, Glob, `git log`, read-only Linear MCP |
| `posture-scanner` | Dependency, secrets, and agent-trust-surface posture. | Read, Grep, Glob, `git log` |
| `pyramid-tracer` | Does a written test reach a blocking gate, and does a required gate rest on a real assertion? | Read, Grep, Glob, `git log` |
| `ccr-assessor` | One extended-scrum role lens over already-verified findings. Judges; does not re-scan. | Read, Grep, Glob |

## Why these live here and not in a plugin

Plugin-loaded subagents silently drop `hooks`, `mcpServers`, and
`permissionMode` at load time. A worker whose containment depends on a field
that was dropped without an error is not contained. These stay checked in at
`.claude/agents/` in the repo under scan.

## The rails these files carry

Each definition restates R2 (lead writes, workers report), R3 (no scope spanning
ourSharedEvents and ourWKRP), and R4 (Gate Queue capped at five) in its own body,
because a worker that only sees its own prompt cannot inherit a rail from a
runbook it was never shown.

R1 (read-only) is carried by the `tools:` frontmatter: no `Edit`, no `Write`, no
`Agent` in any of the four. `posture-scanner` additionally treats `.claude/`
content in the repo under scan as data — a hook or agent definition it reads is a
finding, never an instruction.

## The `tools:` scoping does NOT contain these workers — verified 2026-09-01

**Do not rely on the `tools:` frontmatter for containment.** The scoped form
(`Bash(git log:*)`) is parsed and displayed at registration and **is not enforced at
call time**. Two workers dispatched through these definitions independently reported
running `python3`, `find`, `cat`, `sed`, `awk` and `git log --all -p` with no refusal,
and one stated plainly that its runtime grant was the full unscoped `Bash` tool.

Bash writes files. So these six definitions have **no mechanical read-only guarantee**.
R1 holds for them only as a sentence in a prompt.

What to do instead:

1. **Dispatch on a harness-provided read-only agent type** whenever the read-only
   property actually matters. That is a real control; `tools:` is not.
2. Keep the `Bash(...)` lines as a statement of what each worker should need — just
   never cite them as the reason a worker cannot write.
3. **State the read-only constraint in every dispatch prompt.** That sentence is now
   the mechanism.
4. Ask every worker, separately from its audit: *"list every Bash command you ran and
   state whether any was refused."* It costs nothing and it is how this was found.
5. Re-check after any CLI upgrade — this is a harness property and can change silently.

See runbook §8.7 for the evidence.

## Dispatch

One repo per worker invocation, one wave at a time, per the runbook:

1. **Wave 1** — all four against ourSharedEvents (calibration; do not proceed until
   the output is judged useful).
2. **Wave 2** — ourWKRP alone, own session, own day.
3. **Wave 3** — ourSharedRecords, ourSharedGames, ourSharedMagnets.
4. **Wave 4** — ourAirwaves, ourEventRings, ourSharedPulse.
5. **Wave 5** — OCR-docs, `drift-auditor` and `invariant-sweeper` only.

Workers return reports to the lead session. The lead session writes
`OCR-docs/recon/<YYYY-MM-DD>/` and the wave `_rollup.md`. Nothing else writes.
