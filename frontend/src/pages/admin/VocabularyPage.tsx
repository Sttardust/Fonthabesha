import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

/**
 * Vocabulary / tag management page — not yet implemented.
 * The backend /api/v1/admin/vocabulary endpoints don't exist yet.
 */
export default function VocabularyPage() {
  const { t } = useTranslation();
  return (
    <>
      <Helmet><title>{t('admin.vocabulary.title')} — Fonthabesha</title></Helmet>
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('admin.vocabulary.title')}</h1>
      </div>
      <div className="dashboard-empty">
        <span className="dashboard-empty__icon" aria-hidden="true">🏷️</span>
        <p>Vocabulary management is not yet available. The backend endpoint is pending implementation.</p>
      </div>
    </>
  );
}
