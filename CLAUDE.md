# ourCommunityRituals

## Design system

- Colors come from `packages/tokens` only. Never hardcode a hex in a page, and never change colors in `packages/ui`. To change a color, follow `packages/ui/design-system/CHANGING-COLORS.md`.
- Before any UI or design work, read `packages/ui/design-system/HANDOFF.md` (where things stand and what is next), then `packages/ui/design-system/README.md` (the rules; the 2026-10-08 decisions at the top win).
- Mockups for every screen are in `packages/ui/design-system/canvas/`.

## Environment: staging, not the owner's computer

A standing order from the owner (2026-11-14) for every session.

- **Staging is the environment of record.** Work is run and checked against staging (`stg.oursharedevents.com`, `stg.ourwkrp.com`). A result counts when it is seen on staging, or in the CI that deploys to it.
- **Never the owner's own computer.** Do not ask the owner to run, build, seed or check anything on their machine, and do not plan work that depends on it. A throwaway worker inside a CI job or a session's own container is a test rig: it can support a result, and it does not stand in for staging.
- **One exception: a private showcase instance.** Its data file and built pages stay private. They are never committed, loaded into staging or published until the owner says the people named in them have agreed.
- **This grants nothing else.** Staging changes only through CI after a merge to `main`. Who merges, who deploys and who holds credentials are unchanged, and production is not staging.

## Thread limits: budget, three tries, one owner per PR

A standing order from the owner (2026-11-27) for every session.

- **Budget.** At the start, write a rough budget on the checklist (for example 1 hour, or 3 CI runs). At twice the budget, stop and report what is done and what is left. Go on only when the owner says so.
- **Three tries, then stop.** After 3 failed tries at the same thing (the same failing test, check, command or fix), stop and report what was tried, the exact error, and the next idea. No fourth try without the owner's word.
- **One owner per PR.** Only the session that opened a PR pushes to it. Any other session sends its finding to that session or to the owner, and does not push. The owner can hand a PR to a new session in words.
