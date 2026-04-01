/**
 * DetailNav
 *
 * Sticky secondary nav for the font detail page.
 * Tracks which section is in the viewport via IntersectionObserver
 * and highlights the corresponding nav link.
 *
 * Sections: styles | glyphs | layouts | details | license
 */

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export type DetailSection = 'styles' | 'glyphs' | 'layouts' | 'details' | 'license';

interface DetailNavProps {
  familyName: string;
  hasGlyphs?: boolean;
  isAuthenticated: boolean;
  downloading: boolean;
  onDownload: () => void;
}

const SECTIONS: Array<{ id: DetailSection; labelKey: string }> = [
  { id: 'styles',  labelKey: 'fontDetail.styles' },
  { id: 'glyphs',  labelKey: 'fontDetail.glyphs' },
  { id: 'layouts', labelKey: 'fontDetail.layouts' },
  { id: 'details', labelKey: 'fontDetail.details' },
  { id: 'license', labelKey: 'fontDetail.license' },
];

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const navOffset = 68 + 52; // site-nav + detail-nav height
  const y = el.getBoundingClientRect().top + window.scrollY - navOffset - 16;
  window.scrollTo({ top: y, behavior: 'smooth' });
}

export default function DetailNav({
  familyName,
  hasGlyphs = true,
  isAuthenticated,
  downloading,
  onDownload,
}: DetailNavProps) {
  const { t } = useTranslation();
  const [active, setActive] = useState<DetailSection>('styles');

  // IntersectionObserver scroll-spy
  useEffect(() => {
    const sectionIds = SECTIONS.map((s) => s.id);
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id as DetailSection);
        },
        {
          rootMargin: '-30% 0px -60% 0px',
          threshold: 0,
        },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const visibleSections = SECTIONS.filter(
    (s) => s.id !== 'glyphs' || hasGlyphs,
  );

  return (
    <nav className="detail-nav" aria-label="Font detail sections">
      {/* Back link */}
      <Link to="/fonts" className="detail-nav__back" aria-label="Back to fonts">
        ← <span className="detail-nav__back-label">Fonts</span>
      </Link>

      {/* Family name */}
      <span className="detail-nav__name" aria-hidden="true">
        {familyName}
      </span>

      {/* Section links */}
      <div className="detail-nav__links" role="list">
        {visibleSections.map(({ id, labelKey }) => (
          <button
            key={id}
            type="button"
            role="listitem"
            className={`detail-nav__link${active === id ? ' detail-nav__link--active' : ''}`}
            onClick={() => scrollTo(id)}
            aria-current={active === id ? 'location' : undefined}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Download CTA */}
      <button
        type="button"
        className="btn btn--primary detail-nav__download"
        onClick={onDownload}
        disabled={downloading || !isAuthenticated}
        title={!isAuthenticated ? 'Log in to download' : undefined}
      >
        {downloading ? t('fontDetail.downloading') : `↓ ${t('fontDetail.download')}`}
      </button>
    </nav>
  );
}
