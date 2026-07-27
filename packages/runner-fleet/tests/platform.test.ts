import { describe, it, expect } from 'vitest';
import { detectOs } from '../src/platform.ts';
import type { Os } from '../src/types.ts';

const VALID_OS: Os[] = ['windows', 'linux', 'darwin'];

describe('detectOs', () => {
  it('returns a valid Os value for the current platform', () => {
    expect(VALID_OS).toContain(detectOs());
  });

  it('is stable across multiple calls', () => {
    expect(detectOs()).toBe(detectOs());
  });
});
