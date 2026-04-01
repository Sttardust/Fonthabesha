/**
 * AdminDashboard — stats overview + quick links + recent pending queue.
 */
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { bilingualValue } from '@/lib/utils/bilingualValue';

export default function AdminDashboard() {
  const { t } = useTranslation();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.stats,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Recent pending queue — top 5
  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ['admin', 'review', 'pending_review', 1],
    queryFn: () => adminApi.reviewQueue('pending_review', 1, 5),
    staleTime: 30_000,
  });

  return (
    <>
      <Helmet><title>{t('admin.dashboard')} — Fonthabesha</title></Helmet>
      <h1 className="portal-page-title">{t('admin.dashboard')}</h1>

      {/* ── Stats grid ── */}
      {statsLoading && <div className="stat-grid stat-grid--loading" aria-busy="true" />}

      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-card__value">{stats.totalFamilies.toLocaleString()}</span>
            <span className="stat-card__label">{t('admin.stats.totalFamilies')}</span>
          </div>
          <div className={`stat-card${stats.pendingReviews > 0 ? ' stat-card--accent' : ''}`}>
            <span className="stat-card__value">{stats.pendingReviews}</span>
            <span className="stat-card__label">{t('admin.stats.pendingReviews')}</span>
            {stats.pendingReviews > 0 && (
              <span className="stat-card__cta">
                <Link to="/admin/review" className="stat-card__link">Review now →</Link>
              </span>
            )}
          </div>
          <div className="stat-card">
            <span className="stat-card__value">{stats.totalDownloads.toLocaleString()}</span>
            <span className="stat-card__label">{t('admin.stats.totalDownloads')}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__value">{stats.activeContributors}</span>
            <span className="stat-card__label">{t('admin.stats.activeContributors')}</span>
          </div>
        </div>
      )}

      {/* ── Quick links ── */}
      <div className="portal-quick-links">
        <Link to="/admin/review" className="btn btn--primary">
          {t('admin.reviewQueue')}
          {stats && stats.pendingReviews > 0 && (
            <span className="badge badge--accent badge--count">
              {stats.pendingReviews}
            </span>
          )}
        </Link>
        <Link to="/admin/fonts" className="btn btn--secondary">
          {t('admin.manageFonts')}
        </Link>
      </div>

      {/* ── Recent pending submissions ── */}
      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <h2 className="dashboard-section__title">Pending Review</h2>
          <Link to="/admin/review" className="dashboard-section__more">View all →</Link>
        </div>

        {queueLoading && <p className="dashboard-section__loading">{t('common.loading')}</p>}

        {queue && queue.data.length === 0 && (
          <div className="dashboard-empty">
            <span className="dashboard-empty__icon" aria-hidden="true">✅</span>
            <p>All clear — no pending submissions.</p>
          </div>
        )}

        {queue && queue.data.length > 0 && (
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>Family</th>
                <th>Contributor</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {queue.data.map((item) => (
                <tr key={item.submissionId}>
                  <td className="data-table__family">
                    {bilingualValue(item.familyName)}
                  </td>
                  <td className="data-table__email">{item.contributorEmail}</td>
                  <td>
                    {new Date(item.submittedAt).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric',
                    })}
                  </td>
                  <td>
                    <Link
                      to={`/admin/review/${item.submissionId}`}
                      className="btn btn--sm btn--primary"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
