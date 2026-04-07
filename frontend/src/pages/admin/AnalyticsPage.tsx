/**
 * AnalyticsPage — review activity and submission funnel analytics.
 *
 * Uses GET /api/v1/admin/reviews/analytics?from=...&to=...
 *
 * Sections:
 *   1. Current queue snapshot
 *   2. Period activity totals
 *   3. Review turnaround time
 *   4. Top issue codes (processing warnings seen most often)
 *   5. Reviewer activity breakdown
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

/** Humanise a SCREAMING_SNAKE_CASE issue code into a readable label. */
function humaniseIssueCode(code: string): string {
  return code
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Components ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className={`stat-card${accent ? ' stat-card--accent' : ''}`}>
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__label">{label}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="analytics-section__title" style={{ marginTop: '2rem', marginBottom: '0.75rem' }}>
      {children}
    </h2>
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
        <div className="analytics-period-select" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              className={`filter-item${days === r.days ? ' filter-item--active' : ''}`}
              aria-pressed={days === r.days}
              onClick={() => setDays(r.days)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="catalog-status" aria-busy="true">
          <span className="catalog-spinner" aria-label={t('common.loading')} />
        </div>
      )}

      {isError && (
        <div className="catalog-status catalog-status--error" role="alert">
          <p>{t('common.error')}</p>
        </div>
      )}

      {data && (
        <>
          {/* ── 1. Current queue snapshot ── */}
          <SectionTitle>Current Queue</SectionTitle>
          <div className="stat-grid">
            <StatCard
              label="Needs Review"
              value={data.queue.needsReview}
              accent={data.queue.needsReview > 0}
            />
            <StatCard label="Processing Failed" value={data.queue.processingFailed} />
            <StatCard label="Changes Requested" value={data.queue.changesRequested} />
          </div>

          {/* ── 2. Period activity totals ── */}
          <SectionTitle>Activity (last {days} days)</SectionTitle>
          <div className="stat-grid">
            <StatCard label="Submitted"         value={data.totals.submitted} />
            <StatCard label="Approved"          value={data.totals.approved} />
            <StatCard label="Rejected"          value={data.totals.rejected} />
            <StatCard label="Changes Requested" value={data.totals.requestChanges} />
            <StatCard label="Processing Failed" value={data.totals.processingFailed} />
            <StatCard label="Reprocessed"       value={data.totals.reprocessed} />
          </div>

          {/* ── 3. Turnaround time ── */}
          {data.turnaround.averageHours != null && (
            <>
              <SectionTitle>Review Turnaround</SectionTitle>
              <div className="stat-grid">
                <StatCard
                  label="Avg. Review Time"
                  value={`${Math.round(data.turnaround.averageHours)}h`}
                />
                <StatCard
                  label="Reviewed Submissions"
                  value={data.turnaround.reviewedSubmissionCount}
                />
                {/* Per-decision turnaround if available */}
                {Object.entries(data.turnaround.averageHoursByDecision).map(
                  ([decision, hours]) =>
                    hours != null ? (
                      <StatCard
                        key={decision}
                        label={`${humaniseIssueCode(decision)} avg.`}
                        value={`${Math.round(hours)}h`}
                      />
                    ) : null,
                )}
              </div>
            </>
          )}

          {/* ── 4. Top issue codes ── */}
          {data.topIssueCodes.length > 0 && (
            <>
              <SectionTitle>Top Processing Issues</SectionTitle>
              <p className="analytics-hint">
                Most frequent processing warnings across all submissions in this period.
              </p>
              <table className="data-table" aria-label="Top processing issues">
                <thead>
                  <tr>
                    <th>Issue Code</th>
                    <th style={{ textAlign: 'right' }}>Occurrences</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topIssueCodes.map((issue) => (
                    <tr key={issue.issueCode}>
                      <td>
                        <code className="issue-code">{issue.issueCode}</code>
                        <span className="issue-code__label">
                          {' '}— {humaniseIssueCode(issue.issueCode)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>{issue.count}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* ── 5. Reviewer activity breakdown ── */}
          {data.reviewerBreakdown.length > 0 && (
            <>
              <SectionTitle>Reviewer Activity</SectionTitle>
              <table className="data-table" aria-label="Reviewer activity">
                <thead>
                  <tr>
                    <th>Reviewer</th>
                    <th style={{ textAlign: 'right' }}>Approved</th>
                    <th style={{ textAlign: 'right' }}>Rejected</th>
                    <th style={{ textAlign: 'right' }}>Changes</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Avg. Time</th>
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
                        <td>
                          {entry.reviewer.displayName ?? entry.reviewer.email}
                          <span className="data-table__secondary">
                            {' '}({entry.reviewer.role})
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{entry.decisionCounts.approved}</td>
                        <td style={{ textAlign: 'right' }}>{entry.decisionCounts.rejected}</td>
                        <td style={{ textAlign: 'right' }}>{entry.decisionCounts.requestChanges}</td>
                        <td style={{ textAlign: 'right' }}><strong>{total}</strong></td>
                        <td style={{ textAlign: 'right' }}>
                          {entry.turnaroundHours.average != null
                            ? `${Math.round(entry.turnaroundHours.average)}h`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}

          {/* Empty state: no activity in this period */}
          {data.totals.submitted === 0 &&
            data.reviewerBreakdown.length === 0 &&
            data.topIssueCodes.length === 0 && (
              <div className="dashboard-empty" style={{ marginTop: '2rem' }}>
                <span className="dashboard-empty__icon" aria-hidden="true">📊</span>
                <p>No review activity in the last {days} days.</p>
              </div>
            )}
        </>
      )}
    </>
  );
}
