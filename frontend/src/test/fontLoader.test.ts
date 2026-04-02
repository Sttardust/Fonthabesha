import { describe, it, expect, beforeEach } from 'vitest';
import { getCssFamilyName, isFontLoaded } from '@/lib/utils/fontLoader';

// Note: loadFontStyle uses the FontFace API which is stubbed in setup.ts.
// These tests cover the pure utility functions only.

describe('getCssFamilyName', () => {
  it('returns a deterministic CSS family name from familyId and styleId', () => {
    const name = getCssFamilyName('fam-123', 'style-456');
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });

  it('returns the same name for the same inputs', () => {
    expect(getCssFamilyName('a', 'b')).toBe(getCssFamilyName('a', 'b'));
  });

  it('returns different names for different inputs', () => {
    expect(getCssFamilyName('a', 'b')).not.toBe(getCssFamilyName('a', 'c'));
    expect(getCssFamilyName('a', 'b')).not.toBe(getCssFamilyName('x', 'b'));
  });
});

describe('isFontLoaded', () => {
  beforeEach(() => {
    // document.fonts.has is stubbed to return false in setup.ts
  });

  it('returns false for a family that has not been loaded', () => {
    expect(isFontLoaded('nonexistent-family', 'nonexistent-style')).toBe(false);
  });
});
