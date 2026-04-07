import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

/**
 * Manage Fonts admin page — not yet implemented.
 * The backend /api/v1/admin/families endpoints don't exist yet.
 * Font management is handled through the review workflow (ReviewDetailPage).
 */
export default function ManageFontsPage() {
  const { t } = useTranslation();
  return (
    <>
      <Helmet><title>{t('admin.manageFonts')} — Fonthabesha</title></Helmet>
      <h1 className="portal-page-title">{t('admin.manageFonts')}</h1>
      <div className="dashboard-empty">
        <span className="dashboard-empty__icon" aria-hidden="true">🔤</span>
        <p>{t('placeholder.manageFonts')}</p>
      </div>
    </>
  );
}
