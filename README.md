# ourCommunityRituals

The shared workspace for the OurCommunityRituals (OCR) product line. It holds the packages every product repo reuses: design tokens, shared UI, feature flags, and a data-provider helper.

This repo is not an app. The product repos (OurSharedEvents, ourWKRP, ourAirwaves and the others) are separate git repos that sit beside it on disk and consume these packages.

## Packages

| Package | What it is |
|---|---|
| `packages/tokens` | The single token source for the fleet. Colors come from here and nowhere else. |
| `packages/ui` | Shared stylesheet, HTML partials and the design system. |
| `packages/flags` | Feature-flag runtime binding for the Brain flags contract. |
| `packages/data-provider` | Shared DataProvider types and Cache API utilities for Workers. |
| `packages/runner-fleet` | Self-hosted runner fleet manager (see `docs/OCR_VISION.md` for its status). |

## Getting started

You need Node 20 or newer and pnpm 9.

```bash
pnpm install
pnpm tokens:test
pnpm ui:test
pnpm lint
```

Each package has its own scripts at the root, named `<package>:<task>` (for example `flags:test`, `ui:typecheck`, `tokens:check:generated`). See `package.json`.

## Before you change anything visual

Read `packages/ui/design-system/HANDOFF.md`, then `packages/ui/design-system/README.md`. To change a color, follow `packages/ui/design-system/CHANGING-COLORS.md`. Never hardcode a hex in a page.

## Where things are

- `CLAUDE.md`: how an agent enters this repo.
- `docs/OCR_VISION.md`: what this repo is for, derived from the org-level vision.
- `SKILL.md`: reusable skills for working here.
- `.claude/`: agent definitions and repo skills.
- Org-level vision and standards live in the `OCR-docs` repo.
