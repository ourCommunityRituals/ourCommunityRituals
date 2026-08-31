# `.claude/` — OCR Recon Fleet worker definitions

Four read-only recon workers, in `agents/`. They produce the dated, mechanical,
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

## Verify before Wave 1 spends the prompts on nine repos

The `tools:` lines use the scoped form (`Bash(git log:*)`). Whether a given CLI
version honours that scoping *inside agent frontmatter* — as opposed to in
`permissions.allow` — is a property of the installed version, not of this file.
Confirm it rather than assuming it, because the failure mode is silent in the
dangerous direction: a scope that does not parse can widen to full `Bash`.

Before dispatching Wave 1:

1. Run `/agents` and confirm all four load, with the tool list you expect.
2. Dispatch `drift-auditor` once against ourSharedEvents and read its transcript,
   not just its report. It should have run `git log`/`git status` and nothing else.
3. If the scoped form did not hold, drop `Bash` from `drift-auditor` and
   `board-reconciler`/`posture-scanner` entirely and re-dispatch. Grep and Glob
   cover most of the method; git history is the smaller half.

A worker that attempted a write outside the lead-session artifact path is kill
condition 3 — a rail breach, not a bug. Halt the fleet, name the cause, then restart.

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
