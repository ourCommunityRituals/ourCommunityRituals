// Small, hand-written inputs shared by the unit tests. No real names, no keys.
export const CARD = `---
role: sre
version: 2
sources:
  - ourSharedEvents:AGENTS.md sha256:98994422013c
  - ourSharedEvents:scripts/ci/classify-ci-failure.mjs sha256:4093fdc53dcc
---

# SRE: role card v2

**Question:** does CI tell the truth?

**Lane:** pipeline health.

## Rules, pre-read

- A green that proves nothing is the worst result.
- A failed run: start with \`classify-ci-failure.mjs\`. It names the root job
  and sets aside cascades.
- Security is never tier-gated [#5 #8].

## Each run

- not a rule

## May and may not

- May: file a Linear story.
- May not: merge, deploy.
`;

export const AGENT = `---
name: team-sre
description: Standing SRE.
tools: Read, Grep, Glob, Bash
model: sonnet
---

Body.
`;

export const INVARIANTS = `schema_version: 1.2.0
invariant_groups:
  - id: privacy_identity
    title: Privacy
invariants:
  # comment
  - id: 5
    name: security_not_tiered
    label: "#5 — x"
    group: security_isolation
    title: "Security is never tier-gated"
    status: live
    enforces: something
      long
  - id: 8
    name: audit
    title: Audit
    status: partial
    group: security_isolation
enrichment_history:
  - id: 99
    title: not an invariant
`;

export const NAMES = `# Names

| Name | Role | Why |
| --- | --- | --- |
| Egg | SRE | watches the road |
| Ana | SRE | x |
| (pending) | research fellow | x |
| Ghost | security junior | x |
`;

export const BRIEF = `intro

| Domain | Lead | Strong | Hold | Everyone else |
| --- | --- | --- | --- | --- |
| CI, pipeline trust | Egg | Ana, research fellow | - | Advise |
| Privacy and data | Egg | - | Egg | Advise |
| Matt's time | home companion | - | - | None |

after the table
`;

export const MEMORY = `# SRE memory

- 2026-11-28: role created.
- Matt decided the cap is 4 (cmsg_01AAAAAAAAAAAAAAAAAAAAAAAAAA).
- Matt chose routines, no id given.
- Persona, after Matt's edit: dry.
- Same as above, Matt: keep it
  short (cmsg_01BBBBBBBBBBBBBBBBBBBBBBBBBB, cmsg_01BBBBBBBBBBBBBBBBBBBBBBBBBB).
`;
