import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTemplate } from '../src/contract';

test('flags a template that declares its own :root tokens', () => {
  // Mirrors a real WKRP template: own :root plus a big inline block.
  const bigCss = '.rule' + 'x'.repeat(500) + '{color:red}';
  const legacy = `<!DOCTYPE html><html><head><style>
    :root { --bg:#0a0a0a; --accent:#D4954B; }
    ${bigCss}
  </style></head><body>...</body></html>`;
  const findings = checkTemplate('legacy.html', legacy);
  assert.ok(findings.some((f) => f.issue === 'local-root-tokens'));
  assert.ok(findings.some((f) => f.issue === 'large-inline-style'));
});

test('passes a template that links the shared stylesheet', () => {
  const migrated = `<!DOCTYPE html><html><head>
    <link rel="stylesheet" href="/ui.css">
  </head><body><main class="content"></main></body></html>`;
  const findings = checkTemplate('migrated.html', migrated);
  assert.equal(findings.length, 0);
});

test('flags a body page with no stylesheet at all', () => {
  const bare = `<!DOCTYPE html><html><head></head><body>hi</body></html>`;
  const findings = checkTemplate('bare.html', bare);
  assert.ok(findings.some((f) => f.issue === 'missing-shared-stylesheet'));
});
