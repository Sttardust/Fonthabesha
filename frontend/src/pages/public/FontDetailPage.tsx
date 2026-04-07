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
 * Note: font pairings are not in scope — backend returns relatedFamilies: [].
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

import DetailNav from '@/components/detail/DetailNav';
import StylesSection from '@/components/detail/StylesSection';
import GlyphsSection from '@/components/detail/GlyphsSection';
import LayoutsSection from '@/components/detail/LayoutsSection';
import DetailsSection from '@/components/detail/DetailsSection';

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

  // Load the first/default style for the hero specimen
  useEffect(() => {
    if (!family?.styles[0]) return;
    const defaultStyle =
      family.styles.find((s) => s.isDefault) ?? family.styles[0];
    loadFontStyle(family.id, defaultStyle.id, defaultStyle.assetUrl).then(
      setHeroCssFamily,
    );
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

  // Derive display names — prefer am over en, fall back to native
  const displayName =
    family.name.am ?? family.name.en ?? family.name.native ?? family.slug;
  const nameEn = family.name.en ?? displayName;
  const nameAm = family.name.am ?? displayName;

  const heroFont = heroCssFamily
    ? `"${heroCssFamily}", "Noto Sans Ethiopic", sans-serif`
    : '"Noto Sans Ethiopic", sans-serif';

  // License display
  const licenseName = family.license?.name ?? family.license?.code ?? '—';
  const licenseCode = family.license?.code ?? '—';

  return (
    <>
      <Helmet>
        <title>{displayName} — Fonthabesha</title>
        <meta
          name="description"
          content={`${displayName} — ${family.styles.length} ${family.styles.length === 1 ? 'style' : 'styles'}. Free ${family.category ?? 'Ethiopic'} font by ${family.designers.map((d) => d.name).join(', ') || 'Fonthabesha'}.`}
        />
        <meta property="og:type"        content="article" />
        <meta property="og:title"       content={`${displayName} — Fonthabesha`} />
        <meta property="og:description" content={family.description?.en ?? `${displayName} — free Ethiopic font family with ${family.styles.length} styles.`} />
        {family.coverImageUrl && (
          <meta property="og:image" content={family.coverImageUrl} />
        )}
        <meta name="twitter:card"  content="summary_large_image" />
        <meta name="twitter:title" content={`${displayName} — Fonthabesha`} />
      </Helmet>

      {/* ── Sticky detail nav ── */}
      <DetailNav
        familyName={displayName}
        hasGlyphs
        isAuthenticated={isAuthenticated}
        downloading={downloading}
        onDownload={handleDownload}
      />

      {/* ── Hero section ── */}
      <header className="detail-hero">
        <div className="detail-hero__inner">
          <div className="detail-hero__names">
            {nameAm && (
              <h1 className="detail-hero__name-am" lang="am">
                {nameAm}
              </h1>
            )}
            {nameEn && nameEn !== nameAm && (
              <p className="detail-hero__name-en" lang="en">
                {nameEn}
              </p>
            )}
          </div>

          <div className="detail-hero__meta">
            {family.designers.length > 0 && (
              <span className="detail-hero__designer">
                {family.designers.map((d) => d.name).join(', ')}
              </span>
            )}
            {family.category && (
              <span className="badge">{family.category}</span>
            )}
            {family.script && (
              <span className="badge">{family.script}</span>
            )}
            {family.styles.some((s) => s.isVariable) && (
              <span className="badge badge--variable">Variable</span>
            )}
            <span className="badge">{licenseCode}</span>
            <span className="detail-hero__count">
              {family.styles.length}{' '}
              {family.styles.length === 1 ? 'style' : 'styles'}
            </span>
          </div>
        </div>

        {/* Giant hero specimen */}
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
            {nameAm || nameEn}
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
            <h3 className="license-card__title">{licenseName}</h3>
            <code className="license-card__code">{licenseCode}</code>
          </div>
          {family.license?.summary.en && (
            <p className="license-card__summary">{family.license.summary.en}</p>
          )}
          {family.license?.summary.am && (
            <p className="license-card__summary" lang="am">
              {family.license.summary.am}
            </p>
          )}
        </div>
      </section>

      {/* ── Download CTA (bottom) ── */}
      <div className="detail-download-cta">
        {isAuthenticated ? (
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading
              ? t('fontDetail.downloading')
              : `↓ ${t('fontDetail.download')} ${displayName}`}
          </button>
        ) : (
          <div className="detail-download-cta__locked">
            <p>{t('fontDetail.loginToDownload')}</p>
            <Link to="/login" className="btn btn--primary">
              {t('nav.login')}
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
