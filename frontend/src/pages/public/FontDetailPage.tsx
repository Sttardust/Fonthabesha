/**
 * FontDetailPage  /fonts/:slug
 *
 * Sections (each has an anchor id for scroll-spy):
 *   #styles   — per-style specimen rows
 *   #glyphs   — Ethiopic glyph grid + inspector
 *   #layouts  — headline + body preview
 *   #details  — spec table + description
 *   #license  — license card
 *
 * The DetailNav floats above all sections and tracks the active one.
 */

import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

import { catalogApi } from '@/lib/api/catalog';
import { downloadsApi } from '@/lib/api/downloads';
import { useAuthStore } from '@/lib/store/authStore';
import { loadFontStyle } from '@/lib/utils/fontLoader';
import { bilingualValue } from '@/lib/utils/bilingualValue';

import DetailNav from '@/components/detail/DetailNav';
import StylesSection from '@/components/detail/StylesSection';
import GlyphsSection from '@/components/detail/GlyphsSection';
import LayoutsSection from '@/components/detail/LayoutsSection';
import DetailsSection from '@/components/detail/DetailsSection';
import FontCard from '@/components/catalog/FontCard';

export default function FontDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [downloading, setDownloading] = useState(false);
  const [heroCssFamily, setHeroCssFamily] = useState<string | null>(null);

  const { data: family, isLoading, isError } = useQuery({
    queryKey: ['fonts', slug],
    queryFn: () => catalogApi.getBySlug(slug!),
    enabled: !!slug,
  });

  // Load the first style for the hero specimen
  useEffect(() => {
    if (!family?.styles[0]) return;
    const s = family.styles[0];
    loadFontStyle(family.id, s.id, s.assetUrl).then(setHeroCssFamily);
  }, [family]);

  const handleDownload = async () => {
    if (!family) return;
    setDownloading(true);
    try {
      await downloadsApi.download(family.id, `${family.slug}.zip`);
    } finally {
      setDownloading(false);
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="page-loading" aria-live="polite">
        <span className="catalog-spinner" aria-label={t('common.loading')} />
      </div>
    );
  }

  if (isError || !family) {
    return (
      <div className="page-error">
        <p>{t('common.error')}</p>
        <Link to="/fonts" className="btn btn--secondary">
          ← {t('common.back')}
        </Link>
      </div>
    );
  }

  const familyDisplayName = bilingualValue(family.name);
  const familyNameEn = family.name.en ?? familyDisplayName;
  const familyNameAm = family.name.am ?? familyDisplayName;

  const heroFont = heroCssFamily
    ? `"${heroCssFamily}", "Noto Sans Ethiopic", sans-serif`
    : '"Noto Sans Ethiopic", sans-serif';

  return (
    <>
      <Helmet>
        <title>{familyDisplayName} — Fonthabesha</title>
        <meta
          name="description"
          content={`${familyDisplayName} — ${family.styles.length} styles. Free ${t(`catalog.filters.${family.category}`)} font for Ethiopic and Latin scripts.`}
        />
      </Helmet>

      {/* ── Sticky detail nav ── */}
      <DetailNav
        familyName={familyDisplayName}
        hasGlyphs
        isAuthenticated={isAuthenticated}
        downloading={downloading}
        onDownload={handleDownload}
      />

      {/* ── Hero section ── */}
      <header className="detail-hero">
        <div className="detail-hero__inner">
          {/* Names */}
          <div className="detail-hero__names">
            {familyNameAm && (
              <h1 className="detail-hero__name-am" lang="am">
                {familyNameAm}
              </h1>
            )}
            {familyNameEn && familyNameEn !== familyNameAm && (
              <p className="detail-hero__name-en" lang="en">
                {familyNameEn}
              </p>
            )}
          </div>

          {/* Meta badges */}
          <div className="detail-hero__meta">
            {family.designer && (
              <span className="detail-hero__designer">
                {bilingualValue(family.designer)}
              </span>
            )}
            <span className="badge">{t(`catalog.filters.${family.category}`)}</span>
            <span className="badge">{t(`catalog.filters.${family.scriptSupport}`)}</span>
            {family.isVariable && <span className="badge badge--variable">Variable</span>}
            <span className="badge">{family.license}</span>
            <span className="detail-hero__count">
              {family.styles.length} {family.styles.length === 1 ? 'style' : 'styles'}
            </span>
          </div>
        </div>

        {/* Giant hero specimen — font name rendered in itself */}
        <div className="detail-hero__specimen" aria-hidden="true">
          <span
            style={{
              fontFamily: heroFont,
              fontSize: 'clamp(72px, 12vw, 180px)',
              lineHeight: 1,
              color: 'var(--color-nav-text)',
              display: 'block',
              padding: '0 24px 32px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {familyNameAm || familyNameEn}
          </span>
        </div>
      </header>

      {/* ── Styles ── */}
      <StylesSection family={family} />

      {/* ── Glyphs ── */}
      <GlyphsSection family={family} />

      {/* ── Layouts ── */}
      <LayoutsSection family={family} />

      {/* ── Details ── */}
      <DetailsSection family={family} />

      {/* ── License ── */}
      <section id="license" className="detail-section detail-section--license">
        <div className="detail-section__header">
          <h2 className="detail-section__title">{t('fontDetail.license')}</h2>
        </div>
        <div className="license-card">
          <div className="license-card__header">
            <h3 className="license-card__title">{family.license}</h3>
          </div>
          {family.licenseUrl ? (
            <a
              href={family.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="license-card__link"
            >
              Read full license →
            </a>
          ) : (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              No license URL provided.
            </p>
          )}
        </div>
      </section>

      {/* ── Related / pairings ── */}
      {family.pairsWith.length > 0 && (
        <section className="detail-section">
          <div className="detail-section__header">
            <h2 className="detail-section__title">{t('fontDetail.pairings')}</h2>
          </div>
          <ul className="font-card-list" role="list">
            {family.pairsWith.map((paired) => (
              <FontCard key={paired.id} family={paired} view="list" />
            ))}
          </ul>
        </section>
      )}

      {/* ── Download CTA (bottom) ── */}
      <div className="detail-download-cta">
        {isAuthenticated ? (
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? t('fontDetail.downloading') : `↓ ${t('fontDetail.download')} ${familyDisplayName}`}
          </button>
        ) : (
          <div className="detail-download-cta__locked">
            <p>Log in to download this font family for free.</p>
            <Link to="/login" className="btn btn--primary">
              {t('nav.login')}
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
