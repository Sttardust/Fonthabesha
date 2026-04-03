import type { BilingualString } from '@/lib/types';

/**
 * Returns the most appropriate string from a bilingual value.
 * Priority: Amharic → English → fallback
 *
 * @param value  A BilingualString or null/undefined
 * @param locale Preferred locale; defaults to 'am'
 * @param fallback String to return when both am and en are null
 */
export function bilingualValue(
  value: BilingualString | null | undefined,
  locale: 'am' | 'en' = 'am',
  fallback = '',
): string {
  if (!value) return fallback;

  if (locale === 'am') {
    return value.am ?? value.en ?? fallback;
  }
  return value.en ?? value.am ?? fallback;
}

/**
 * Returns both strings when you need to display them side by side.
 * Returns null for any missing locale.
 */
export function bilingualPair(
  value: BilingualString | null | undefined,
): { am: string | null; en: string | null } {
  return { am: value?.am ?? null, en: value?.en ?? null };
}
