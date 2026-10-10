/**
 * The Worker-facing entry points type-check without the DOM library.
 *
 * ourSharedEvents and ourWKRP are Cloudflare Workers. They import `@ocr/ui`
 * (src/index.ts, src/css.ts, src/tokens.ts) and compile it with their own
 * TypeScript settings, which have the Fetch API (Request, Response, ...) but no
 * DOM: no HTMLElement, document or window. This package's own tsconfig has DOM,
 * so a DOM type in a shared module passed here and only broke a spoke when it
 * bumped its pin (2026-10-10: `OcrToastHandle.element: HTMLElement` in toast.ts
 * failed ourSharedEvents' typecheck at e165d1c).
 *
 * This compiles those entry points with ES2022 only and fails on any name it
 * cannot find, except the Fetch API names a Worker provides.
 */

import { describe, test, expect } from 'vitest';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const ENTRY_POINTS = ['index.ts', 'css.ts', 'tokens.ts'].map((f) =>
  join(SRC, f),
);

/** Globals every Worker has (Fetch API and friends); not DOM. */
const WORKER_GLOBALS = new Set([
  'Request',
  'Response',
  'Headers',
  'fetch',
  'URL',
  'URLSearchParams',
  'TextEncoder',
  'TextDecoder',
  'ReadableStream',
  'crypto',
]);

describe('@ocr/ui compiles for a Worker (no DOM library)', () => {
  test('no DOM-only name is used by the modules a Worker imports', () => {
    const program = ts.createProgram(ENTRY_POINTS, {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      lib: ['lib.es2022.d.ts'],
      types: [],
      strict: true,
      noEmit: true,
      skipLibCheck: true,
    });
    const missing = ts
      .getPreEmitDiagnostics(program)
      .filter((d) => d.code === 2304 || d.code === 2552) // 'Cannot find name'
      .map((d) => {
        const text = ts.flattenDiagnosticMessageText(d.messageText, '\n');
        const name = /'([^']+)'/.exec(text)?.[1] ?? text;
        const where = d.file
          ? `${d.file.fileName.slice(SRC.length + 1)}:${d.file.getLineAndCharacterOfPosition(d.start ?? 0).line + 1}`
          : '?';
        return { name, where };
      })
      .filter((m) => !WORKER_GLOBALS.has(m.name));
    expect(missing, 'DOM-only names a Worker cannot compile').toEqual([]);
  });

  test('the check sees the entry points (it cannot pass on an empty program)', () => {
    const program = ts.createProgram(ENTRY_POINTS, {
      lib: ['lib.es2022.d.ts'],
      types: [],
      noEmit: true,
    });
    const files = program.getSourceFiles().map((f) => f.fileName);
    expect(files.some((f) => f.endsWith('/src/toast.ts'))).toBe(true);
    expect(files.some((f) => f.endsWith('/src/index.ts'))).toBe(true);
  });
});
