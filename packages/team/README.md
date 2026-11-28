# @ocr/team

The agent team's own tooling. No model calls, no network, no secrets, no new outside service.

| Piece | File | Story |
| --- | --- | --- |
| Knowledge graph: roles, rules, files, invariants; at run time also the sway table, names and Matt's decisions with their message ids | `src/graph.mjs`, `src/sources.mjs` | OCR-245 |
| Per-role tools, least access: what each agent may ask for and run; a shared deny list for irreversible actions | `src/tools.mjs`, `team/tools.json` | OCR-246 |
| Eval scoring (same formula as the private `score.py`), planted-bug accounting, score history, drift alarms, graduation | `src/evals.mjs` | OCR-247 |
| Trust ladder: supervised, comment, file, draft PR, auto-merge (low risk, owner's yes per role, Code Owners on); computed from the record, never set by an agent | `src/trust.mjs` | OCR-248 |
| Guardrails: warn at budget, stop at 2x, stop at the third failed try, spend cap, turn limit, deny list | `src/guard.mjs` | OCR-249 |
| Cost and time per role and week, per confirmed finding; the home companion is left out | `src/cost.mjs` | OCR-250 |
| Locked append for the shared run log and scores (two writers at once cut a line on 28 Nov) | `src/log.mjs` | OCR-250 |
| Dashboard data: each role's standing, rung, last run, alarms, open disagreements, this week's spend | `src/dashboard.mjs` | OCR-251 |
| Event triggers, prepared and switched off: event-to-role routing and `.github/workflows/team-events.yml`, gated on `TEAM_EVENTS_ON` with no model step | `src/events.mjs` | OCR-252 |

## Commands

```bash
node packages/team/src/cli.mjs graph [--brain ../OCR-docs] [--private <team folder>] [--out g.json] [--public]
node packages/team/src/cli.mjs query owner privacy --private <team folder>
node packages/team/src/cli.mjs query rules workers/oursharedevents/src/lib/count-floor.ts
node packages/team/src/cli.mjs query decisions voting --private <team folder>
node packages/team/src/cli.mjs tools-check
node packages/team/src/cli.mjs tools-allow sre "gh run list --branch main"
node packages/team/src/cli.mjs score answer.txt --key <private set>/key.json
node packages/team/src/cli.mjs evals --scores <team folder>/scores.ndjson
node packages/team/src/cli.mjs trust --log <team folder>/log.ndjson --scores <team folder>/scores.ndjson
node packages/team/src/cli.mjs cost --log <team folder>/log.ndjson
node packages/team/src/cli.mjs guard --state '{"budgetMinutes":60,"elapsedMinutes":75,"failedTries":{"ci":2}}'
node packages/team/src/cli.mjs dashboard --scores <team folder>/scores.ndjson --log <team folder>/log.ndjson --room <team folder>/room/log.md --out d.json
node packages/team/src/cli.mjs append --file <team folder>/log.ndjson --json-line '{"date":"…","role":"sre",…}'
```

`--private` reads the owner's private team folder. What it adds (people's names, the sway table, decisions) is printed or written only where `--out` says; `--public` strips it. Never commit a graph built with `--private`.

## Tests

- Unit: `pnpm team:test` (parsers, graph, tools, scorer, history, trust, guard, cost, locked append).
- Integration: `tests/repo.test.mjs` runs against this repo's real cards, agents and manifest.
- Contract: `tests/workflow.test.mjs` keeps the event workflow gated, read-only, secret-free and without a model step.
- CI: workspace CI runs the tests, then validates the real graph and the tool manifest.
- Mutation: `pnpm mutation:team`, per-file floors in `mutation-floors.json` (28 Nov 2026: 93% of mutants killed).

## Rules

- A team agent is read-only. `Write` and `Edit` are never granted; the checker fails a manifest that grants them.
- Deny wins over allow. Merge, deploy, production, secrets, repository controls, push and file writes are denied to every role.
- Changing `team/tools.json` needs the owner's review.
