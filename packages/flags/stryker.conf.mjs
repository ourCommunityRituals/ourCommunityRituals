// @ts-check
//
// Mutation testing, unit layer, for @ocr/flags: the evaluator (event, then
// global, then default ON; fail open on a storage error) and the in-memory
// adapter, judged by tests that need no database.
//
// The integration layer is stryker.integration.conf.mjs: the SQLite, Postgres
// and D1 adapters judged by the shared adapter spec on a real engine.
// Floors: mutation-floors.json in this package. Doc: docs/testing/mutation-testing.md.
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: 'pnpm',
  testRunner: 'vitest',
  plugins: ['@stryker-mutator/vitest-runner'],
  vitest: { configFile: 'vitest.mutation.config.ts' },
  mutate: ['src/evaluator.ts', 'src/adapters/memory.ts'],
  coverageAnalysis: 'perTest',
  reporters: ['clear-text', 'progress', 'json'],
  clearTextReporter: { reportMutants: false },
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  thresholds: { high: 95, low: 80, break: null },
  tempDirName: '.stryker-tmp',
};
