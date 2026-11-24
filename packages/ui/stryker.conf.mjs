// @ts-check
//
// Mutation testing (unit layer) for @ocr/ui. Its end-to-end layer is judged in
// the spokes. See docs/testing/mutation-testing.md. tailwind.ts is left out
// until it has a test (a floor of 0 cannot fail).
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: 'pnpm',
  testRunner: 'vitest',
  plugins: ['@stryker-mutator/vitest-runner'],
  mutate: ['src/brand.ts', 'src/contrast.ts', 'src/css.ts', 'src/esc.ts', 'src/partials.ts', 'src/styles.ts', 'src/toast.ts', 'src/tokens.ts', 'src/contract.ts'],
  coverageAnalysis: 'perTest',
  reporters: ['clear-text', 'progress', 'json'],
  clearTextReporter: { reportMutants: false },
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  thresholds: { high: 95, low: 80, break: null },
  tempDirName: '.stryker-tmp',
};
