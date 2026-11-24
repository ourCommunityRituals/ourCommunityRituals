// @ts-check
// Mutation testing (unit layer) for @ocr/tokens. See docs/testing/mutation-testing.md.
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: 'pnpm',
  testRunner: 'vitest',
  plugins: ['@stryker-mutator/vitest-runner'],
  mutate: ['src/contrast.ts', 'src/surface.ts', 'src/semantic.ts', 'src/emit.ts'],
  coverageAnalysis: 'perTest',
  reporters: ['clear-text', 'progress', 'json'],
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  thresholds: { high: 95, low: 80, break: null },
  tempDirName: '.stryker-tmp',
};
