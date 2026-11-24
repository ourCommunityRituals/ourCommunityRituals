// @ts-check
//
// Mutation testing, integration layer, for @ocr/flags: the storage adapters,
// judged by tests/adapter-spec.ts running on a real engine (better-sqlite3 for
// SQLite and for D1's statement shape, pg-mem for Postgres). A mutant here is
// a fault in SQL, in row mapping or in scope isolation that the spec would let
// ship.
import base from './stryker.conf.mjs';

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  ...base,
  mutate: ['src/adapters/sqlite.ts', 'src/adapters/postgres.ts', 'src/adapters/d1.ts'],
  jsonReporter: { fileName: 'reports/mutation-integration/mutation.json' },
  tempDirName: '.stryker-tmp-integration',
};
