# @ocr/team

The agent team's own tooling. No model calls, no network, no secrets, no new outside service.

| Piece | File | Story |
| --- | --- | --- |
| Knowledge graph: roles, rules, files, invariants; at run time also the sway table, names and Matt's decisions with their message ids | `src/graph.mjs`, `src/sources.mjs` | OCR-245 |
| Per-role tools, least access: what each agent may ask for and run; a shared deny list for irreversible actions | `src/tools.mjs`, `team/tools.json` | OCR-246 |
| Eval scoring (same formula as the private `score.py`), planted-bug accounting, score history, drift alarms, graduation | `src/evals.mjs` | OCR-247 |

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
```

`--private` reads the owner's private team folder. What it adds (people's names, the sway table, decisions) is printed or written only where `--out` says; `--public` strips it. Never commit a graph built with `--private`.

## Tests

- Unit: `pnpm team:test` (parsers, graph rules and queries, tool rules, scorer, history).
- Integration: `tests/repo.test.mjs` runs against this repo's real cards, agents and manifest.
- CI: workspace CI runs the tests, then validates the real graph and the tool manifest.
- Mutation: `pnpm mutation:team`, per-file floors in `mutation-floors.json` (first run 28 Nov 2026: 93% of mutants killed).

## Rules

- A team agent is read-only. `Write` and `Edit` are never granted; the checker fails a manifest that grants them.
- Deny wins over allow. Merge, deploy, production, secrets, repository controls, push and file writes are denied to every role.
- Changing `team/tools.json` needs the owner's review.
