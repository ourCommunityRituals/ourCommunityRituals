/**
 * Fail if dist/ is stale relative to src/. Regenerates in memory and compares —
 * a committed dist that disagrees with source is a silent drift, which is the
 * exact failure mode the whole package exists to prevent.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokensCss, tokensJson } from '../src/emit.ts';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
let failed = false;

for (const [file, expected] of [
  ['tokens.css', tokensCss()],
  ['tokens.json', tokensJson()],
]) {
  let actual = '';
  try {
    actual = readFileSync(join(dist, file), 'utf8');
  } catch {
    console.error(`✗ dist/${file} is missing. Run: pnpm --filter @ocr/tokens build`);
    failed = true;
    continue;
  }
  if (actual !== expected) {
    console.error(`✗ dist/${file} is stale. Run: pnpm --filter @ocr/tokens build`);
    failed = true;
  } else {
    console.log(`✓ dist/${file} matches src/`);
  }
}

process.exit(failed ? 1 : 0);
