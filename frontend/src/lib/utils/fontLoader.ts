/**
 * fontLoader.ts
 *
 * Lazy-loads web fonts for specimen rendering.
 * Each font family/style gets a unique CSS font-family name so specimens can
 * apply them without clashing with the UI font stack.
 */

interface LoadedFont {
  familyId: string;
  styleId: string;
  cssFamily: string;
  status: 'loading' | 'loaded' | 'error';
}

const loadedFonts = new Map<string, LoadedFont>();

/**
 * Derives a safe CSS font-family name from familyId + styleId.
 * Using the raw id keeps it unique; real names are applied via font-family
 * on the specimen element via inline style.
 */
export function getCssFamilyName(familyId: string, styleId: string): string {
  return `fh-${familyId}-${styleId}`;
}

/**
 * Ensure a font style is loaded into the browser font cache.
 * Safe to call multiple times for the same style — de-duplicated.
 *
 * @param familyId  Font family UUID
 * @param styleId   Font style UUID
 * @param assetUrl  Direct URL to the font file (from API DTO)
 * @returns CSS font-family name to use in inline styles
 */
export async function loadFontStyle(
  familyId: string,
  styleId: string,
  assetUrl: string,
): Promise<string> {
  const key = `${familyId}::${styleId}`;
  const cssFamily = getCssFamilyName(familyId, styleId);

  const existing = loadedFonts.get(key);
  if (existing) {
    // Already loading or loaded — just return the family name
    return cssFamily;
  }

  const entry: LoadedFont = { familyId, styleId, cssFamily, status: 'loading' };
  loadedFonts.set(key, entry);

  try {
    const fontFace = new FontFace(cssFamily, `url(${assetUrl})`);
    await fontFace.load();
    document.fonts.add(fontFace);
    entry.status = 'loaded';
  } catch (err) {
    entry.status = 'error';
    console.warn(`[fontLoader] Failed to load style ${styleId}:`, err);
  }

  return cssFamily;
}

/**
 * Preload the first style of a family (used for font cards on scroll into view).
 */
export async function preloadFirstStyle(
  familyId: string,
  styles: Array<{ id: string; assetUrl: string }>,
): Promise<string | null> {
  if (!styles.length) return null;
  const first = styles[0];
  return loadFontStyle(familyId, first.id, first.assetUrl);
}

/**
 * Check if a style is already loaded (synchronous).
 */
export function isFontLoaded(familyId: string, styleId: string): boolean {
  const key = `${familyId}::${styleId}`;
  return loadedFonts.get(key)?.status === 'loaded';
}
