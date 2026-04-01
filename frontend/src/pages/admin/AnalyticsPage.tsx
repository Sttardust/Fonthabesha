/**
 * AnalyticsPage — review activity and submission funnel analytics.
 *
 * Uses GET /api/v1/admin/reviews/analytics?from=...&to=...
 */
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api/admin';

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

// ── Components ────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat-card">
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__label">{label}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const RANGES = [
  { label: '7 days',  days: 7  },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [days, setDays] = useState(30);

  const from = daysAgo(days);
  const to   = todayIso();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'review-analytics', days],
    queryFn: () => adminApi.analytics(from, to),
    staleTime: 5 * 60_000,
  });

  return (
    <>
      <Helmet><title>{t('admin.analytics.title')} — Fonthabesha</title></Helmet>

      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('admin.analytics.title')}</h1>
        <div className="analytics-period-select">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              className={`filter-item${days === r.days ? ' filter-item--active' : ''}`}
              onClick={() => setDays(r.days)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p>{t('common.loading')}</p>}
      {isError   && <p className="form-error">{t('common.error')}</p>}

      {data && (
        <>
          {/* ── Current queue snapshot ── */}
          <h2 className="analytics-section__title" style={{ marginTop: '1.5rem' }}>
            Current Queue
          </h2>
          <div className="stat-grid">
            <StatCard label="Needs Review"      value={data.queue.needsReview} />
            <StatCard label="Processing Failed" value={data.queue.processingFailed} />
            <StatCard label="Changes Requested" value={data.queue.changesRequested} />
          </div>

          {/* ── Period totals ── */}
          <h2 className="analytics-section__title" style={{ marginTop: '1.5rem' }}>
            Activity (last {days} days)
          </h2>
          <div className="stat-grid">
            <StatCard label="Submitted"         value={data.totals.submitted} />
            <StatCard label="Approved"          value={data.totals.approved} />
            <StatCard label="Rejected"          value={data.totals.rejected} />
            <StatCard label="Changes Requested" value={data.totals.requestChanges} />
            <StatCard label="Processing Failed" value={data.totals.processingFailed} />
            <StatCard label="Reprocessed"       value={data.totals.reprocessed} />
          </div>

          {/* ── Turnaround ── */}
          {data.turnaround.averageHours != null && (
            <>
              <h2 className="analytics-section__title" style={{ marginTop: '1.5rem' }}>
                Review Turnaround
              </h2>
              <div className="stat-grid">
                <StatCard
                  label="Avg. Review Time"
                  value={`${Math.round(data.turnaround.averageHours)}h`}
                />
                <StatCard
                  label="Reviewed Submissions"
                  value={data.turnaround.reviewedSubmissionCount}
                />
              </div>
            </>
          )}

          {/* ── Reviewer breakdown ── */}
          {data.reviewerBreakdown.length > 0 && (
            <>
              <h2 className="analytics-section__title" style={{ marginTop: '1.5rem' }}>
                Reviewer Activity
              </h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reviewer</th>
                    <th>Approved</th>
                    <th>Rejected</th>
                    <th>Changes</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reviewerBreakdown.map((entry) => {
                    const total =
                      entry.decisionCounts.approved +
                      entry.decisionCounts.rejected +
                      entry.decisionCounts.requestChanges;
                    return (
                      <tr key={entry.reviewer.id}>
                        <td>{entry.reviewer.displayName ?? entry.reviewer.email}</td>
                        <td>{entry.decisionCounts.approved}</td>
                        <td>{entry.decisionCounts.rejected}</td>
                        <td>{entry.decisionCounts.requestChanges}</td>
                        <td><strong>{total}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </>
  );
}
