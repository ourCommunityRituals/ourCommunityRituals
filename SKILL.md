# SKILL.md: ourCommunityRituals (hub)

Skills for working in the hub repo.

**Status:** DRAFT for human review (governance file; see `OCR-docs/CLAUDE.md`).

---

## Product identity

| Field | Value |
|-------|-------|
| Code | OCR hub |
| Full name | ourCommunityRituals |
| Type | Shared workspace (packages, not an app) |
| Stack | TypeScript, pnpm workspace, vitest, eslint |
| Data model | None. Packages only. |
| Domain | Internal |

---

## Skill: Change a color

### When to Use
User says: "change the color", "new brand color", "update the palette", "fix contrast"

### Steps
1. Read `packages/ui/design-system/HANDOFF.md`, then `packages/ui/design-system/README.md`. The 2026-10-08 decisions at the top win.
2. Follow `packages/ui/design-system/CHANGING-COLORS.md` end to end.
3. Edit `packages/tokens` only. Never edit a color in `packages/ui` and never hardcode a hex in a page.
4. Run `pnpm tokens:check:generated`, `pnpm tokens:check:raw`, `pnpm ui:check:generated` and `pnpm ui:contrast`.
5. Record the change in the handoff.

---

## Skill: Add or change a shared partial

### When to Use
User says: "add a button", "shared component", "new partial", "change the toast"

### Steps
1. Read the design-system README for the component's rules and its mockup in `packages/ui/design-system/canvas/`.
2. Confirm it is reusable across products. App-specific code belongs in its own repo, not under `packages/`.
3. Change `packages/ui`, then run `pnpm ui:test`, `pnpm ui:typecheck` and `pnpm ui:check:generated`.
4. Check the output compiles without the DOM library, because Workers import it.
5. Tell the product repos to bump their hub pin after the PR merges.

---

## Skill: Run a package's checks

### When to Use
User says: "run the checks", "does it pass", "test the flags package"

### Steps
1. Run `pnpm install` once.
2. Run the root scripts named `<package>:<task>`. Examples: `pnpm flags:test`, `pnpm tokens:test`, `pnpm ui:test`.
3. Run `pnpm lint` for the whole workspace.
4. Report failures with the exact test names and error lines.

---

## Skill: Reconcile memory and process (`sync`)

### When to Use
User says: "/sync", "reconcile", "close out the session"

### Steps
1. Load `.claude/skills/sync/SKILL.md` and follow it.
2. Verify first. Treat any ticket, doc or status line as unproven until code or CI shows it.

---

## Skill: Hand work to Claude Code (`work-intake`)

### When to Use
User says: "write a ticket", "intake", "hand this off"

### Steps
1. Load `.claude/skills/work-intake/SKILL.md`.
2. Fill the four fields: Stated Problem, Definition of Done, Verification Steps, Formatting Requirements.

---

## Cross-product references

| Product | Integration point |
|---------|-------------------|
| OurSharedEvents | Consumes `@ocr/ui` and `@ocr/tokens`, pinned to an exact hub commit in `.ocr-hub-ref`. |
| ourWKRP | Standalone repo with its own lockfile and CI; uses a shared package through the normal install path. |
| OCR-docs | Holds the org-level vision and standards that this repo derives from. |
