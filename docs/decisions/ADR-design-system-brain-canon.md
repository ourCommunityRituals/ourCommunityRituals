# ADR — the design system needs a brain contract, and three invariant rows need reconciling

**Status:** proposed — requires a PR to `OCR-docs`, which this repo cannot make
**Date:** 2026-09-19

## Context

`packages/ui/design-system/` specifies tokens, contrast floors and component rules for
a package that serves **both** ourSharedEvents and ourWKRP. Invariant #22
(`cross_repo_import_isolation`, `live`) explicitly permits that — *"Shared OCR packages
(@ocr/flags, @ocr/ui under packages/) are explicitly permitted — they are designed
cross-product packages."* So the design system is hub-tier by sanction, not by accident.

Hub-tier artifacts are supposed to be held against brain canon. This one is not, and
the reason is narrower than "nobody wired it": **there is no design contract in the
brain to hold it against.**

- `brain-parity` runs the brain's own pyramid (`tests/run_all.py --level 2`) against
  `flags-contract.yaml`. It is flags-specific.
- `shared-gate-drift` checks that vendored copies of `security_gate.py` and
  `pragma_audit.py` match the canonicals. It is about Python modules.

Neither is a generic canon-parity hook that a design system could be added to.
`flags-contract.yaml` has no design counterpart.

## Three findings that need a brain PR

### 1. Invariant #14 `design_system_dependencies` is stale in at least two of three rows

```yaml
design_system_dependencies:
  - "ose: ouroboros-ds (Button, Input, Card)"
  - "wkrp: TBD design system (currently HTML placeholders per project_frontend_plan)"
  - "osm: n/a — Postman tooling, no customer UI"
```

- **`osm` — confirmed stale.** The brain records Postman/Newman in four places
  (`CURRENT_STATE_INVENTORY.md:17`, `OPERATING_SYSTEM.md:18`, this invariant, and a T3
  gate path `postman/collections/ose-api.json`). ourSharedMagnets is Bruno-based. Zero
  occurrences of "bruno" anywhere in the brain.
- **`osm` "no customer UI" — also stale.** OSM provides custom site support driven by
  markdown files, which is a customer surface.
- **`ose: ouroboros-ds` — unverified.** That name appears nowhere in this hub repo. The
  hub's shared UI package is `@ocr/ui`. Given the two confirmed-stale rows beside it,
  this row should be treated as suspect rather than authoritative. **Someone who knows
  must answer whether `ouroboros-ds` is live or superseded** — everything downstream
  reads this record, and it is the open item blocking CCR Loop 2.

### 2. `--uec-*-ui` is a third UEC variant the brain does not declare

Invariant #3 (`uec_encoding`, `live`) is mechanically gated: a brain test computes WCAG
contrast for every `scan_hex` against white and asserts the declared grade. It declares
two variants — `display_hex` and `scan_hex`.

The design system introduces a third, `--uec-*-ui`, because seven of the display hues
fell under 3:1 on the dark UI ground (`--uec-sponsor` read 1.44:1). The rule *"hue
carries meaning, never mode-flip"* is right for a printed code and wrong for a chip on
a navy screen.

**This must be proposed as a brain amendment, not shipped hub-local.** Until it is, the
variant is provisional. The amendment should add `ui_hex` per category with a per-theme
value and extend the existing contrast test to assert AA against `--bg` and `--surface`
in both themes — the same shape as the `scan_hex`-on-white check that already exists.

Also to record: **Enter absorbed Check-in.** Arriving and being counted are one event,
and splitting them implied a roster that does not exist. One category, keeping the name
Enter and taking Check-in's teal, with copy stating the anonymity. 11 categories → 10,
which also removes one deuteranopia collision.

### 3. There is no design contract to hold the hub against

Proposed: `ocr-docs-brain/design-contract.yaml`, parallel to `flags-contract.yaml`,
declaring the token roles and their contrast floors, with the brain's pyramid checking
hub state against it the way `brain-parity` already does for flags.

Minimum useful content: the FILL/INK/LINE role families and their thresholds (3:1 for
fills and boundaries, 7:1 for ink on `--bg` and `--surface`), the tap-target floor, the
375×812 floor viewport, and the UEC variant set.

## Consequence of not doing this

The hub currently enforces these floors itself —
`packages/ui/tests/contrast-matrix.test.ts` runs 48 assertions across every ink role ×
ground × theme, and it is in the gate. That is real enforcement, but it is
**hub-local**: the brain does not know the contract exists, so a spoke can diverge from
it without anything going red, which is precisely what invariant parity is for.
