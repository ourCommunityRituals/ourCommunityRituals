# Sponsor Onboarding — Migration + Schema Ticket Plan

Fleet design (workflow `wf_b900b07c-f17`, 20 agents; brainstorm→solution). Turns the 8 sponsor-onboarding data-model changes into an ordered, invariant-anchored ticket set. Confidence: high.

**Security bracket (governing frame):** the set opens on brand-scope/#9 (OSE-722 prerequisite = security entry) and closes on the red-team-hardened promotion path (#13 = security exit). Each ticket's acceptance opens and closes with a security assertion.

## Sequencing rationale

Ordering is a topological sort of hard FK/data dependencies + the monotonicity number line (VERIFIED highest live migration = 0052, so the block is exactly 0053-0060, eight files).\n\nMigrations first (orders 1-8), MAIN DB only, strictly increasing prefixes: 0053 draft table -> 0054 asset draft (FK to 0053) -> 0055 sponsors *_url columns (independent, parallelizable) -> 0056 template_event_types schema (BLOCKING, independent) -> 0057 seed+recompute+clearance-gate (needs 0056) -> 0058 category_registry (needs the recomputed tiers to be meaningful for selectability, so sequenced after 0057) -> 0059 business_type_category_map schema (needs 0056 join + 0058 categories) -> 0060 seed (needs 0059 + the 0057 selectable-tier gate). Each table/index count-gate bump is assigned to the CREATE migration (not deferred to its seed) so any partial deploy is CI-green.\n\nCode after the schema it reads: order 9 draft-capture needs 0053; order 10 R2 upload needs 0054; order 11 pure asset resolver needs 0055; order 12 route needs 11+10; order 13 promotion (the single #25 wall-crossing) needs 0053/0054/0055 + the R2 namespace, and is the sole carrier of the OSE-722 hard merge gate so that external blocker's blast radius is isolated to one ticket. The clearance-gate work is folded into 0057 (migration+code) because the gate is meaningless until the tiers it reads are seeded.\n\nParallelizable lanes for throughput: {0053->0054} and {0055} and {0056->0057->0058->0059->0060} share no data dependency across lanes, but ALL share the migration number line, so whichever branch merges first claims the lower number and the rest MUST re-glob and renumber (AC#1 on every migration) or the monotonicity gate reds CI.

## Invariant compliance summary

#19 migration_monotonicity (VERIFIED live): highest = 0052; the set is append-only 0053-0060, each matching /^\\d{4}_.*\\.sql$/, unique + strictly increasing, no DROP TABLE on a load-bearing name (sponsors ADD COLUMN and event_templates ADD COLUMN are metadata-only; no recreate). Every migration carries an AC#1 re-glob-and-renumber backstop. TWO CI gates the original set MISSED are now covered on every table/index migration (VERIFIED against source): constraints.spec.ts exact counts tables 27->32 (+5) and idx_ 57->64 (+7), plus migration-smoke DB_TABLES and the stale ROLLBACK_PLAN.md header (says 0001-0028, live is 0052 â€” reconciled in the first PR).\n\n#25 sponsor_share_covenant: drafts live in SEPARATE tables never queried by sponsor-resolver.ts (proven by a RUNTIME reachability spec, not a defeatable string grep); no *_draft in LOAD_BEARING_TABLES; the four formats carry NO tier/placement/share/weight/rank column and are dropped at the buildShareRotation projection (frozen by an order-11 spec asserting allocateShares input=={id,tier,is_local}, output=={id,sharePct}). The is_active second door (admin insert at sponsors.ts:355, VERIFIED) is surfaced by an enumerate-all-writers spec rather than a false 'sole writer' claim; promotion server-forces tier to base (no escalation), blocks double-promote (share inflation), and bounds the derived sponsor_event_types to a SUBSET of mapped category templates (no JSON injection of foreign template_ids). The real single-format #25 test is always-200 asset resolution, not trivially-true rotation parity.\n\n#9 tenant_isolation: brand_id is server-set from the invite token at draft capture and re-verified via resolvePerIdSponsorScope at promotion; OSE-722 is a documented HARD merge gate isolated to order 13.\n\n#3 uec_encoding: template_event_types seeded via INSERT...SELECT from the brain-sourced event_type_registry (no hardcoded UEC); max_clearance_tier derived via MAX(); ALLOWED_MAX_TIER and monogram color read from config/palette, never hex/tier literals. CLEARANCE-GATE-INERT (VERIFIED: all 47 types are tier 1) is fixed by a tier-2 fixture test proving the allowlist actually filters. ADR-001: zero FK into FORMS_DB; migrations-forms/ untouched. #18 slug_permanence and #1 named-world unaffected (no attendee coupling introduced).

## Dedup notes

All 8 data-model changes are net-new (grep confirmed zero existing files for every new table + the *_url columns). dedupTarget mapping:\n- Order 12 (T7b /asset/:format route + monogram) -> FOLD INTO OSE-288 (Done â€” the existing /sponsors/:id/logo proxy + lib/sponsor-logo.ts). Frame as 'extend OSE-288 pipeline', not a rebuild; the /logo route stays as a back-compat alias with its existing contract.\n- Orders 1-11 and 13 -> NEW. No existing Linear issue covers draft tables, four-format columns, template_event_types, category_registry, or business_type_category_map.\n- DEPENDENCIES (not dups, do not fold): OSE-722 (per-ID brand scope) is a HARD blocked-by on order 13 only; OSE-133/0024 (registry 47-type seed, Done) feeds order 5; OSE-330 (covenant allocator, Done) is the SOV logic drafts stay invisible to; OSE-288 (logo proxy, Done) is extended by order 12.\n- SUPERSEDED: OSE-335 (is_local at signup toggle, Backlog) is superseded by server-geocoded is_local_derived on sponsor_business_draft (order 1/9) â€” link as 'superseded by', do NOT duplicate its form work.\n- NOT dups (distinct taxonomy, called out so nobody folds them): OSE-282 (partner_sponsors cross-venue), OSE-281/OSE-310 (poster PRINT sizes, not creative aspect formats).\n- EPIC parent: OSE-173 (EPIC-02 Sponsor Wing) or a new Sponsor Onboarding epic; OSE-426 (F3.3 journey) is the adjacent UX parent.

## Tickets

### 1. 0053 CREATE sponsor_business_draft (onboarding intake, resolver-invisible) [#1 + #8]

- **Team / Priority / Type:** OurSharedEvents / High / migration
- **Dedup:** NEW
- **Depends on:** 

## What
Net-new draft table holding a sponsor's onboarding intake BEFORE promotion. Deliberately a **separate table** from `sponsors` so the resolver (`sponsor-resolver.ts:133/146` = `SELECT ... FROM sponsors` only) can never see a draft â€” structural, not status-flag, enforcement of the share-of-voice covenant (#25).

- `brand_id` is `NOT NULL`, **server-set from the signed invite token** (#9), never from the client body.
- `category_selections` JSON also carries bundle-vs-custom intent (#8) â†’ #8 needs no separate migration.
- `is_local_derived` / `is_local_review_flag` are server-geocoded, never a client toggle (supersedes OSE-335).
- `brand_id`/`event_id`/`campaign_id` mirror `campaigns`(0039)+`sponsors`(0040) for 1:1 promotion copy.

DDL-only. Draft-capture handler is order 9; promotion is order 13.

## Ships in the same PR (bolt-on invariant spec)
`tests/e2e/0-architecture/sponsor-resolver-invisibility.invariant.spec.ts` â€” per the RESOLVER-ISOLATION finding this is a **runtime reachability test**, not a string grep: seed a `status='draft'` row, run `resolveSponsorsForEvent` against its event/template, assert ZERO rows. Also assert no VIEW shaped like `sponsors` exists and `sponsors` has no draft/status column the resolver could later filter on. Keep a string-grep of `*_draft` in resolver+allocation as defense-in-depth only.

## CI count-gate updates (VERIFIED against live tests â€” this PR)
- `constraints.spec.ts`: tables `27â†’28`, `idx_` `57â†’60` (adds 3 indexes).
- `migration-smoke*`: `DB_TABLES` +1, 3 indexes into critical-index list.
- Reconcile the **stale** `ROLLBACK_PLAN.md` header (currently `28 migrations: 0001â€“0028`; live highest is 0052) to true highest in THIS first PR of the set, then append reverse-SQL.

**DDL / change:**

```sql
-- Migration 0053: sponsor_business_draft â€” onboarding intake, resolver-invisible (#25), brand-scoped (#9).
-- MUST NOT be in LOAD_BEARING_TABLES; MUST NOT be referenced by sponsor-resolver.ts / sponsor-allocation.ts.
-- No FK into FORMS_DB (ADR-001). category_selections JSON carries bundle-vs-custom intent (#8).
CREATE TABLE IF NOT EXISTS sponsor_business_draft (
  draft_token              TEXT PRIMARY KEY,
  brand_id                 TEXT NOT NULL,              -- #9 server-set from invite token, never client body
  event_id                 TEXT,
  campaign_id              TEXT,                       -- nullable; mirrors sponsors.campaign_id (0040)
  name                     TEXT NOT NULL,
  website_url              TEXT,
  logo_url                 TEXT,                       -- nullable; COALESCE fallback source at promotion
  address_raw              TEXT,
  lat                      REAL,                       -- server-geocoded only (#25 is_local derived)
  lon                      REAL,
  h3_res9                  TEXT,
  h3_res7                  TEXT,
  is_local_derived         INTEGER NOT NULL DEFAULT 0, -- geo-derived, never client toggle (supersedes OSE-335)
  is_local_review_flag     INTEGER NOT NULL DEFAULT 0,
  business_type            TEXT,
  category_selections      TEXT NOT NULL DEFAULT '[]', -- JSON [{category,mode:'whole'|'custom',excluded:[template_id],consent_flags}] (#8)
  covenant_acknowledged_at TEXT,
  promoted_sponsor_id      TEXT,                       -- set at promotion; NULL until promoted (double-promote guard, order 13)
  status                   TEXT NOT NULL DEFAULT 'draft',
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sponsor_business_draft_brand  ON sponsor_business_draft(brand_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_business_draft_event  ON sponsor_business_draft(event_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_business_draft_status ON sponsor_business_draft(status);
```

**Invariant notes:** #19: highest live = 0052 (VERIFIED); 0053 = max+1. Re-glob at authoring. Matches /^\d{4}_.*\.sql$/, unique prefix, strictly increasing. #25: separate table, NOT in LOAD_BEARING_TABLES, never queried by resolver/allocation. #9: brand_id NOT NULL server-set from token only. #3: no hardcoded UEC/tier. ADR-001: zero FK into FORMS_DB.

**Acceptance criteria:**
- AC#1 RENUMBER: re-glob workers/oursharedevents/migrations/ for true highest and set to max+1 (confirmed 0052â†’0053).
- Fresh-DB `wrangler d1 migrations apply` creates the exact columns; monotonicity gate green (regex/unique/increasing/no DROP-TABLE-on-load-bearing).
- sponsor_business_draft NOT added to LOAD_BEARING_TABLES.
- NEW resolver-invisibility spec is a RUNTIME reachability test: seeded status='draft' row returns ZERO rows from resolveSponsorsForEvent; asserts no sponsors-shaped VIEW and no draft/status column on sponsors; string-grep kept only as defense-in-depth.
- category_selections present, default '[]', documented JSON shape (realizes #8 storage).
- CI count gates updated SAME PR (VERIFIED live): constraints.spec.ts tables 27â†’28, idx 57â†’60; migration-smoke DB_TABLES +1 and 3 indexes added.
- Reconcile stale ROLLBACK_PLAN.md header (28â†’ true highest) in THIS PR; add reverse-SQL (DROP TABLE sponsor_business_draft); rollback-forward noted as primary prod posture.
- Body cites ADR-001 (no FORMS_DB FK; migrations-forms/ untouched).

**Risks:** brand_id NOT NULL proves presence not provenance â€” enforcement lives in order-9 handler + order-13 red-team. category_selections is free-JSON (no DB validation) â€” shape enforced in code. Parallel branches may consume 0053 first; renumber AC + gate is the backstop.

### 2. 0054 CREATE sponsor_asset_draft (per-format focal/crop, render-inputs-only) [#2]

- **Team / Priority / Type:** OurSharedEvents / High / migration
- **Dedup:** NEW
- **Depends on:** 0053 CREATE sponsor_business_draft (onboarding intake, resolver-invisible) [#1 + #8]

## What
Net-new per-format creative asset draft. FK `draft_token â†’ sponsor_business_draft` (forces 0054-after-0053). Stores the four aspect-ratio formats with focal point + crop rect; re-keyed to `sponsor_id` at promotion.

The four formats are **RENDER INPUTS, never purchasable slots** â€” the schema deliberately carries **NO** `tier`/`placement`/`share`/`weight`/`rank` column, so `allocateShares` has no dimension to weight by format (#25 hard wall). `UNIQUE(draft_token,format)` makes in-place re-upload an UPSERT via the #6 handler.

Formats are the single frozen constant `['poster','banner','vertical','square']` shared with 0055 `*_url`, the #6 R2 path segment, and the #7 route enum.

## CI count-gate updates (this PR)
- `constraints.spec.ts`: tables `28â†’29`, `idx_` `60â†’61` (1 index).
- `migration-smoke`: DB_TABLES +1, 1 index.

**DDL / change:**

```sql
-- Migration 0054: sponsor_asset_draft â€” per-format focal/crop render inputs (#2).
-- FK draft_token -> sponsor_business_draft (after 0053). NO tier/placement/share/weight column (#25 hard wall).
CREATE TABLE IF NOT EXISTS sponsor_asset_draft (
  id            TEXT PRIMARY KEY,
  draft_token   TEXT NOT NULL,
  format        TEXT NOT NULL CHECK(format IN ('poster','banner','vertical','square')),
  url           TEXT,
  content_type  TEXT,
  focal_x       REAL,
  focal_y       REAL,
  crop_rect     TEXT,                      -- JSON {x,y,w,h}
  validated_at  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (draft_token) REFERENCES sponsor_business_draft(draft_token),
  UNIQUE(draft_token, format)              -- upsert target for #6 re-upload (ON CONFLICT REPLACE)
);
CREATE INDEX IF NOT EXISTS idx_sponsor_asset_draft_token ON sponsor_asset_draft(draft_token);
```

**Invariant notes:** #19: PROVISIONAL number, re-glob, must stay > 0053. #25: no tier/placement/share/weight/rank column â€” asserted by the projection/format-parity spec (order 11). #9: scoped via parent draft. ADR-001: FK stays in MAIN DB.

**Acceptance criteria:**
- AC#1 RENUMBER: re-glob, renumber to max+1, strictly > 0053.
- Applies on fresh DB; CHECK rejects any 5th format; UNIQUE(draft_token,format) enforced; FK resolves to sponsor_business_draft.
- Schema-review AC: file contains NO column named/aliased tier/placement/placement_formats/share/weight/rank (#25 render-inputs wall).
- Four-format constant byte-identical to 0055 *_url set, #6 R2 path segment, #7 route enum (single-source assertion, order 11).
- Resolver-invisibility runtime spec (order 1) extended to cover sponsor_asset_draft.
- CI count gates SAME PR: constraints.spec.ts tables 28â†’29, idx 60â†’61; migration-smoke DB_TABLES +1, index added.
- ROLLBACK_PLAN.md reverse-SQL (DROP TABLE sponsor_asset_draft); ADR-001 cited.

**Risks:** FK requires 0053 applied first â€” parallel branches must not reorder; partial apply (0053 only) leaves orphan-safe empty state. crop_rect/focal unvalidated at DB level; dimension/aspect re-validation is code (order 10).

### 3. 0055 ALTER sponsors ADD 12 nullable four-format asset columns [#3]

- **Team / Priority / Type:** OurSharedEvents / High / migration
- **Dedup:** NEW
- **Depends on:** 

## What
Adds four production asset URL columns + per-format `content_type` and `validated_at` to the live `sponsors` table (**12 nullable, no-default, no-check**) matching ADD-COLUMN exemplars 0036/0040/0041/0045. `logo_url` stays the COALESCE fallback source.

One `sponsors` touch = one file. **NO** table recreate (avoids churning the 0018 recreate + FKs). **NO** index on these columns â€” read by PK lookup in the #7 serve path, never scanned. SQLite ADD COLUMN of nullable TEXT is metadata-only (zero row rewrite). Independent of 0053/0054 â€” parallelizable.

## Load-bearing note (RESOLVER-ISOLATION finding)
These 12 columns are `SELECT *`'d into `SponsorRow` but **dropped at the `buildShareRotation` map** (`resolver:265` projects only `{id, tier, is_local}`) â€” they never reach `allocateShares`. The projection freeze lives in order 11, not here.

## CI count-gate updates (this PR)
- `constraints.spec.ts`: tables unchanged (`29`), `idx_` unchanged (`61`). **`sponsors` column-verify +12** (update the sponsors column list if enumerated).
- `migration-smoke`: sponsors column-verify +12.

**DDL / change:**

```sql
-- Migration 0055: sponsors ADD four-format asset columns (#3). logo_url stays fallback source.
-- 12 nullable, no-default, no-check â€” metadata-only apply, zero backfill. NO recreate, NO index.
ALTER TABLE sponsors ADD COLUMN poster_url            TEXT;
ALTER TABLE sponsors ADD COLUMN poster_content_type   TEXT;
ALTER TABLE sponsors ADD COLUMN poster_validated_at   TEXT;
ALTER TABLE sponsors ADD COLUMN banner_url            TEXT;
ALTER TABLE sponsors ADD COLUMN banner_content_type   TEXT;
ALTER TABLE sponsors ADD COLUMN banner_validated_at   TEXT;
ALTER TABLE sponsors ADD COLUMN vertical_url          TEXT;
ALTER TABLE sponsors ADD COLUMN vertical_content_type TEXT;
ALTER TABLE sponsors ADD COLUMN vertical_validated_at TEXT;
ALTER TABLE sponsors ADD COLUMN square_url            TEXT;
ALTER TABLE sponsors ADD COLUMN square_content_type   TEXT;
ALTER TABLE sponsors ADD COLUMN square_validated_at   TEXT;
```

**Invariant notes:** #19: PROVISIONAL number, re-glob. sponsors is LOAD_BEARING but ADD COLUMN is not DROP TABLE â€” gate untouched; do NOT recreate. #25: render inputs only, no tier/placement/weight; dropped at the resolver projection. #3: no hardcoded hex/UEC. NO-BACKFILL: existing rows stay NULL.

**Acceptance criteria:**
- AC#1 RENUMBER: re-glob, renumber to max+1.
- All 12 columns present and nullable after apply; every pre-existing sponsors row still SELECTs through the resolver query shape (row count unchanged smoke).
- No CREATE INDEX on any *_url column (keeps idx count stable at 61).
- No RENAME/DROP of sponsors (DROP-TABLE-on-load-bearing gate green; recreate dance avoided).
- Four-format set byte-identical to the 0054 CHECK list (single-source assertion, order 11).
- CI SAME PR: sponsors column-verify +12 in constraints.spec.ts and migration-smoke; table/index totals unchanged.
- ROLLBACK_PLAN.md documents SQLite ALTER...DROP COLUMN is unreliable â†’ rollback-forward is primary prod recovery.

**Risks:** SQLite has no reliable DROP COLUMN; true rollback needs recreate dance on a LOAD_BEARING table â€” hence rollback-forward. 12 columns widen the row (negligible).

### 4. 0056 ADD event_templates.max_clearance_tier + CREATE template_event_types (schema only) [#4 schema, BLOCKING]

- **Team / Priority / Type:** OurSharedEvents / Urgent / migration
- **Dedup:** NEW
- **Depends on:** 

## What
The genuinely MISSING/BLOCKING join between `event_templates` (0014) and `event_type_registry` (0023). **Pure DDL**: adds a nullable cached `max_clearance_tier` column to `event_templates` (SQLite-safe ADD COLUMN, no recreate) and creates the join table. NO seed/recompute here (that is 0057).

`max_clearance_tier NULL` = 'no mapped types / not yet computed' and is **DISTINCT from tier 1**; the #5 selectable rule treats NULL-tier templates as NOT selectable â†’ the schema-before-seed window is fail-safe. `UNIQUE(template_id,uec_code)` blocks duplicate mappings. Independent of 0053/0054/0055 â€” parallelizable. Priority Urgent because it is BLOCKING for onboarding steps S4/S4b.

## Count-gate ownership (adversarial MINOR fix)
The count bump lands with the migration that CREATES the object, i.e. HERE (not deferred to the 0057 seed): a DB at 0056-only must still be green.

## CI count-gate updates (this PR)
- `constraints.spec.ts`: tables `29â†’30`, `idx_` `61â†’63` (template_event_types + its 2 indexes). `event_templates` column-verify +1.
- `migration-smoke`: DB_TABLES +1, 2 indexes, event_templates column-verify +1.

**DDL / change:**

```sql
-- Migration 0056: template_event_types join (MISSING/BLOCKING #4) + cached clearance column. SCHEMA ONLY.
-- max_clearance_tier NULL = no mapped types / not yet computed (DISTINCT from tier 1). Recompute lives in 0057.
ALTER TABLE event_templates ADD COLUMN max_clearance_tier INTEGER;  -- nullable cache, SQLite-safe, no recreate

CREATE TABLE IF NOT EXISTS template_event_types (
  template_id TEXT NOT NULL,
  uec_code    TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (template_id) REFERENCES event_templates(id),
  FOREIGN KEY (uec_code)    REFERENCES event_type_registry(uec_code),
  UNIQUE(template_id, uec_code)
);
CREATE INDEX IF NOT EXISTS idx_template_event_types_template ON template_event_types(template_id);
CREATE INDEX IF NOT EXISTS idx_template_event_types_uec      ON template_event_types(uec_code);
```

**Invariant notes:** #19: PROVISIONAL number, re-glob. #3: clearance derives from brain-sourced event_type_registry (0023/OSE-133) â€” this file adds NO tier integers, NO hardcoded UEC; the ADD COLUMN is an empty cache. event_templates NOT in LOAD_BEARING_TABLES â†’ ADD COLUMN gate-safe. ADR-001: FK targets in MAIN DB.

**Acceptance criteria:**
- AC#1 RENUMBER: re-glob, renumber to max+1.
- event_templates.max_clearance_tier exists nullable and is NULL for every row after this migration (no recompute here).
- template_event_types created empty with UNIQUE(template_id,uec_code); FK to event_type_registry(uec_code) resolves (0023/0024 applied).
- File contains ZERO INSERT/UPDATE (DDL-only) â€” transient dead-schema window accepted.
- CI SAME PR (this migration owns the bump, not 0057): constraints.spec.ts tables 29â†’30, idx 61â†’63, event_templates column-verify +1; migration-smoke matching.
- ROLLBACK_PLAN.md reverse-SQL (DROP TABLE template_event_types); column rollback noted rollback-forward.

**Risks:** BLOCKING for S4/S4b â€” nothing downstream validates selectability until 0057 seeds it. Schema-from-seed split leaves max_clearance_tier NULL everywhere; the #5 NULL-not-selectable rule makes that window safe.

### 5. 0057 SEED template_event_types + recompute max_clearance_tier + clearance-tier allowlist gate [#4 seed]

- **Team / Priority / Type:** OurSharedEvents / Urgent / migration+code
- **Dedup:** NEW
- **Depends on:** 0056 ADD event_templates.max_clearance_tier + CREATE template_event_types (schema only) [#4 schema, BLOCKING]

## What
DML companion to 0056. Populates the template Ã— registry-type mapping via `INSERT...SELECT` against `event_type_registry.uec_code` using LIKE-prefix family predicates (VERIFIED viable: 0024 uses category-prefixed codes e.g. `REC-BOCCE-001`) and explicit IN-lists for opaque codes â€” **NOT** a hand-typed pair matrix. Every `uec_code` is sourced FROM the registry at seed time, so a typo matches nothing rather than inserting a dangling FK (#3 hygiene). Then recomputes the cached tier with a single named `UPDATE...SELECT MAX()`, factored as the reusable statement the promotion path (order 13) also invokes.

## CLEARANCE-GATE-INERT fix (adversarial blocker, VERIFIED)
All 47 seeded registry types are `legal_clearance_tier = 1` today (confirmed: 47Ã— tier 1 in 0024). A max-tier gate is therefore **currently inert** â€” it can never exclude a template. This ticket must NOT ship a gate that silently passes everything. Fix: implement the selectability rule as an explicit **tier allowlist** (`max_clearance_tier IS NOT NULL AND max_clearance_tier <= ALLOWED_MAX_TIER`, with `ALLOWED_MAX_TIER` read from config/registry, NOT a hardcoded literal), and add an invariant test that asserts the gate is *wired* (it filters when a >allowed tier is present) using a fixture registry row at tier 2 â€” so the gate is proven live even while production data is uniformly tier 1. Document that when registry Phase 2+ types (tier >1) are seeded, no code change is needed for the gate to bite.

## Seed-harness fragility (adversarial MINOR fix)
Each `INSERT...SELECT` / `UPDATE` MUST be a single standalone statement terminated by one `;` with no compound bodies (the migration-smoke harness runs one `prepare().run()` per statement and only swallows 'duplicate column'/'no such column' â€” matches 0024 seed style and the 0025 trigger lesson).

## BLOCKING sub-task (24-vs-32 gap)
Before authoring, run `SELECT id, category FROM event_templates` on a migrated DB to enumerate the AUTHORITATIVE live template set (0015 seeds 24; design assumes ~32). Seed every enumerated `event_templates.id`, not a hardcoded 32.

## Count gates
Seed-only PR bumps NOTHING in table/index count gates (0056 already did) â€” special-case seeded rows in any row-count smoke.

**DDL / change:**

```sql
-- Migration 0057: SEED template_event_types + recompute event_templates.max_clearance_tier (#4 seed).
-- Data-driven from event_type_registry.uec_code (0024/OSE-133). One standalone statement per ';'. No compound bodies.
INSERT OR IGNORE INTO template_event_types (template_id, uec_code)
  SELECT 'bocce_night', uec_code FROM event_type_registry
  WHERE uec_code LIKE 'REC-BOCCE-%' AND is_active = 1;
INSERT OR IGNORE INTO template_event_types (template_id, uec_code)
  SELECT 'bar_night', uec_code FROM event_type_registry
  WHERE uec_code IN ('...','...');   -- opaque codes: explicit registry-sourced IN-list
-- ... one statement per confirmed template (count = live template count, see BLOCKING sub-task) ...

-- Named reusable recompute (batch/promotion-time only; also invoked by promotion code, order 13):
UPDATE event_templates SET max_clearance_tier = (
  SELECT MAX(r.legal_clearance_tier)
  FROM template_event_types t
  JOIN event_type_registry r ON t.uec_code = r.uec_code
  WHERE t.template_id = event_templates.id
);
-- Selectability gate (code, ships alongside): allowed = max_clearance_tier IS NOT NULL
--   AND max_clearance_tier <= ALLOWED_MAX_TIER (ALLOWED_MAX_TIER from config, NOT hardcoded).
```

**Invariant notes:** #3: every uec_code sourced from registry via INSERT...SELECT; recompute derives tier via MAX(), no human-typed integers; ALLOWED_MAX_TIER from config not literal. #19: PROVISIONAL number > 0056. NO-BACKFILL EXCEPTION: the max_clearance_tier UPDATE is the ONE sanctioned data-mutating statement against event_templates (LOAD_BEARING); a second such UPDATE is rejected in review. Registry expansion past 47 types handled by a NEW corrective-forward migration, never by editing this file.

**Acceptance criteria:**
- AC#1 RENUMBER: re-glob, renumber to max+1 (> 0056).
- BLOCKING: enumerate live event_templates via SELECT id,category before authoring; seed covers every enumerated id (or documents an intentional gap).
- After apply, template_event_types non-empty; every uec_code exists in event_type_registry (no dangling FK); every enumerated template mapped to >=1 type OR documented unmapped.
- event_templates.max_clearance_tier == live MAX(mapped tier) per template â€” NEW invariant spec (stored == live recompute) in THIS PR.
- CLEARANCE GATE PROVEN LIVE: invariant test with a tier-2 fixture registry row shows the selectability allowlist EXCLUDES a >ALLOWED_MAX_TIER template (gate is not inert); production uniform tier-1 data documented; ALLOWED_MAX_TIER read from config, no hardcoded UEC/tier literal.
- Each seed statement is individually executable (no trigger-style compound bodies); migration-smoke applies them cleanly.
- Seed-only PR bumps NO table/index count gate; row-count smoke special-cases seeded rows.
- ROLLBACK_PLAN.md: reverse = DELETE FROM template_event_types + reset max_clearance_tier to NULL. depends-on OSE-133/0024 (DONE) noted.

**Risks:** TEMPLATE-COUNT MISMATCH â€” closed by the BLOCKING enumerate AC. LIKE-prefix predicates can over-match; each reviewed against the actual 0024 code list. The recompute UPDATE touches a LOAD_BEARING table â€” the single sanctioned exception. Clearance gate is inert on today's uniform-tier-1 data â€” the tier-2 fixture test prevents shipping a vacuously-passing gate.

### 6. 0058 CREATE + SEED category_registry (canonical category lookup, precursor to #5) [category-domain gap]

- **Team / Priority / Type:** OurSharedEvents / High / migration
- **Dedup:** NEW
- **Depends on:** 0057 SEED template_event_types + recompute max_clearance_tier + clearance-tier allowlist gate [#4 seed]

## What
Precursor that canonicalizes the free-text `event_templates.category` domain (0014 has no CHECK; examples `bar_events`/`leagues`/`general`). Ships as a **separate soft-reference lookup table**, NOT a CHECK on `event_templates.category` (a CHECK would force the SQLite rename-recreate dance on a seeded LOAD_BEARING-adjacent table + its FKs).

Both `business_type_category_map.category` (#5) and `category_selections` JSON (#1/#8) key off this canonical list, making the '>=1 selectable template' invariant verifiable. Seeds the DISTINCT `category` values already present in `event_templates` (data-driven, not hand-typed). Justified gap-filler (not one of the original 8), scoped tightly to unblock #5.

## Count gates (this PR)
- `constraints.spec.ts`: tables `30â†’31`, `idx_` unchanged (`63`; PK is not an idx_ index).
- `migration-smoke`: DB_TABLES +1.

Seed statement is a single standalone `INSERT...SELECT` (harness-safe).

**DDL / change:**

```sql
-- Migration 0058: category_registry â€” canonical category lookup (precursor to #5). Soft-reference, NOT a CHECK.
CREATE TABLE IF NOT EXISTS category_registry (
  category      TEXT PRIMARY KEY,
  display_name  TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Single standalone statement; seed = DISTINCT event_templates.category present at authoring (data-driven):
INSERT OR IGNORE INTO category_registry (category, display_name)
  SELECT DISTINCT category, category FROM event_templates WHERE category IS NOT NULL;
```

**Invariant notes:** #19: PROVISIONAL number, re-glob. Soft-reference (no CHECK / no FK from event_templates) deliberately avoids the recreate dance. #3: category set data-driven from the existing table, not hardcoded. ADR-001: MAIN DB only.

**Acceptance criteria:**
- AC#1 RENUMBER: re-glob, renumber to max+1.
- category_registry seeded with the exact DISTINCT set of event_templates.category values present at authoring (data-driven INSERT...SELECT, single standalone statement); fresh DB fully seeded by migrations apply alone.
- No CHECK added to event_templates.category and no table recreate (DROP-TABLE gate green).
- CI SAME PR: constraints.spec.ts tables 30â†’31; migration-smoke DB_TABLES +1; seeded rows special-cased.
- ROLLBACK_PLAN.md: reverse = DROP TABLE category_registry.
- Documented as the authoritative category domain that orders 7/8 (#5) and the category_selections JSON shape validate against.

**Risks:** If categories are added to event_templates after this seed, category_registry drifts â€” needs a corrective-forward top-up migration (append-only #19), not an edit; mitigated by seeding both this and #5 from the same DISTINCT source. Soft-reference over CHECK means enforcement is the order-8 seed join + invariant test.

### 7. 0059 CREATE business_type_category_map (schema only) [#5 DDL]

- **Team / Priority / Type:** OurSharedEvents / High / migration
- **Dedup:** NEW
- **Depends on:** 0056 ADD event_templates.max_clearance_tier + CREATE template_event_types (schema only) [#4 schema, BLOCKING]; 0058 CREATE + SEED category_registry (canonical category lookup, precursor to #5) [category-domain gap]

## What
Pure-DDL create of the step-5 smart-default map (`business_type â†’ category`, `is_default`). Schema-first per the granularity rule; the seed is the separate order-8 migration so the '>=1 selectable template' invariant validates against the now-seeded `template_event_types` (0057) and canonical categories (0058). Index on `business_type` for the step-5 lookup. No seed rows here.

## Count gates (this PR)
- `constraints.spec.ts`: tables `31â†’32`, `idx_` `63â†’64` (1 index).
- `migration-smoke`: DB_TABLES +1, 1 index.

This completes the full-set net deltas: tables `27â†’32` (+5), `idx_` `57â†’64` (+7).

**DDL / change:**

```sql
-- Migration 0059: business_type_category_map â€” step-5 smart default (#5 DDL only, seed in 0060).
CREATE TABLE IF NOT EXISTS business_type_category_map (
  id            TEXT PRIMARY KEY,
  business_type TEXT NOT NULL,
  category      TEXT NOT NULL,
  is_default    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(business_type, category)
);
CREATE INDEX IF NOT EXISTS idx_business_type_category_map_bt ON business_type_category_map(business_type);
```

**Invariant notes:** #19: PROVISIONAL number > 0058, re-glob. #3: no hardcoded UEC. Schema-vs-seed split keeps a bare CREATE CI-green with no runtime wiring. ADR-001: MAIN DB only.

**Acceptance criteria:**
- AC#1 RENUMBER: re-glob, renumber to max+1.
- Table applies empty on fresh DB with UNIQUE(business_type,category); zero INSERT statements (seed is order 8).
- CI SAME PR: constraints.spec.ts tables 31â†’32, idx 63â†’64; migration-smoke DB_TABLES +1, index added.
- ROLLBACK_PLAN.md: reverse = DROP TABLE business_type_category_map.
- Depends-on 0056 (template_event_types) and 0058 (category_registry) documented so the seed can validate selectability.

**Risks:** Transient dead-schema window until order-8 seeds it; safe because step-5 code depends on the seed migration. No DB-level FK to category_registry (soft-reference), so a bad category is caught only by the seed join + order-8 invariant test.

### 8. 0060 SEED business_type_category_map + selectable-default invariant [#5 DML]

- **Team / Priority / Type:** OurSharedEvents / High / migration
- **Dedup:** NEW
- **Depends on:** 0059 CREATE business_type_category_map (schema only) [#5 DDL]

## What
DML seed of `business_type â†’ default category` mappings, inside the migration so a fresh DB is fully seeded by migrations apply. Every `is_default` row must resolve to **>=1 SELECTABLE template** â€” selectable per the locked rule = a template in that category with `max_clearance_tier IS NOT NULL AND <= ALLOWED_MAX_TIER` (0057 gate). Ships with the invariant spec proving this for every default. `category` values validated against `category_registry` (0058).

## BLOCKING sub-task
Confirm the authoritative `business_type` set (product decision) before authoring the seed.

## Harness safety
Each INSERT is a single standalone statement; the validation query is in the invariant spec (not the migration body).

## Count gates
Seed-only â€” bumps NO table/index count gate (0059 already did); special-case seeded rows in row-count smoke.

**DDL / change:**

```sql
-- Migration 0060: SEED business_type_category_map (#5 DML). Every is_default resolves to >=1 selectable template.
INSERT OR IGNORE INTO business_type_category_map (id, business_type, category, is_default) VALUES
  ('btc_bar_bar_events',  'bar',        'bar_events', 1);
INSERT OR IGNORE INTO business_type_category_map (id, business_type, category, is_default) VALUES
  ('btc_league_leagues',  'league_org', 'leagues',    1);
  -- ... one standalone statement per confirmed business_type; categories drawn from category_registry ...

-- Invariant spec validation query (MUST return zero rows):
-- SELECT m.business_type, m.category FROM business_type_category_map m
--  WHERE m.is_default = 1 AND NOT EXISTS (
--    SELECT 1 FROM event_templates e
--    WHERE e.category = m.category
--      AND e.max_clearance_tier IS NOT NULL AND e.max_clearance_tier <= :ALLOWED_MAX_TIER);
```

**Invariant notes:** #3: categories from canonical category_registry; tiers derive from registry-computed max_clearance_tier â€” no hardcoded UEC. #19: PROVISIONAL number > 0059. NO-BACKFILL: seed writes only to the new table, never to LOAD_BEARING tables.

**Acceptance criteria:**
- AC#1 RENUMBER: re-glob, renumber to max+1 (> 0059).
- BLOCKING: confirm the authoritative business_type set (product decision) before authoring.
- INVARIANT in THIS PR: every is_default=1 row resolves to >=1 selectable template (category template with max_clearance_tier IS NOT NULL AND <= ALLOWED_MAX_TIER) â€” zero-rows validation passes.
- Every category value in the seed exists in category_registry (0058) â€” referential consistency test.
- Each INSERT is a single standalone statement (harness-safe); fresh-DB migrations apply alone fully seeds; row-count smoke special-cases seeded rows.
- Depends-on 0057 (template_event_types seeded) and 0058/0059 documented.
- ROLLBACK_PLAN.md: reverse = DELETE FROM business_type_category_map.

**Risks:** Ordering trap: the selectable-default invariant is only meaningful AFTER 0057 seeded the join + recomputed tiers â€” applied against an un-seeded join it will (correctly) fail, blocking a partial deploy. If a category is later renamed the default can silently orphan; mitigated by category_registry sharing the same DISTINCT source.

### 9. T6a Draft-capture handler â€” INSERT sponsor_business_draft via invite token [#1 code]

- **Team / Priority / Type:** OurSharedEvents / High / code
- **Dedup:** NEW
- **Depends on:** 0053 CREATE sponsor_business_draft (onboarding intake, resolver-invisible) [#1 + #8]

## What
Server handler creating/updating a `sponsor_business_draft` row from the onboarding form, authorized by the **signed invite token** (NOT admin bearer). `brand_id` set exclusively server-side from token claims (#9), never from the client body. `is_local_derived` computed by server geocoding of `address_raw` (never client lat/lon), superseding the OSE-335 signup-toggle. Persists `category_selections` JSON (bundle-vs-custom, #8), validated against `category_registry` (0058).

Draft-capture INSERT only â€” deliberately does NOT pull `resolvePerIdSponsorScope` forward (that is the promotion boundary, order 13), isolating the OSE-722 hard dependency to a single ticket.

## Geocode fail-safe
On geocode failure, default `is_local_derived=0` + `is_local_review_flag=1` (manual review) rather than trusting client input.

**DDL / change:**

```sql
New handler handleCreateSponsorDraft (workers/oursharedevents/src/handlers/): validate invite token -> derive brand_id from token claims -> server-geocode address_raw to lat/lon/h3/is_local_derived -> INSERT OR REPLACE sponsor_business_draft. Validate category_selections JSON shape [{category,mode:'whole'|'custom',excluded:[template_ids],consent_flags}] against category_registry (0058); malformed JSON fails closed. NEVER read brand_id/is_local/lat/lon from request body.
```

**Invariant notes:** #9: brand_id from token only. #25: writes only to the draft table, never sponsors â€” resolver stays blind. #1: is_local server-geocoded. #3: category_selections categories validated against canonical registry. Does NOT import resolvePerIdSponsorScope (isolates OSE-722 to order 13).

**Acceptance criteria:**
- Draft INSERT succeeds only with a valid invite token; brand_id equals token claim and IGNORES any brand_id in the request body (unit + red-team test).
- is_local_derived computed server-side from geocoded address_raw; client-supplied is_local/lat/lon ignored.
- category_selections fails closed if any category is absent from category_registry, mode not in {whole,custom}, or JSON malformed.
- Handler does NOT write to sponsors and does NOT import resolver/allocation modules (resolver-invisibility runtime spec stays green).
- Geocode failure defaults is_local_derived=0 + is_local_review_flag=1 (manual review), never trusts client.
- SPIKE (non-blocking): confirm geocoding provider + invite-token validation library exist; document choices.
- Depends-on migration 0053 named; CI red if 0053 unapplied.

**Risks:** Geocoding provider not specified in ground â€” fail-safe default rather than trusting client. Invite-token validation library must be confirmed (SPIKE).

### 10. T6 R2 sponsors/ namespace â€” token-auth upload + serve-guard extension [#6 code]

- **Team / Priority / Type:** OurSharedEvents / High / code
- **Dedup:** NEW
- **Depends on:** 0054 CREATE sponsor_asset_draft (per-format focal/crop, render-inputs-only) [#2]

## What
Generalizes the R2 key scheme to `sponsors/{sponsor_id or draft_token}/{format}`, authorized by the invite/draft token rather than admin bearer. Extends the serve-guard at `upload.ts:216` (VERIFIED verbatim: `if (!key || key.includes('..') || !key.startsWith('events/'))`) to also allow `sponsors/`, **preserving the `..` path-traversal check on BOTH prefixes**. Adds a draft/sponsor upload handler that UPSERTs `sponsor_asset_draft` (`ON CONFLICT` via `UNIQUE(draft_token,format)` from 0054).

Keeps the 25MB cap + MIME allowlist; **raster-only crop source** (reject SVG / animated GIF) + server re-validation of dimensions/aspect. `draft_token` before promotion, `sponsor_id` after. Ships behind the optional `UPLOADS_BUCKET` binding (503 when unbound).

**DDL / change:**

```sql
upload.ts: (1) serve guard line 216 -> `if (!key || key.includes('..') || (!key.startsWith('events/') && !key.startsWith('sponsors/')))` (traversal check shared by both branches); (2) new handleSponsorAssetUpload authorized by invite/draft token (not admin), key = `sponsors/${draftToken||sponsorId}/${format}`, format IN frozen ['poster','banner','vertical','square']; (3) reject SVG/animated GIF as crop source, re-validate raster dimensions/aspect; (4) UPSERT sponsor_asset_draft(draft_token,format,url,content_type,focal_x,focal_y,crop_rect) ON CONFLICT(draft_token,format).
```

**Invariant notes:** #9: upload authorized by token scoped to a brand's draft, not admin-global; brand_id derived server-side from token, never body. #25: format is the frozen four-set â€” SAME constant as 0054 CHECK / 0055 *_url / order 12 route. #6: serve guard still blocks path traversal (only events/ and sponsors/ prefixes; '..' rejected). Ships behind optional UPLOADS_BUCKET (503 when unbound).

**Acceptance criteria:**
- GET serve of a sponsors/ key returns bytes; events/ admin path unchanged (regression test); any key with '..' or an unlisted prefix still 400/403 under BOTH branches (guard test â€” mandatory).
- Upload authorized by invite/draft token (not admin bearer); wrong/missing token 401/403.
- RED-TEAM test: a draft_token cannot write under another brand's sponsor_id (cross-tenant write blocked).
- Re-upload of an existing format UPSERTs sponsor_asset_draft (no UNIQUE violation) via ON CONFLICT.
- SVG and animated GIF rejected as crop source; oversized (>25MB) and disallowed MIME rejected; dimensions/aspect re-validated server-side.
- Format value validated against the frozen four-set constant shared with 0054/0055/order 12.
- Handler 503s gracefully when UPLOADS_BUCKET unbound; DevOps note: sponsors/ namespace must be provisioned when the (placeholder) UPLOADS_BUCKET is bound â€” real-R2 integration test is a DevOps follow-up, NOT a merge blocker for guard/handler logic.

**Risks:** No R2 bucket provisioned yet (placeholder IDs) â€” ships behind the optional binding; real R2 behavior untested until DevOps adds sponsors/ namespace. Token-auth is a new authz surface â€” the cross-tenant red-team test is mandatory. Extending the serve guard risks widening traversal if the '..' check is not shared by the sponsors/ branch; guard test mandatory.

### 11. T7a resolveAssetSource() pure library + allocation-projection freeze [#7 core, #25]

- **Team / Priority / Type:** OurSharedEvents / High / code
- **Dedup:** NEW
- **Depends on:** 0055 ALTER sponsors ADD 12 nullable four-format asset columns [#3]

## What
Ships the #7 resolution logic as a **zero-I/O pure function** `resolveAssetSource(sponsor, format)` returning a discriminated union `{kind:'r2'|'proxy'|'monogram'}` BEFORE any route/R2 wiring, so the always-200 guarantee is proven by exhaustive unit tests and holds even behind the 503-when-unbound `UPLOADS_BUCKET` AND even if the brain UEC palette endpoint is absent (monogram is the terminal branch regardless of color source). COALESCE order per format: override(`sponsors.{format}_url` = R2 key) â†’ derived (also an R2 key written by promotion) â†’ `logo_url` proxy â†’ generated UEC monogram.

## Allocation-projection freeze (RESOLVER-ISOLATION major fix)
The ONLY thing preventing format from becoming a share dimension is that `buildShareRotation` drops `*_url` and projects only `{id, tier, is_local}` (`resolver:265`). This ticket **pins that projection** with a spec: assert the `RotationSponsor` input to `allocateShares` contains ONLY `{id, tier, is_local}` (no format/url/slot/weight/rank field) and that `allocateShares`' return type is `{id, sharePct}` with no size/slot/position field. This freezes the render-only guarantee so a future format-weighting change fails CI.

**DDL / change:**

```sql
New lib/sponsor-asset.ts: export type AssetSource = {kind:'r2',key} | {kind:'proxy',url} | {kind:'monogram',uec}; resolveAssetSource(sponsor, format): if sponsor[`${format}_url`] -> r2; else if logo_url -> proxy; else -> monogram. Exhaustive branch tests. format from frozen four-set. Zero I/O â€” no palette read here (color resolved at render time, order 12). NEW spec asserting allocateShares input == {id,tier,is_local} and output == {id,sharePct} only.
```

**Invariant notes:** #7 always-200: monogram is the terminal branch, so the union is total â€” no null return possible, and totality is INDEPENDENT of the palette endpoint (color is an order-12 render concern). #25: allocation-projection freeze spec guarantees no format/url/weight field ever reaches allocateShares. #3: no hex literal enters this pure lib.

**Acceptance criteria:**
- resolveAssetSource exhaustively unit-tested across all four formats Ã— {override set / only logo / nothing} and NEVER returns null/undefined (always-200 proof at the pure-logic layer, independent of R2 binding and palette endpoint).
- format argument validated against the frozen four-set shared with 0054/0055/order 10/12.
- PROJECTION-FREEZE spec: allocateShares input contains ONLY {id, tier, is_local}; return contains ONLY {id, sharePct} â€” no format/url/slot/weight/rank/position field (fails CI if a format dimension is ever added).
- No hex literal and no palette I/O in this module (#3 hygiene; palette read deferred to order 12).
- Depends-on migration 0055 (the *_url columns) named as hard dependency.

**Risks:** Keeping this pure means it can't detect an R2 miss at resolve time (handled at the route layer, order 12). The palette-endpoint unknown is deliberately pushed out so the always-200 invariant is not gated on it. The projection-freeze spec must match the real RotationSponsor/allocateShares type names (resolver:265, allocation:236).

### 12. T7b GET /:id/asset/:format route + UEC monogram + /logo alias (extends OSE-288) [#7 route]

- **Team / Priority / Type:** OurSharedEvents / Medium / code
- **Dedup:** OSE-288
- **Depends on:** T7a resolveAssetSource() pure library + allocation-projection freeze [#7 core, #25]; T6 R2 sponsors/ namespace â€” token-auth upload + serve-guard extension [#6 code]

## What
Thin route wired on top of `resolveAssetSource` (order 11), **EXTENDING the OSE-288 pipeline** (not a rebuild). New `GET /api/v2/sponsors/:id/asset/:format` that ALWAYS returns 200 image bytes: R2 read for r2/derived, `fetchAndProxyLogo` (existing `lib/sponsor-logo.ts`, `router.ts:1063`) for proxy, and a net-new UEC-blue monogram generator for the terminal fallback. Keeps the old `GET /sponsors/:id/logo` route as a back-compat alias with unchanged OSE-288 contract.

## Real #25 asset test (RESOLVER-ISOLATION minor fix)
`filterSponsorsForSurface` is now identity and `buildSponsorBundle` fans the SAME rotation to all four surfaces (`resolver:291-296`), so rotation-frequency parity is TRUE for any sponsor trivially. The parity that actually matters (#25) is that a sponsor **missing 3 of 4 formats is not removed from any surface** â€” proven by `resolveAssetSource` returning a 200 (monogram or real) for all 4 formats of a 1-format sponsor. Make THAT the headline test; assert structural rotation-frequency parity cheaply against `buildShareRotation` as secondary.

**DDL / change:**

```sql
router.ts: add GET /api/v2/sponsors/:id/asset/:format -> load sponsor -> resolveAssetSource -> serve (R2 get | fetchAndProxyLogo | generateUecMonogram). Keep GET /:id/logo as alias delegating to /asset/<default>. New generateUecMonogram(id, uec, palette) using brain-read UEC color; neutral UEC-derived monogram as fallback if palette endpoint absent.
```

**Invariant notes:** #7: route ALWAYS 200 (monogram terminal). #25: headline test = a 1-format sponsor returns 200 for all four surface formats so a missing format never drops it from a surface; rotation-frequency parity asserted structurally against buildShareRotation. #3: monogram color from brain palette, no hex literal. Extends OSE-288 (DONE), does not rebuild lib/sponsor-logo.ts.

**Acceptance criteria:**
- GET /:id/asset/:format returns 200 image bytes for every case incl. sponsor with null logo_url and unbound/empty R2 (monogram) â€” integration test.
- Old GET /:id/logo still works (back-compat alias) with unchanged OSE-288 response contract.
- HEADLINE #25 ASSET TEST: a sponsor with only one of four formats returns a 200 (real or monogram) for ALL four formats so it is never removed from a surface; secondary structural assertion that buildShareRotation frequency is format-independent.
- BLOCKING SPIKE (scoped to monogram COLOR only, not always-200): confirm the brain-read UEC palette endpoint exists; if absent, ship a documented fallback reading color from the existing UEC token source (no hex literal) OR split colored-monogram as a follow-up while a neutral UEC-derived monogram still guarantees 200 today. The always-200 invariant does NOT wait on this spike (order 11 proves totality).
- Depends-on T7a (pure lib) and T6 (R2 namespace) named; framed as extending OSE-288.

**Risks:** Net-new monogram/image generation has no existing utility in src â€” real new code with an image-encoding dependency to choose (SVG vs pre-baked). Palette endpoint unconfirmed but no longer gates the headline invariant. Aliasing /logo must not change its current OSE-288 response contract for existing callers.

### 13. T8 Promotion path draft -> sponsors (brand-scoped, covenant-gated, idempotent) [#8 realized, #9]

- **Team / Priority / Type:** OurSharedEvents / Urgent / code
- **Dedup:** NEW
- **Depends on:** 0053 CREATE sponsor_business_draft (onboarding intake, resolver-invisible) [#1 + #8]; 0054 CREATE sponsor_asset_draft (per-format focal/crop, render-inputs-only) [#2]; 0055 ALTER sponsors ADD 12 nullable four-format asset columns [#3]; T6 R2 sponsors/ namespace â€” token-auth upload + serve-guard extension [#6 code]

## What
Copies `sponsor_business_draft` + `sponsor_asset_draft` into `sponsors` (re-keying asset drafts to `sponsor_id`, writing focal/crop-applied renders to R2 `sponsors/{sponsor_id}/{format}` and storing that R2 key in `sponsors.{format}_url` â€” the 'derived' rung of #7). Recomputes the `sponsor_event_types` `template_id` union from `category_selections` JSON (#8 realized â€” the lossy flat join is DERIVED, not authored). Verifies `draft.brand_id` equals the brand derived from `event_id`/`campaign_id` and reuses `resolvePerIdSponsorScope` (OSE-722). Requires `covenant_acknowledged_at` present. This is an intentional crossing of the #25 resolver-invisibility wall.

## HARD DEPENDENCY
Must NOT merge before **OSE-722** â€” this is the single ticket carrying that external gate, keeping its blast radius isolated.

## is_active second-door fix (RESOLVER-ISOLATION blocker, VERIFIED)
The 'sole is_active=1 writer' claim is FALSE: `handlers/sponsors.ts:355` already inserts live sponsors with `is_active`. Since `is_active=1` is the ONLY resolver visibility gate (`WHERE is_active=1`, resolver:133/1001), draft invisibility is only half the wall. Reword the AC to a truthful invariant: a spec enumerates EVERY code path writing `sponsors.is_active` (currently the admin insert + this promotion) and asserts each is covenant/brand-gated OR is an explicitly documented admin-auth exception. Do not narrow to 'onboarded sponsors' and pass vacuously.

## Tier-escalation fix (RESOLVER-ISOLATION major)
The draft has NO tier column, so promotion must invent one. Server-force `sponsors.tier` to the covenant base default at promotion; NEVER read tier from draft/client. Red-team: `sovTierOf(promoted.tier) == base` unless an authorized (out-of-scope) pricing path set otherwise.

## Double-promote fix (RESOLVER-ISOLATION major)
Promotion must be transactional, set `sponsor_business_draft.promoted_sponsor_id` + flip `status='promoted'`, and refuse if already promoted â€” else a second run mints a second live sponsors row (share inflation). Red-team: calling twice yields exactly ONE sponsors row and unchanged total sharePct.

## JSON-injection fix (RESOLVER-ISOLATION major)
Re-validate `category_selections` against `category_registry` + `template_event_types` AT PROMOTION (not just at draft capture); assert the derived `sponsor_event_types` is a SUBSET of templates actually mapped to the draft's chosen categories. Red-team: a draft JSON naming an unmapped/foreign template_id promotes to ZERO extra rows. Malformed JSON fails closed with NO partial write.

**DDL / change:**

```sql
New promoteSponsorDraft(draftToken) in lib/sponsor-promotion.ts (transactional): refuse if draft.status='promoted'/promoted_sponsor_id set; assert covenant_acknowledged_at != null; derive brand from event_id/campaign_id and assert == draft.brand_id via resolvePerIdSponsorScope (OSE-722); INSERT sponsors(...) with tier = COVENANT_BASE_TIER (server-forced, never from draft/client); for each sponsor_asset_draft render focal/crop -> put R2 sponsors/{sponsorId}/{format} -> set sponsors.{format}_url (+content_type/validated_at); re-validate category_selections vs category_registry+template_event_types, derive sponsor_event_types union as SUBSET of mapped category templates (whole=all mapped category templates minus excluded; custom=listedâˆ©mapped), fail closed on malformed; invoke the named 0057 max_clearance_tier recompute; set promoted_sponsor_id + status='promoted' + is_active=1 LAST.
```

**Invariant notes:** #9: draft.brand_id verified == event/campaign-derived brand via resolvePerIdSponsorScope (OSE-722) BEFORE any sponsors write. #25: promotion is the ONE moment a row becomes resolver-visible; every is_active=1 writer must be covenant/brand-gated or a documented admin exception (admin insert at sponsors.ts:355 enumerated); tier server-forced to base (no format/pricing escalation); double-promote blocked. #8: sponsor_event_types DERIVED as a SUBSET of mapped category templates, re-validated at promotion; malformed JSON fails closed. #3: tier recompute reuses the 0057 named statement, no hardcoded UEC. #1 named-world: no attendee coupling.

**Acceptance criteria:**
- RED-TEAM SPEC in THIS PR: a draft_token CANNOT mint a live sponsor without (a) brand-scope match via resolvePerIdSponsorScope AND (b) covenant_acknowledged_at present â€” both proven to block.
- is_active INVARIANT (not 'sole writer'): spec enumerates every code path writing sponsors.is_active (admin insert sponsors.ts:355 + this promotion) and asserts each is covenant/brand-gated OR a documented admin-auth exception; no vacuous narrowing.
- TIER: promoted sponsors.tier is server-forced to COVENANT_BASE_TIER; never read from draft/client; red-team sovTierOf(promoted.tier)==base.
- DOUBLE-PROMOTE: promotion transactional, sets promoted_sponsor_id+status='promoted', refuses if already promoted; red-team calling twice yields exactly ONE sponsors row and unchanged total sharePct.
- JSON SUBSET: sponsor_event_types union re-validated at promotion is a SUBSET of templates mapped (template_event_types) to the draft's chosen categories; red-team a foreign/unmapped template_id yields ZERO extra rows; malformed JSON fails closed with NO partial write; derivation idempotent.
- Promotion writes derived renders to R2 sponsors/{sponsor_id}/{format} and stores the R2 key in sponsors.{format}_url; post-promotion smoke: promoted sponsor now VISIBLE to sponsor-resolver.ts (crosses #25 wall exactly once).
- HARD DEPENDENCY documented in Linear: blocked-by OSE-722; must NOT merge before it. Depends-on 0053/0054/0055 + T6; reuses the 0057 named recompute (no per-render recompute).

**Risks:** OSE-722 (release-blocking, Backlog) is a HARD merge gate isolated to THIS ticket. If T8 lands first it reuses the unscoped predicate and breaks #9. The admin is_active insert (sponsors.ts:355) is a pre-existing second door â€” the enumerate-all-writers spec surfaces it for reviewers; if it must stay, it is an explicit documented exception. R2 render step depends on UPLOADS_BUCKET provisioning (placeholder) and shares image tooling with order-12 monogram â€” coordinate. Deriving sponsor_event_types must be idempotent, fail-closed, and subset-bounded.
