// ─────────────────────────────────────────────────────────────────────────────
// L1 Lint — the base static-quality tier of the workspace pyramid.
//
// This tier is listed in docs/cost-sustainability/BACKLOG.md but did not exist:
// no configuration in any form, and no workflow invoked lint. `eslint` was not
// even a declared dependency, so the two packages shipping a `lint` script were
// resolving whatever `npx` fetched — a non-deterministic version, against no
// rules. It was never red and never green; it was absent, which is invisible
// from every tier above it.
//
// Deliberately STRICT (type-aware `strictTypeChecked`). A permissive config
// adopted to turn the tier green would make the absence permanent and invisible,
// which is worse than the honest gap and is forbidden by this workspace's own
// standard: cost efficiency never buys a quality shortcut, no gate weakened.
// ─────────────────────────────────────────────────────────────────────────────
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    // Machine-written output, verified by the L2 drift gate (`check:generated`),
    // not by hand-editing. Linting it would police the generator's formatting
    // rather than anyone's code. Build output and deps are not source.
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'packages/flags/src/generated/**',
      'OCR-docs/**',
      // The design system's two GENERATED artifacts only. `tokens.css` is emitted by
      // compile-tokens.mjs (drift-gated by `pnpm ui:check:generated`), and bundle.js is
      // an opaque prebuilt artifact this repo has no build script for — see that folder's
      // CONSUMING.md. The generator itself is NOT ignored: it falls through to the
      // `**/*.mjs` rule below like packages/tokens/scripts/build.mjs and
      // packages/flags/scripts/generate-from-yaml.mjs, and is linted the same way.
      'packages/ui/design-system/tokens.css',
      'packages/ui/design-system/components/bundle.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.node },
    },
  },
  {
    // Build/codegen scripts are plain ESM Node, outside any tsconfig project, so
    // type-aware rules cannot resolve them. They still get the untyped ruleset.
    files: ['**/*.mjs', '**/*.js'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // ── Named residual, not a bypass ────────────────────────────────────────
    // These TS files belong to no tsconfig project, so type-AWARE rules cannot
    // run on them at all — the parser has no type information to consult. They
    // still get the complete non-type-aware strict ruleset; only the ~20% of
    // rules requiring type information are unavailable.
    //
    // The real defect is upstream and is NOT lint's to fix: the workspace has no
    // root tsconfig, `packages/data-provider` has no tsconfig at all, and CI's
    // "Quality — TypeScript" step runs `tsc` in `packages/flags` only against an
    // include of `src/**/*` that excludes `tests` and `scripts`. So one of four
    // packages' source is typechecked, and no test or script is.
    //
    // Closing that gap (a root project + per-package tsconfigs covering tests)
    // promotes every file below into full type-aware linting and into `tsc`
    // coverage at the same time. Until then this list is the honest statement of
    // what is not type-checked — it must only ever SHRINK.
    files: [
      '**/tests/**/*.ts',
      '**/e2e/**/*.ts',
      '**/scripts/**/*.ts',
      '**/*.config.ts',
      'packages/data-provider/src/**/*.ts',
      // Types-as-documentation for the design system; outside any tsconfig project.
      // Named here rather than hidden in a directory-wide ignore, per this list's own rule.
      'packages/ui/design-system/components/index.d.ts',
    ],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // ── Async port conformance ──────────────────────────────────────────────
    // The FlagAdapter port is async by contract because D1 and Postgres are
    // genuinely async. The memory and sqlite backends are synchronous but must
    // still satisfy that signature, so `async` with no `await` is interface
    // conformance, not an oversight. Rewriting each as `Promise.resolve(...)`
    // would add noise without adding a single guarantee.
    // Scoped to adapter implementations only — `require-await` stays on
    // everywhere else, where an async function with no await IS a smell.
    files: ['packages/flags/src/adapters/**/*.ts'],
    rules: { '@typescript-eslint/require-await': 'off' },
  },
  {
    // ── Test-file idioms ────────────────────────────────────────────────────
    // Two rules earn their keep in shipped source and cost more than they give
    // in specs. Everything else in strictTypeChecked stays on for tests.
    //
    // no-non-null-assertion: in a test, `x!` after an arrange step encodes an
    //   assumption. If it is wrong the test fails loudly at that line — which is
    //   the outcome the rule exists to force in production code, and is already
    //   guaranteed here. `noUncheckedIndexedAccess` makes fixture indexing
    //   produce `T | undefined` constantly, so the alternative is a guard on
    //   every fixture read that can never fire.
    // no-unnecessary-condition: specs legitimately assert defensively against
    //   DOM/render output whose declared type is narrower than what the runtime
    //   can hand back.
    files: ['**/tests/**/*.{ts,tsx}', '**/e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
);
