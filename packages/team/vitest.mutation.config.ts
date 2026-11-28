import { defineConfig } from 'vitest/config';

/**
 * The suite Stryker runs (stryker.conf.mjs): every test except repo.test.mjs,
 * which reads the hub's real role cards, agent files and team/tools.json.
 * Stryker runs in a sandbox copy of this package, where those are absent.
 * repo.test.mjs covers no src/ logic of its own; it is the integration layer.
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.mjs'],
    exclude: ['node_modules/**', 'tests/repo.test.mjs'],
    environment: 'node',
    globals: false,
  },
});
