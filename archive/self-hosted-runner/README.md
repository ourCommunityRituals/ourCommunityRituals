# Archived: the self-hosted runner tooling

**Status:** retired from use, kept on purpose. Archived 2026-10-26 at the owner's request ("keep it for posterity, it can become handy as the actual runner").

## Why it is here and not deleted
OCR workflows run on GitHub-hosted runners (owner decision 2026-10-11, OSE-1194; see `docs/OCR_VISION.md`).
Nothing in the fleet targets a self-hosted runner today: every `runs-on` is `ubuntu-latest` or `ubuntu-24.04`.
The tooling can become useful again, so it is archived, not removed.

## What is in this folder
| Item | What it is |
| --- | --- |
| `runner-fleet/` | The `@ocr/runner-fleet` manager (CLI, watchdog, dashboard, tests). It is **no longer a workspace package**, because it sits outside `packages/*`. |
| `_provision-runner-4.ps1.archived` | Provisions and registers a Windows runner (BLOODRAVEN-4). |
| `_reregister-runner-3.ps1.archived` | Re-registers BLOODRAVEN-3 after GitHub drops an inactive registration. |

All four PowerShell scripts end in `.archived` on purpose (the two above, plus `runner-fleet/tools/runner/provision-runner.ps1.archived` and `verify-runner-env.ps1.archived`), so nobody can run them by name by accident.
They contain machine paths (`C:\Users\mzdan\dev\ourCommunityRituals\actions-runner-N`) and need a fresh registration token pasted in.

## Why nothing here can be called by accident now
- The eight `runner-fleet:*` scripts (including `register` and `bounce`) are gone from the root `package.json`.
- The package is outside the `packages/*` workspace glob, so `pnpm --filter @ocr/runner-fleet` finds nothing.
- The CI step that tested it is removed.
- `.github/workflows/security-bracket.yml` still accepts a `runs-on` input (default `ubuntu-latest`). A caller would have to pass `self-hosted` deliberately.

## To bring it back
1. `git mv archive/self-hosted-runner/runner-fleet packages/runner-fleet`, then restore the `runner-fleet:*` scripts in the root `package.json` and the test step in `.github/workflows/ci.yml` (see the commit that archived it for the exact lines).
2. Rename the four `.ps1.archived` scripts back to `.ps1`, and update the machine paths in them.
3. Run `pnpm install` to restore the workspace importer in the lockfile.
4. Register a runner from the target repository's Settings, Actions, Runners page.
5. Pass `runs-on: self-hosted` explicitly to the workflows that should use it.

Local, ignored files (`fleet.config.json`, `dist`, `node_modules`) were moved with the folder and are not in git.
