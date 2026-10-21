# OCR_VISION: ourCommunityRituals (the hub)

## Product-specific vision, derived from the org-level document

> The org-level source of truth is `OCR-docs/docs/OCR_VISION.md`. This file derives from it and does not restate it. Where the two disagree, the org-level document wins.

**Status:** DRAFT for human review (governance file; see `OCR-docs/CLAUDE.md`).

---

## 1. What the hub is

The hub is the shared workspace for the OCR product line. It holds the reusable packages the product repos consume, and the org-level agent definitions used to audit them. It is not a product. It has no users of its own.

The product repos (OSE, ourWKRP, ourAirwaves, and the others) are independent git repos that sit beside the hub on disk. They are not members of this workspace and keep their own lockfiles and CI. A product repo consumes a hub package through the normal install path, pinned to an exact hub commit.

## 2. Why it exists

The north star in the org vision is the person at the bus stop at 7am. Every surface that person sees has to look and behave the same way across products. The hub is where that sameness is kept in one place:

- One color source, so a brand change is a data change and never a page edit.
- One set of shared partials, so a product does not rebuild a button, a toast or a nav.
- One contract for feature flags, so a flag means the same thing in every repo.

## 3. What lives here

Only reusable, Brain-contract-bound packages live under `packages/`. App-specific code does not.

| Package | Role |
|---|---|
| `@ocr/tokens` | The single token source: three tiers, two axes (brand paints, surface scales), emitted as CSS and JSON. |
| `@ocr/ui` | Shared stylesheet and HTML partials, plus the design system (`packages/ui/design-system/`). |
| `@ocr/flags` | Feature-flag runtime binding for the Brain flags contract. |
| `@ocr/data-provider` | Shared DataProvider types and Cache API utilities for Workers. |
| `@ocr/runner-fleet` | Manager for the self-hosted runner fleet. Owner decision 2026-10-11: OCR workflows run on GitHub-hosted runners, so this package is not the path forward. A reviewer should confirm its future. |

## 4. Rules the hub holds

These come from the org-level invariants and from `CLAUDE.md`. The code and its tests are the system of record.

1. **Colors come from `packages/tokens` only.** No raw hex in a page. No color changes in `packages/ui`. To change a color, follow `packages/ui/design-system/CHANGING-COLORS.md`.
2. **Only reusable, Brain-contract-bound packages live under `packages/`.** App-specific code stays in its product repo (`pnpm-workspace.yaml`).
3. **Product repos pin the hub.** OurSharedEvents pins an exact hub commit in `.ocr-hub-ref`, and a bump is a reviewed change in that repo.

## 5. What is next

The design-system handoff (`packages/ui/design-system/HANDOFF.md`) records where the color work stands and what comes next. This file does not duplicate it.
