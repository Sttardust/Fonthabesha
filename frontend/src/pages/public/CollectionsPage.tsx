import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

/**
 * Collections feature is not yet available in the backend.
 * This page will be built when the /api/v1/collections endpoints are implemented.
 */
export default function CollectionsPage() {
  const { t } = useTranslation();
  return (
    <>
      <Helmet><title>{t('nav.collections')} — Fonthabesha</title></Helmet>
      <div className="page-container">
        <h1 className="page-title">{t('nav.collections')}</h1>
        <div className="dashboard-empty">
          <span className="dashboard-empty__icon" aria-hidden="true">📚</span>
          <p>Collections are coming soon.</p>
        </div>
      </div>
    </>
  );
}
