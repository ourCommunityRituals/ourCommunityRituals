import { describe, expect, it } from 'vitest';
import { classify, EVENTS, PATH_ROLES, route } from '../src/events.mjs';

describe('classify', () => {
  it.each(['opened', 'ready_for_review', 'reopened'])('a PR %s is pr_opened', (action) => {
    expect(classify('pull_request', { action, pull_request: { draft: false } })).toBe('pr_opened');
  });
  it('ignores draft PRs and other PR actions', () => {
    expect(classify('pull_request', { action: 'opened', pull_request: { draft: true } })).toBeNull();
    expect(classify('pull_request', { action: 'synchronize', pull_request: {} })).toBeNull();
    expect(classify('pull_request', { action: 'opened' })).toBe('pr_opened');
  });
  it('a red run on main is ci_red; elsewhere, or not completed, nothing', () => {
    const run = (w, action = 'completed') => classify('workflow_run', { action, workflow_run: w });
    expect(run({ conclusion: 'failure', head_branch: 'main' })).toBe('ci_red');
    expect(run({ conclusion: 'failure', head_branch: 'feature' })).toBeNull();
    expect(run({ conclusion: 'failure', head_branch: 'main' }, 'requested')).toBeNull();
    expect(run({ conclusion: 'cancelled', head_branch: 'main' })).toBeNull();
  });
  it('a green staging run is staging_deployed', () => {
    const p = (name, conclusion = 'success') => ({ action: 'completed', workflow_run: { name, conclusion, head_branch: 'main' } });
    expect(classify('workflow_run', p('T1 Deploy → Staging'))).toBe('staging_deployed');
    expect(classify('workflow_run', p('Deploy staging'))).toBe('staging_deployed');
    expect(classify('workflow_run', p('OCR Workspace CI'))).toBeNull();
    expect(classify('workflow_run', p('Deploy staging', 'skipped'))).toBeNull();
    expect(classify('workflow_run', { action: 'completed' })).toBeNull();
  });
  it('a Linear move arrives as repository_dispatch', () => {
    expect(classify('repository_dispatch', { action: 'linear-story-moved' })).toBe('linear_moved');
    expect(classify('repository_dispatch', { action: 'other' })).toBeNull();
  });
  it('a manual run names its event, which must be known', () => {
    expect(classify('workflow_dispatch', { inputs: { event: 'ci_red' } })).toBe('ci_red');
    expect(classify('workflow_dispatch', { inputs: { event: 'toString' } })).toBeNull();
    expect(classify('workflow_dispatch', { inputs: { event: 'nope' } })).toBeNull();
    expect(classify('workflow_dispatch', {})).toBeNull();
  });
  it('ignores other events and a missing payload', () => {
    expect(classify('push')).toBeNull();
    expect(classify('issues', {})).toBeNull();
  });
});

describe('route', () => {
  it('wakes the base roles for each event', () => {
    expect(route('ci_red')).toEqual(['sre']);
    expect(route('staging_deployed')).toEqual(['integrator', 'front-end']);
    expect(route('linear_moved')).toEqual(['product-owner']);
    expect(route('pr_opened')).toEqual(['product-owner', 'tester']);
    expect(route('unknown')).toEqual([]);
    expect(Object.keys(EVENTS)).toHaveLength(4);
  });
  it.each([
    ['workers/oursharedevents/migrations/0099_x.sql', 'back-end'],
    ['workers/oursharedevents/src/handlers/events.ts', 'back-end'],
    ['workers/oursharedevents/src/router.ts', 'back-end'],
    ['src/lib/PII.ts', 'data-scientist'],
    ['workers/x/src/lib/count-floor.ts', 'data-scientist'],
    ['packages/ui/src/app.css', 'designer'],
    ['packages/tokens/src/x.ts', 'designer'],
    ['web/page.html', 'designer'],
    ['ocr-docs-brain/invariants.yaml', 'architect'],
    ['docs/adr/ADR-1.md', 'architect'],
    ['.github/workflows/ci.yml', 'sre'],
  ])('a PR touching %s also wakes %s', (path, role) => {
    expect(route('pr_opened', [path])).toEqual(['product-owner', 'tester', role]);
  });
  it('adds each role once, and path roles only for PRs', () => {
    expect(route('pr_opened', ['a/migrations/1.sql', 'b/migrations/2.sql', 'x.css'])).toEqual(['product-owner', 'tester', 'back-end', 'designer']);
    expect(route('ci_red', ['a/migrations/1.sql'])).toEqual(['sre']);
    expect(route('pr_opened', ['README.md'])).toEqual(['product-owner', 'tester']);
    expect(route('pr_opened', ['docs/github/workflows/x.md'])).toEqual(['product-owner', 'tester']);
    expect(PATH_ROLES).toHaveLength(5);
  });
  it('wakes every role a path matches', () => {
    expect(route('pr_opened', ['ocr-docs-brain/data-edges.yaml'])).toEqual(['product-owner', 'tester', 'data-scientist', 'architect']);
  });
  it('does not add a base role twice', () => {
    expect(route('pr_opened', ['.github/workflows/x.yml'])).toEqual(['product-owner', 'tester', 'sre']);
  });
});
