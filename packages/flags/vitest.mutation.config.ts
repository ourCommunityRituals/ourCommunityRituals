import { defineConfig } from 'vitest/config';

/**
 * The suite Stryker runs (stryker.conf.mjs, stryker.integration.conf.mjs):
 * the gate suite without the tests that read files outside this package
 * (Stryker runs in a sandbox copy of the package, where they are absent):
 * invariants.test.ts reads the OCR-docs brain, and ci-workflow.test.ts and
 * mutation-ci.test.ts read the workspace's CI. None of them covers src/.
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules/**', 'tests/invariants.test.ts', 'tests/ci-workflow.test.ts', 'tests/mutation-ci.test.ts'],
    environment: 'node',
    globals: false,
  },
});
