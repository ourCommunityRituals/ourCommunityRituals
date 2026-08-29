/**
 * Guard: the generated-artifact parity SHA must be OS-independent (OSE-953).
 *
 * The @ocr/flags generator embeds `CONTRACT_SHA: <hash of flags-contract.yaml>`
 * in flag-keys.ts / presets.ts, and both the L0 security gate
 * (tests/level0_security.py) and the drift check (generate-from-yaml.mjs
 * --check) compare it against a freshly computed hash of the brain YAML.
 *
 * That hash was originally computed over RAW bytes, which made it line-ending
 * sensitive: the Windows self-hosted runner checks the brain out with CRLF
 * (autocrlf) and the GitHub-hosted ubuntu runner checks it out with LF, so the
 * gate passed on the box and failed on ubuntu — a masked, OS-coupled green.
 * The fix normalizes CRLF→LF before hashing in BOTH the generator and the
 * Python checker. These tests lock that contract:
 *   1. the normalization is genuinely CRLF-invariant, and
 *   2. the committed generated files embed the LF-normalized SHA
 *      (so a real drift still fails, but a line-ending flip never does).
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(PKG_ROOT, '..', '..');
const CONTRACT = resolve(REPO_ROOT, 'OCR-docs', 'ocr-docs-brain', 'flags-contract.yaml');
const OUT_KEYS = resolve(PKG_ROOT, 'src', 'generated', 'flag-keys.ts');
const OUT_PRESETS = resolve(PKG_ROOT, 'src', 'generated', 'presets.ts');

// Mirror of the shared normalize-then-hash the generator and checker use.
const shaOf = (text: string): string =>
  createHash('sha256').update(text.replace(/\r\n/g, '\n'), 'utf8').digest('hex').slice(0, 16);
const embeddedSha = (file: string): string | undefined =>
  readFileSync(file, 'utf8').match(/CONTRACT_SHA:\s*([0-9a-f]{16})/)?.[1];

describe('OSE-953 — generated parity SHA is line-ending independent', () => {
  it('normalize-then-hash yields the same SHA for LF and CRLF inputs', () => {
    const lf = 'flag_keys:\n  domain:\n    a: true\ntier_presets:\n  base:\n    flags:\n      a: false\n';
    const crlf = lf.replace(/\n/g, '\r\n');
    expect(shaOf(crlf)).toBe(shaOf(lf));
  });

  // These require the brain checkout (present in CI after the OCR-docs checkout
  // step, and locally in the workspace). Skip cleanly if it isn't there rather
  // than fail for an unrelated reason.
  const brainPresent = existsSync(CONTRACT);
  it.runIf(brainPresent)('the committed generated files embed the LF-normalized contract SHA', () => {
    const want = shaOf(readFileSync(CONTRACT, 'utf8'));
    expect(embeddedSha(OUT_KEYS), 'flag-keys.ts CONTRACT_SHA drift').toBe(want);
    expect(embeddedSha(OUT_PRESETS), 'presets.ts CONTRACT_SHA drift').toBe(want);
  });

  it.runIf(brainPresent)('injecting CRLF into the contract does not change the parity SHA', () => {
    const raw = readFileSync(CONTRACT, 'utf8');
    const forcedCrlf = raw.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
    expect(shaOf(forcedCrlf)).toBe(shaOf(raw));
  });
});
