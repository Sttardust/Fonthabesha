import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { catalogApi } from '@/lib/api/catalog';
import { downloadsApi } from '@/lib/api/downloads';
import { bilingualValue } from '@/lib/utils/bilingualValue';
import { useSpecimenStore } from '@/lib/store/specimenStore';
import { useAuthStore } from '@/lib/store/authStore';

export default function FontDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const specimenText = useSpecimenStore((s) => s.text);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [downloading, setDownloading] = useState(false);

  const { data: family, isLoading, isError } = useQuery({
    queryKey: ['fonts', slug],
    queryFn: () => catalogApi.getBySlug(slug!),
    enabled: !!slug,
  });

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
    return <div className="page-loading">{t('common.loading')}</div>;
  }

  if (isError || !family) {
    return (
      <div className="page-error">
        <p>{t('common.error')}</p>
        <Link to="/fonts" className="btn btn--secondary">{t('common.back')}</Link>
      </div>
    );
  }

  const familyDisplayName = bilingualValue(family.name);

  return (
    <>
      <Helmet>
        <title>{familyDisplayName} — Fonthabesha</title>
      </Helmet>

      {/* Detail sticky nav */}
      <nav className="detail-nav" aria-label="Font sections">
        <span className="detail-nav__name">{familyDisplayName}</span>
        <div className="detail-nav__links">
          <a href="#specimen" className="detail-nav__link">{t('fontDetail.styles')}</a>
          <a href="#about" className="detail-nav__link">{t('fontDetail.about')}</a>
          <a href="#license" className="detail-nav__link">{t('fontDetail.license')}</a>
          {family.pairsWith.length > 0 && (
            <a href="#pairings" className="detail-nav__link">{t('fontDetail.pairings')}</a>
          )}
        </div>
        <button
          type="button"
          className="btn btn--primary detail-nav__download"
          onClick={handleDownload}
          disabled={downloading || !isAuthenticated}
        >
          {downloading ? t('fontDetail.downloading') : t('fontDetail.download')}
        </button>
      </nav>

      {/* Specimen */}
      <section id="specimen" className="detail-section">
        {family.styles.map((style) => (
          <div key={style.id} className="style-specimen">
            <div className="specimen-area">
              <span className="style-specimen__text">{specimenText}</span>
            </div>
            <div className="style-specimen__label">
              {bilingualValue(style.name)} · {style.weight}
              {style.isItalic ? ' Italic' : ''}
            </div>
          </div>
        ))}
      </section>

      {/* About */}
      <section id="about" className="detail-section detail-section--info">
        <h2>{t('fontDetail.about')}</h2>
        {family.description && (
          <p>{bilingualValue(family.description)}</p>
        )}
        {family.designer && (
          <p>
            <strong>{t('fontDetail.designer')}: </strong>
            {bilingualValue(family.designer)}
          </p>
        )}
        <div className="font-card__badges">
          {family.isVariable && <span className="badge badge--variable">Variable</span>}
          <span className="badge">{t(`catalog.filters.${family.category}`)}</span>
          <span className="badge">{t(`catalog.filters.${family.scriptSupport}`)}</span>
        </div>
      </section>

      {/* License */}
      <section id="license" className="detail-section detail-section--info">
        <h2>{t('fontDetail.license')}</h2>
        <p>
          {family.licenseUrl ? (
            <a href={family.licenseUrl} target="_blank" rel="noopener noreferrer">
              {family.license}
            </a>
          ) : (
            family.license
          )}
        </p>
      </section>

      {/* Pairings */}
      {family.pairsWith.length > 0 && (
        <section id="pairings" className="detail-section">
          <h2>{t('fontDetail.pairings')}</h2>
          <ul className="font-card-list">
            {family.pairsWith.map((paired) => (
              <li key={paired.id}>
                <Link to={`/fonts/${paired.slug}`} className="font-card">
                  <div className="specimen-area">
                    <span className="font-card__specimen">{specimenText}</span>
                  </div>
                  <div className="font-card__meta">
                    <span className="font-card__name">{bilingualValue(paired.name)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
