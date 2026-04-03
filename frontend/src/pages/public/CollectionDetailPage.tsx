import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

/**
 * Collection detail page — not yet implemented (backend endpoint pending).
 */
export default function CollectionDetailPage() {
  const { t } = useTranslation();
  return (
    <>
      <Helmet><title>{t('nav.collections')} — Fonthabesha</title></Helmet>
      <div className="page-container">
        <h1 className="page-title">{t('nav.collections')}</h1>
        <div className="dashboard-empty">
          <span className="dashboard-empty__icon" aria-hidden="true">📚</span>
          <p>{t('placeholder.collectionDetail')}</p>
        </div>
      </div>
    </>
  );
}
