import { describe, expect, it } from 'vitest';
import { cronOp, opFor } from '../src';

const words = new Set(['api', 'v2', 'events', 'sponsors', 'draft', 'asset', 'health', 'sharedreport']);

describe('opFor', () => {
  it.each([
    ['GET', '/api/v2/events/spring-fair-2026', 'GET /api/v2/events/:x'],
    ['get', 'https://stg.oursharedevents.com/api/v2/events/abc?token=eyJx', 'GET /api/v2/events/:x'],
    ['PUT', '/api/v2/sponsors/draft/tok_123/asset/logo.png', 'PUT /api/v2/sponsors/draft/:x/asset/:x'],
    ['GET', '/sharedReport', 'GET /sharedreport'],
    ['GET', '/', 'GET /'],
    ['BREW', '/health', 'GET /health'],
    ['GET', '/api/%E0%A4%A', 'GET /api/:x'],
  ])('%s %s → %s', (m, p, want) => {
    expect(opFor(m, p, words)).toBe(want);
  });
});

describe('cronOp', () => {
  it('names a scheduled run', () => {
    expect(cronOp('lifecycle')).toBe('CRON /lifecycle');
    expect(cronOp('Dana Smith')).toBe('CRON /:x');
  });
});
