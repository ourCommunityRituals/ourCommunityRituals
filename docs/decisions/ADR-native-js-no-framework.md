# ADR — `@ocr/ui` ships no framework: the FE is native JS

**Status:** hub implementation landed; **brain policy NOT yet declared** — see Rollout order
**Date:** 2026-09-19

## Context

`packages/ui` carried two parallel component layers for the same thirteen components:

- **`src/partials.ts`** — functions returning HTML strings. Every interpolation goes through
  `esc()` / `escUrl()`; `escUrl` rejects `javascript:` and `data:`. **32 tests** assert the
  actual rendered output, including XSS.
- **`src/react/`** — a React layer, added by PR #14 as an "OSE-538 Phase 3 bridge".

The React layer could not be verified, and had not been:

| | evidence |
|---|---|
| no consumers | referenced only by `src/index.ts` (re-export) and its own `./react` export |
| cannot render | `react-dom` was never a dependency of this workspace |
| no behavioural tests | all 23 asserted `typeof X === 'function'` |
| deferral target absent | its own docstring: *"Full DOM/interaction tests belong in the consuming Phase 3 app (Playwright E2E)"* — that spec has no runner, no config, no CI job, and needs a `BASE_URL` this repo does not deploy |

Net behavioural coverage of the React layer was **nil**, presented as a tested component
library. That is the same false-confidence shape as the three absent gates this repo has
already found and fixed (L1 lint, COST-201, `packages/ui`).

There is no test automation for a framework here and none planned. There *is* mature
automation for strings, because a string needs no renderer, no DOM and no browser.

Corroborating: invariant #14 records ourWKRP's FE as *"HTML placeholders per
project_frontend_plan"*. The brain has no record of any consumer of `@ocr/ui/react`, and no
mention of React in the invariant register at all.

## Decision

**`@ocr/ui` ships no UI framework. `partials.ts` is the component layer; `styles.ts` is the
stylesheet; tokens are the contract.**

Each concern in its natural home:

- **Components → `src/partials.ts`.** HTML strings, escaped at every interpolation.
- **Styling → `src/styles.ts`.** `partials.ts` emits nothing but class names — zero inline
  styles, zero literal hex — so the stylesheet *is* the design system as far as rendered
  output goes, and one change reaches both products.
- **Previews → generated from `partials.ts`.** `scripts/build-previews.mjs` emits every
  design-system preview from the product's own renderer. A preview cannot show markup the
  product does not render, because it is that markup.
- **Enforcement → `tests/no-framework.test.ts`.** Seven assertions: no framework in any
  dependency field, no `./react` subpath, no JSX or framework import under `src/`, no
  bundle, no declared libraries, no preview mounting a framework.

**Blast-radius control.** Removing `./react` is a public subpath removal. It is in its own
commit so it is trivially revertable, and it was taken only after confirming zero consumers
in the hub and zero record in the brain. **This session cannot see sibling repos** — if
ourSharedEvents or ourWKRP imports `@ocr/ui/react`, that revert is the remedy, and the ADR
is wrong rather than the code.

## Rollout order (locked)

Per ADR-005's pattern: policy is declared before code. **This ADR inverts that, and says so.**

1. **OCR-docs (brain) — policy. NOT DONE.** A `no_framework_layer` invariant in
   `architectural-invariants.yaml` (Infrastructure group), plus reconciling invariant #14's
   `design_system_dependencies`, whose `ose: ouroboros-ds` row is unverified and whose
   `osm: Postman` row is confirmed stale. Until this lands, the hub implementation below is
   **provisional**: correct in this repo, undeclared to the fleet.
2. **OCR-org (hub) — implementation. DONE.** React layer removed, previews regenerated from
   `partials.ts`, bundle retired, guard test in the gate.
3. **OSE — consumer-zero.** Confirm nothing imports `@ocr/ui/react`; adopt.
4. **OW — second spoke.** Its FE is HTML placeholders today, so it is the natural first
   beneficiary of a native component layer.
5. **OSM → OAW → remaining spokes**, one at a time.

## Alternatives considered

**A: Keep React, add the missing test automation.** Rejected. It means adding `react-dom`,
a DOM environment, a renderer and a browser harness to gain coverage that `partials.ts`
already has with none of them — to serve zero consumers. The cost is real and the benefit
is a layer nobody uses.

**B: Deprecate the subpath, keep the files.** Rejected as the sole mechanism. A deprecated
framework layer with `typeof`-only tests is precisely the artifact that reads as coverage
and delivers none. The revertability it buys is bought more cheaply by an isolated commit.

**C: Rewrite the FE in a lighter framework (Preact, Lit).** Deferred, not rejected. If a
component layer ever needs client-side state that strings cannot carry, this is the
conversation — but it is an architectural decision requiring a brain invariant and a test
strategy declared *first*, which is the whole point of this ADR. Nothing today needs it.

**D: Keep both layers.** Rejected. Two renderers for one component set guarantees they
diverge, and the divergence is invisible until someone reads both — which is exactly how
`AccessDenied` came to ship "This area is for DJs" on the anonymous side.

## Halt criterion

If a sibling repo is found importing `@ocr/ui/react`, **stop**: revert the removal commit,
restore the subpath, and reopen at step 1 with that consumer in the room. Do not shim, do not
re-export from `partials.ts`, and do not ask the consumer to migrate on this ADR's authority —
it was written without them.

## Consequences

- `@ocr/ui` has no `react`, `react-dom` or `@types/react` dependency, and no `jsx` compiler
  option. One fewer supply-chain surface: the workspace's one critical advisory was a vitest
  UI-server issue, and every remaining advisory is dev tooling.
- The design system's live previews became static HTML. They lost interactivity and gained
  the property of being true.
- `MapDetail` and `VoteTap` become static specimens rather than shipped components, which
  matches their real status — both are on the "designed, not built" row of the hybrid brief.
- `scripts/bundle-divergence.mjs` was retired: it compared a React bundle against `src/react`,
  and both sides are gone. Replaced by `scripts/stylesheet-coverage.mjs`, which gates the
  drift that actually matters — `bundle.css` carries 122 classes against `styles.ts`'s 134,
  and the 34 missing are almost all ourWKRP surfaces.
