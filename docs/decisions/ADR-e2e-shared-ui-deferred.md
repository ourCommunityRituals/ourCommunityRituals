# ADR — `packages/ui/e2e/shared-ui.spec.ts`: three assertions ported, one deferred

**Status:** accepted · **Date:** 2026-09-19

## Context

`packages/ui/e2e/shared-ui.spec.ts` imports `@playwright/test` and asserts four
properties of a rendered page against `process.env.BASE_URL` (default
`http://localhost:8787`).

It cannot run, and never could:

- no package in the workspace declares `playwright` or `@playwright/test`
- no `playwright.config.*` exists anywhere under `packages/ui`
- no CI job references it
- it needs a deployed worker origin, and this hub repo neither builds nor deploys one.
  `pnpm-workspace.yaml` is explicit that sibling app repos "remain standalone… keep
  their own lockfiles and CI", and the only publish workflow here is scoped to
  `@ocr/flags` and is `workflow_dispatch`-only.

A spec that can never run is worse than no spec. It reads as coverage in a directory
listing and delivers none — the same false-confidence shape as the three absent-tier
gates this repo has already found and fixed (L1 lint, COST-201, `packages/ui`).

## Decision

**Port what does not need a browser; defer what does. Delete nothing.**

Three of the four assertions are properties of the stylesheet and the server-rendered
partials, both of which are in this repo. They are now live in
`packages/ui/tests/ui-contract.test.ts` and run in the gate:

| Original e2e assertion | Where it lives now |
|---|---|
| tap targets meet the 48px minimum | `ui-contract.test.ts` — asserts every touchable class declares `min-height` |
| gated screens show an empty state with a next step | `ui-contract.test.ts` — asserts `accessDenied`/`emptyState` output |
| a page links the shared sheet, not an inline blob | already covered statically by `contract.test.ts` via `checkTemplate` |
| **shared stylesheet is served once and cached** | **deferred — genuinely needs a live origin** |

The spec file stays, unmodified, as the record of what rendered verification would
add. It is not wired to anything and does not pretend to be.

## What this does not claim

The ported assertions check that the stylesheet *declares* a 48px minimum and that
partials *emit* an action. They do not check computed layout, real tap geometry,
cache headers, or that a deployed page actually links the sheet. That needs a browser
against a deployment and remains genuinely uncovered.

## Re-enable criterion

When `@ocr/ui` has a reachable deployment target in CI: add `@playwright/test` and a
`playwright.config.ts` to `packages/ui`, add an `e2e` script, and wire a job that sets
`BASE_URL`. At that point the deferred assertion — and rendered versions of the three
ported ones — should run against it.

Until then, do not add a job that runs this spec against `localhost:8787`. It would
pass by connecting to nothing, which is the exact failure mode this ADR exists to avoid.
