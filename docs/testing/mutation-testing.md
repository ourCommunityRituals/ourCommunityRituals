# Mutation testing for the shared packages

A green test suite says the tests ran. It does not say they would notice a
fault. Mutation testing checks that: StrykerJS writes one small fault at a time
into the source (a `<` to `<=`, a `true` to `false`, a removed call), reruns
the tests that cover the line, and records whether any test failed. A mutant
that survives is a fault the tests would let ship.

## The passes

| Layer | Package | Config | What judges it | Floors |
| --- | --- | --- | --- | --- |
| Unit | `@ocr/flags` | `stryker.conf.mjs` | evaluator and in-memory adapter tests | `mutation-floors.json` |
| Integration | `@ocr/flags` | `stryker.integration.conf.mjs` | the shared adapter spec on real SQLite (better-sqlite3, also for D1's statement shape) and Postgres (pg-mem) | `mutation-floors.integration.json` |
| Unit | `@ocr/tokens` | `stryker.conf.mjs` | token and contrast tests | `mutation-floors.json` |
| Unit | `@ocr/ui` | `stryker.conf.mjs` | escaping, partials, brand, toast and token tests | `mutation-floors.json` |
| Unit | `@ocr/team` | `stryker.conf.mjs` | the agent team's graph, tool-manifest, eval-score and history tests | `mutation-floors.json` |
| End to end | `@ocr/ui` | in the spokes | Playwright journeys against a Worker that serves the pinned hub | ourWKRP `mutation/e2e-mutants.json`, ourSharedEvents `mutation/layer-mutants.json` |

The end-to-end layer lives in the spokes because only there does the shared UI
run inside a real page. `packages/ui/e2e/shared-ui.spec.ts` needs a live
Worker and no workflow here runs it.

## Floors

Each file has its own floor, the score it reached when last measured.
`scripts/ci/mutation-file-floor.mjs` fails the pass when a file scores under
its floor, is missing from the report, or has no valid mutant. On a pull
request it also compares the floors with the base branch's: a floor may be
raised or added, never lowered or dropped. Stryker's own global threshold is
off, because one file at 100% can hide another well under it.

`packages/flags/tests/mutation-ci.test.ts` checks that every mutated file has a
floor, that each pass has its script and its matrix entry in the workflow, and
that the checker fails on each fault it exists to catch.

## Running

    pnpm install --frozen-lockfile
    pnpm mutation:flags
    pnpm mutation:flags:integration
    pnpm mutation:tokens
    pnpm mutation:ui
    pnpm mutation:team

Each pass takes under two minutes. `.github/workflows/mutation-testing.yml`
runs all five nightly, on demand, and on a pull request that touches a
package. Reports are uploaded as artifacts (`reports/` in each package).

## First run (2026-11-24)

- `@ocr/ui` `esc.ts`: 9 of 18 mutants survived. Nothing tested `esc` or
  `escUrl` directly, so dropping the `&`, `"` or `'` escape, the trim before
  the scheme check, or the `#` fallback all passed. `tests/esc.test.ts` now
  kills all 18.
- `@ocr/flags` `evaluator.ts`: 31 of 50 mutants had no test. All were in the
  fail-open paths (a storage error must read as ON and be reported, never
  thrown) and in tier detection. `tests/evaluator.test.ts` takes it to 98%.
- Lowest floors, the next tests worth writing: `ui/src/css.ts` 25%,
  `tokens/src/surface.ts` 35.7%, `tokens/src/emit.ts` 38.4%,
  `ui/src/partials.ts` 40.5%, `ui/src/tokens.ts` 42.5%.
- `ui/src/tailwind.ts` has no test at all (54 mutants, none covered), so it is
  not in the pass yet: a floor of 0 would be a gate that cannot fail.
