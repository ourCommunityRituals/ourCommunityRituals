// @ts-check
//
// Mutation testing, unit layer, for @ocr/team: the graph builder and its
// queries, the per-role tool rules, the eval scorer and score history, the
// locked log append, the run guard, the trust ladder and the cost roll-up.
// The CLI (src/cli.mjs) only wires files to these functions and is left out.
// Floors: mutation-floors.json in this package. Doc: docs/testing/mutation-testing.md.
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: 'pnpm',
  testRunner: 'vitest',
  plugins: ['@stryker-mutator/vitest-runner'],
  vitest: { configFile: 'vitest.mutation.config.ts' },
  mutate: ['src/sources.mjs', 'src/graph.mjs', 'src/tools.mjs', 'src/evals.mjs', 'src/log.mjs', 'src/guard.mjs', 'src/trust.mjs', 'src/cost.mjs', 'src/events.mjs', 'src/dashboard.mjs'],
  coverageAnalysis: 'perTest',
  reporters: ['clear-text', 'progress', 'json'],
  clearTextReporter: { reportMutants: false },
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  thresholds: { high: 95, low: 80, break: null },
  tempDirName: '.stryker-tmp',
};
