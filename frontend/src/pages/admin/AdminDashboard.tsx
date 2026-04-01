/**
 * AdminDashboard — review summary overview + recent pending queue.
 */
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';

export default function AdminDashboard() {
  const { t } = useTranslation();

  // reviewSummary returns AdminReviewSummary (counts per status)
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin', 'reviewSummary'],
    queryFn: adminApi.reviewSummary,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Recent needs_review queue — top 5
  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ['admin', 'review', 'needs_review'],
    queryFn: () => adminApi.reviewQueue('needs_review'),
    staleTime: 30_000,
  });

  const pendingCount = summary?.counts.needsReview ?? 0;
  const recentQueue  = queue?.slice(0, 5) ?? [];

  return (
    <>
      <Helmet><title>{t('admin.dashboard')} — Fonthabesha</title></Helmet>
      <h1 className="portal-page-title">{t('admin.dashboard')}</h1>

      {/* ── Stats grid ── */}
      {summaryLoading && <div className="stat-grid stat-grid--loading" aria-busy="true" />}

      {summary && (
        <div className="stat-grid">
          <div className={`stat-card${summary.counts.needsReview > 0 ? ' stat-card--accent' : ''}`}>
            <span className="stat-card__value">{summary.counts.needsReview}</span>
            <span className="stat-card__label">Needs Review</span>
            {summary.counts.needsReview > 0 && (
              <span className="stat-card__cta">
                <Link to="/admin/review" className="stat-card__link">Review now →</Link>
              </span>
            )}
          </div>
          <div className="stat-card">
            <span className="stat-card__value">{summary.counts.changesRequested}</span>
            <span className="stat-card__label">Changes Requested</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__value">{summary.counts.processingFailed}</span>
            <span className="stat-card__label">Processing Failed</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__value">{summary.counts.approved7d}</span>
            <span className="stat-card__label">Approved (7d)</span>
          </div>
        </div>
      )}

      {/* ── Quick links ── */}
      <div className="portal-quick-links">
        <Link to="/admin/review" className="btn btn--primary">
          {t('admin.reviewQueue')}
          {pendingCount > 0 && (
            <span className="badge badge--accent badge--count">{pendingCount}</span>
          )}
        </Link>
      </div>

      {/* ── Recent pending submissions ── */}
      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <h2 className="dashboard-section__title">Pending Review</h2>
          <Link to="/admin/review" className="dashboard-section__more">View all →</Link>
        </div>

        {queueLoading && <p className="dashboard-section__loading">{t('common.loading')}</p>}

        {queue && recentQueue.length === 0 && (
          <div className="dashboard-empty">
            <span className="dashboard-empty__icon" aria-hidden="true">✅</span>
            <p>All clear — no pending submissions.</p>
          </div>
        )}

        {recentQueue.length > 0 && (
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
              {recentQueue.map((item) => (
                <tr key={item.submissionId}>
                  <td className="data-table__family">
                    {item.name.am ?? item.name.en ?? '—'}
                  </td>
                  <td className="data-table__email">{item.submittedBy.email}</td>
                  <td>
                    {item.submittedAt
                      ? new Date(item.submittedAt).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric',
                        })
                      : '—'}
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
