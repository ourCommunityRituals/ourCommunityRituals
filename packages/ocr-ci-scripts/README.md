# @ocr/ci-scripts

Centralized CI scripts for the OCR brain-contract-check workflow. Previously
copied byte-identically into every app repo's `.github/scripts/` directory;
now lives here so fixes ship in one place.

## Scripts

### `check_brain_contract.py`

Compares a product repo's actual state against what the `OCR-docs` brain
declares and writes a JSON conformance report.

```
python3 check_brain_contract.py \
  --brain <path-to-ocr-docs-brain> \
  --repo <path-to-product-repo> \
  --product-id <ose|osm|oaw|wkrp|osg|osr|osp> \
  --report-path conformance-report.json
```

Exit codes:
- `0` — conformant
- `1` — drift detected (details in `--report-path`)
- `2` — execution error (brain unreachable, product repo malformed, unknown `product-id`)

Depends on `pyyaml` only (install via `pip install pyyaml packaging`).

### `open_drift_ticket.py`

Called by CI when `check_brain_contract.py` exits 1. Opens/updates a Linear
issue with the drift report, routed to the right team by `product_id` and
failure type.

```
python3 open_drift_ticket.py \
  --report conformance-report.json \
  --repo "$GITHUB_REPOSITORY" \
  --pr-number "$PR_NUMBER" \
  --pr-url "$PR_URL" \
  --pr-author "$PR_AUTHOR" \
  --commit "$COMMIT_SHA"
```

Env:
- `LINEAR_API_KEY` — required. The value is `.strip()`'d to tolerate trailing
  whitespace / newlines that sneak in when a secret is re-pasted into GitHub's
  secret store. If unset, the script exits 0 with a skip message (dev-friendly).
- `GITHUB_OUTPUT` — optional. If set, the created/updated ticket URL is written
  as `ticket_url=<url>` so later steps can reference it.

Preflight: before attempting any mutation, a `viewer { id }` query runs. If the
key is rejected (401) or returns no viewer, the script emits a GitHub
`::error::` annotation with the rotation steps and exits 1 — cheaper and
clearer than letting the first `get_team_id` call fail mid-flight.

Idempotency: one ticket per `(product_id, pr_number, commit[:8])` triple.
Re-running on the same commit updates the existing ticket rather than creating
a duplicate.

## Consuming this package from an app repo

The consumer pattern is **workspace-root checkout** (matches the existing
`OCR-docs` brain checkout already in `brain-contract-check.yml`). No submodules,
no published actions, nothing to version separately.

Required secret on the consuming repo: `OCR_PROPAGATE_TOKEN` (already used by
every OCR app repo for the brain checkout — no new secret).

```yaml
steps:
  - name: Checkout <app>
    uses: actions/checkout@v4
    with:
      path: <app>

  - name: Checkout OCR-docs brain (read-only)
    uses: actions/checkout@v4
    with:
      repository: ourCommunityRituals/OCR-docs
      path: ocr-docs
      ref: main
      token: ${{ secrets.OCR_PROPAGATE_TOKEN }}

  - name: Checkout OCR workspace root (for CI scripts)
    uses: actions/checkout@v4
    with:
      repository: ourCommunityRituals/ourCommunityRituals
      path: ocr-workspace
      ref: main
      token: ${{ secrets.OCR_PROPAGATE_TOKEN }}

  - name: Run brain contract check
    run: |
      python3 ocr-workspace/packages/ocr-ci-scripts/check_brain_contract.py \
        --brain ocr-docs/ocr-docs-brain \
        --repo <app> \
        --product-id <app> \
        --report-path conformance-report.json

  - name: Open Linear ticket on drift
    if: failure() && github.event_name == 'pull_request'
    env:
      LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}
      ...
    run: |
      python3 ocr-workspace/packages/ocr-ci-scripts/open_drift_ticket.py \
        --report conformance-report.json \
        ...
```

See any of `ourAirwaves`, `ourSharedEvents`, `ourSharedMagnets`, `ourWKRP`
for the current canonical workflow shape.

## Migration history

- **2026-04-19** — Extracted from the 4 app repos that had diverged only by
  app name in their workflow. Previously all 4 carried byte-identical copies
  (`md5: cc6e75eca178eb95716e207840328ba9` for `open_drift_ticket.py`).
- Same commit hardened `open_drift_ticket.py`:
  - `api_key.strip()` defends against re-pasted secrets with trailing
    whitespace (the 401 failure mode that triggered this centralization).
  - `verify_auth()` preflight fails fast with a rotation-instruction
    `::error::` annotation instead of letting auth failure surface as an
    opaque `get_team_id` crash.

## Phase 3 note for anyone adding brain-contract-check to OSG, OSP, OSR

Do **not** copy the scripts into the new repos' `.github/scripts/`. Use the
workspace-root checkout pattern above from day one. Phase 3's job is to add
the workflow file — the scripts are already centralized here.

## Design decisions

Three options were considered for the access pattern:

1. **Workspace-root checkout** (chosen) — each consumer adds one checkout
   step pointing at `ourCommunityRituals/ourCommunityRituals`. Matches the
   existing OCR-docs brain checkout pattern. No new secrets, no new registry
   entries, minimal moving parts.
2. **Git submodule** — would pin the scripts to a specific commit per
   consumer, but adds the usual submodule friction (detached HEADs,
   `--recurse-submodules` on every clone, stale pins that need bumping).
   Rejected: the scripts are small and the workspace root is already a
   monorepo — centralized versioning there is simpler.
3. **Composite GitHub Action** at `ourCommunityRituals/ocr-ci-scripts` —
   elegant for reuse but requires a separate repo, versioned tags, and a
   marketplace-style contract for inputs/outputs. Rejected for v1 as
   overkill; revisit if the scripts grow a proper CLI / plugin system.
