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
