import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

/**
 * Collections admin page — not yet implemented.
 * The backend /api/v1/admin/collections endpoints don't exist yet.
 * This placeholder prevents import/type errors and shows a clear status.
 */
export default function CollectionsAdminPage() {
  const { t } = useTranslation();
  return (
    <>
      <Helmet><title>{t('admin.collections.title')} — Fonthabesha</title></Helmet>
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('admin.collections.title')}</h1>
      </div>
      <div className="dashboard-empty">
        <span className="dashboard-empty__icon" aria-hidden="true">📚</span>
        <p>{t('placeholder.collectionsAdmin')}</p>
      </div>
    </>
  );
}
