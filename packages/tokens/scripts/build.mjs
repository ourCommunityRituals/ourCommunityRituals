/**
 * Generate dist/tokens.css and dist/tokens.json from src/.
 * Both outputs come from one pass so they cannot disagree.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokensCss, tokensJson } from '../src/emit.ts';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, 'tokens.css'), tokensCss(), 'utf8');
writeFileSync(join(dist, 'tokens.json'), tokensJson(), 'utf8');
console.log('@ocr/tokens: wrote dist/tokens.css + dist/tokens.json');
