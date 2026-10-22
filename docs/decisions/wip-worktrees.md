# Where WIP git worktrees live

**Date:** 2026-10-22
**Status:** Decided by the owner. Convention only; the config changes that back it are in the same pull request.
**Scope:** the hub and every spoke repo (ourSharedEvents, OCR-docs, ourWKRP, and the others).

---

## The rule

1. **Default:** `<app>/.claude/worktrees/<short-name>`. Claude Code's CLI, subagents and the desktop app already create worktrees there, and Claude Code only sweeps old, empty worktrees it created in that place. Keep names to 12 characters or fewer; Windows long paths are off on the owner's machine.
2. **Exception:** a worktree that will hold long-lived work you have not committed goes outside the repo, at `ourCommunityRituals.worktrees\<app>\<short-name>`.
3. **Commit work in progress to its branch every day.** A branch survives a worktree being removed; an uncommitted file does not.
4. **Never run `git clean -ff`** (double force) in a repo that has worktrees under `.claude/worktrees/`. It deletes them and their uncommitted files. Single `git clean -fd` and `-fdx` skip nested worktrees.
5. **Remove a worktree after its pull request merges.** A merged branch's commits are on `main`.
6. Make a new worktree with `git worktree add`, then run the repo's own link script (`npm run worktree:link-deps` in ourSharedEvents) rather than a bare `npm ci`.

## Why

Evidence from the 2026-10-22 review (CCR worksheet `CCR-WIP-WORKTREE-LAYOUT-2026-10-22` in ourSharedEvents `.claude/outputs/`):

- Clutter came from worktrees never being removed after merge (median 18 days past the last commit), not from where they sat.
- Nested worktrees are visible to any tool that walks a repo from its root. This change stops the hub's lint and its design-check script from reading them.
- `git clean -ffdx` was shown, in a throwaway repo, to delete nested worktrees and lose their uncommitted files. Every other common git command left them alone.

## What this change does

- `.gitignore`: ignores `.claude/worktrees/`.
- `eslint.config.js`: ignores `**/.claude/worktrees/**`.
- `packages/ui/scripts/check-spoke-styles.mjs`: skips `.claude` when it walks a spoke.

## Not covered here

- Enabling Windows long paths, installing the policy-gate hook, and the desktop app's worktree location are the owner's own steps.
- The `guard-no-gas` gate in ourSharedEvents and the OCR-docs gate walkers have the same exposure and are handled in their own repos after Oct 24.
