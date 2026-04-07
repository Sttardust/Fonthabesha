/**
 * FontCard
 *
 * Renders a single font family as either a list row or a grid tile.
 * The specimen text area lazy-loads the actual font via IntersectionObserver
 * so fonts that are off-screen are never fetched until needed.
 *
 * Usage:
 *   <FontCard family={family} view="list" />
 *   <FontCard family={family} view="grid" />
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { loadFontStyle, getCssFamilyName } from '@/lib/utils/fontLoader';
import { bilingualValue } from '@/lib/utils/bilingualValue';
import { useSpecimenStore } from '@/lib/store/specimenStore';
import type { FontFamilySummary } from '@/lib/types';

interface FontCardProps {
  family: FontFamilySummary;
  view?: 'list' | 'grid';
}

export default function FontCard({ family, view = 'list' }: FontCardProps) {
  const { t } = useTranslation();
  const { text: specimenText, fontSize, darkMode } = useSpecimenStore();

  const cardRef = useRef<HTMLLIElement>(null);
  const [fontCssFamily, setFontCssFamily] = useState<string | null>(null);
  const [fontLoaded, setFontLoaded] = useState(false);

  // Pick the first style as the preview style
  const previewStyle = family.styles[0] ?? null;

  // IntersectionObserver: trigger font load when card scrolls into view
  const loadFont = useCallback(async () => {
    if (!previewStyle || fontLoaded) return;
    const cssFamily = await loadFontStyle(
      family.id,
      previewStyle.id,
      previewStyle.assetUrl,
    );
    setFontCssFamily(cssFamily);
    setFontLoaded(true);
  }, [family.id, previewStyle, fontLoaded]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || !previewStyle) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          loadFont();
        }
      },
      { rootMargin: '200px' }, // start loading 200px before entering viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadFont, previewStyle]);

  const familyName = bilingualValue(family.name);
  const designerName = family.designer ? bilingualValue(family.designer) : null;
  const styleCount = family.styles.length;

  const specimenStyle: React.CSSProperties = {
    fontFamily: fontCssFamily
      ? `"${fontCssFamily}", "Noto Sans Ethiopic", sans-serif`
      : '"Noto Sans Ethiopic", sans-serif',
    fontSize: view === 'list' ? `${fontSize}px` : `${Math.min(fontSize, 48)}px`,
    lineHeight: 1.2,
    transition: 'font-family 0.2s ease',
  };

  const specimenClass = [
    'specimen-area',
    darkMode ? '' : 'specimen-area--light',
    !fontLoaded ? 'specimen-area--loading' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (view === 'grid') {
    return (
      <li ref={cardRef} className="font-card-item font-card-item--grid">
        <Link to={`/fonts/${family.slug}`} className="font-card font-card--grid">
          {/* Grid specimen */}
          <div className={specimenClass}>
            <span style={specimenStyle} aria-label={`${familyName} specimen`}>
              {specimenText || familyName}
            </span>
          </div>

          {/* Grid footer */}
          <div className="font-card__footer">
            <div className="font-card__title-row">
              <span className="font-card__name">{familyName}</span>
              {family.isVariable && (
                <span className="badge badge--variable" aria-label="Variable font">
                  Var
                </span>
              )}
            </div>
            <div className="font-card__sub-row">
              {designerName && (
                <span className="font-card__designer">{designerName}</span>
              )}
              <span className="font-card__style-count">
                {styleCount} {styleCount === 1 ? 'style' : 'styles'}
              </span>
            </div>
          </div>
        </Link>
      </li>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <li ref={cardRef} className="font-card-item font-card-item--list">
      <Link to={`/fonts/${family.slug}`} className="font-card font-card--list">
        {/* List header row */}
        <div className="font-card__header">
          <span className="font-card__name">{familyName}</span>
          <div className="font-card__header-meta">
            <span className="font-card__style-count">
              {styleCount} {styleCount === 1 ? 'style' : 'styles'}
            </span>
            {family.isVariable && (
              <span className="badge badge--variable">Variable</span>
            )}
            <span className="badge">
              {t(`catalog.filters.${family.category}`)}
            </span>
          </div>
        </div>

        {/* List specimen */}
        <div className={specimenClass}>
          <span
            className="font-card__specimen-text"
            style={specimenStyle}
            aria-label={`${familyName} specimen`}
          >
            {specimenText || familyName}
          </span>
        </div>

        {/* List footer */}
        {designerName && (
          <div className="font-card__footer font-card__footer--list">
            <span className="font-card__designer">{designerName}</span>
            <span className="font-card__script">
              {t(`catalog.filters.${family.scriptSupport}`)}
            </span>
          </div>
        )}
      </Link>
    </li>
  );
}
