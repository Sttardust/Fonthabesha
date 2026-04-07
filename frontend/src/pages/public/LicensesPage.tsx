import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/lib/api/catalog';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorState from '@/components/shared/ErrorState';
import type { License } from '@/lib/types';

// ── Permission check icon ─────────────────────────────────────────────────────

function Check({ ok }: { ok: boolean }) {
  return (
    <span
      className={ok ? 'license-check license-check--yes' : 'license-check license-check--no'}
      aria-label={ok ? 'Yes' : 'No'}
    >
      {ok ? '✓' : '✗'}
    </span>
  );
}

// ── License card ──────────────────────────────────────────────────────────────

function LicenseCard({ license }: { license: License }) {
  const { t } = useTranslation();

  return (
    <div className="license-card">
      <div className="license-card__header">
        <h2 className="license-card__title">{license.name}</h2>
        <span className="badge license-card__badge">{license.code}</span>
      </div>

      {license.summary && (
        <p className="license-card__summary">{license.summary}</p>
      )}

      <table className="license-card__table">
        <tbody>
          <tr>
            <td>{t('licenses.redistribute')}</td>
            <td><Check ok={license.allowsRedistribution} /></td>
          </tr>
          <tr>
            <td>{t('licenses.commercial')}</td>
            <td><Check ok={license.allowsCommercialUse} /></td>
          </tr>
          <tr>
            <td>{t('licenses.attribution')}</td>
            <td><Check ok={license.requiresAttribution} /></td>
          </tr>
        </tbody>
      </table>

      {license.url && (
        <a
          href={license.url}
          target="_blank"
          rel="noopener noreferrer"
          className="license-card__link"
        >
          {t('licenses.readFull')} →
        </a>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LicensesPage() {
  const { t } = useTranslation();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['catalog-filters-licenses'],
    queryFn: () => catalogApi.filters(),
    staleTime: 10 * 60 * 1000, // 10 min — licenses rarely change
  });

  const licenses = data?.licenses ?? [];

  return (
    <>
      <Helmet>
        <title>{t('nav.licenses')} — Fonthabesha</title>
      </Helmet>

      <div className="page-container page-container--narrow">
        <header className="page-header">
          <h1 className="page-title">{t('licenses.title')}</h1>
          <p className="licenses-intro">{t('licenses.intro')}</p>
        </header>

        {isLoading && <LoadingSpinner label={t('common.loading')} />}

        {isError && (
          <ErrorState
            message={t('common.error')}
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !isError && licenses.length === 0 && (
          <p className="empty-state">{t('licenses.empty')}</p>
        )}

        {licenses.length > 0 && (
          <div className="licenses-list">
            {licenses.map((lic) => (
              <LicenseCard key={lic.code} license={lic} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
