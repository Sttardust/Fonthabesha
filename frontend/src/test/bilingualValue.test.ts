import { describe, it, expect } from 'vitest';
import { bilingualValue, bilingualPair } from '@/lib/utils/bilingualValue';

describe('bilingualValue', () => {
  it('returns am when locale is am and am is present', () => {
    expect(bilingualValue({ am: 'ሰላም', en: 'Hello' }, 'am')).toBe('ሰላም');
  });

  it('returns en when locale is en and en is present', () => {
    expect(bilingualValue({ am: 'ሰላም', en: 'Hello' }, 'en')).toBe('Hello');
  });

  it('falls back to en when am is null and locale is am', () => {
    expect(bilingualValue({ am: null, en: 'Hello' }, 'am')).toBe('Hello');
  });

  it('falls back to am when en is null and locale is en', () => {
    expect(bilingualValue({ am: 'ሰላም', en: null }, 'en')).toBe('ሰላም');
  });

  it('returns fallback string when both are null', () => {
    expect(bilingualValue({ am: null, en: null }, 'am', 'N/A')).toBe('N/A');
  });

  it('returns empty string fallback by default when both null', () => {
    expect(bilingualValue({ am: null, en: null })).toBe('');
  });

  it('handles null value gracefully', () => {
    expect(bilingualValue(null, 'am', 'fallback')).toBe('fallback');
  });

  it('handles undefined value gracefully', () => {
    expect(bilingualValue(undefined, 'en', 'fallback')).toBe('fallback');
  });

  it('defaults to am locale', () => {
    expect(bilingualValue({ am: 'ሰላም', en: 'Hello' })).toBe('ሰላም');
  });
});

describe('bilingualPair', () => {
  it('returns both strings when both present', () => {
    const result = bilingualPair({ am: 'ሰላም', en: 'Hello' });
    expect(result).toEqual({ am: 'ሰላም', en: 'Hello' });
  });

  it('returns null for missing locales', () => {
    const result = bilingualPair({ am: null, en: 'Hello' });
    expect(result).toEqual({ am: null, en: 'Hello' });
  });

  it('handles null input', () => {
    const result = bilingualPair(null);
    expect(result).toEqual({ am: null, en: null });
  });

  it('handles undefined input', () => {
    const result = bilingualPair(undefined);
    expect(result).toEqual({ am: null, en: null });
  });
});
