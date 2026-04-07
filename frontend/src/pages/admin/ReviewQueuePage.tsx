import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import type { SubmissionStatus } from '@/lib/types';

// Real backend SubmissionStatus values used in the review queue
const STATUS_FILTERS: Array<{ value: SubmissionStatus | undefined; label: string }> = [
  { value: undefined,             label: 'All pending' },
  { value: 'needs_review',        label: 'Needs Review' },
  { value: 'changes_requested',   label: 'Changes Requested' },
  { value: 'processing_failed',   label: 'Processing Failed' },
  { value: 'approved',            label: 'Approved' },
  { value: 'rejected',            label: 'Rejected' },
];

export default function ReviewQueuePage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<SubmissionStatus | undefined>(undefined);

  // reviewQueue returns ReviewQueueItem[] (flat array, no pagination)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'review', status],
    queryFn: () => adminApi.reviewQueue(status),
  });

  return (
    <>
      <Helmet><title>{t('admin.reviewQueue')} — Fonthabesha</title></Helmet>
      <h1 className="portal-page-title">{t('admin.reviewQueue')}</h1>

      {/* Status filter chips */}
      <div className="filter-chips">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            className={`filter-item${status === f.value ? ' filter-item--active' : ''}`}
            onClick={() => setStatus(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <p>{t('common.loading')}</p>}
      {isError && <p>{t('common.error')}</p>}

      {data && data.length === 0 && (
        <div className="dashboard-empty">
          <span className="dashboard-empty__icon" aria-hidden="true">✅</span>
          <p>No submissions match this filter.</p>
        </div>
      )}

      {data && data.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Family</th>
              <th>Contributor</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.submissionId}>
                <td>{item.name.am ?? item.name.en ?? '—'}</td>
                <td>{item.submittedBy.email}</td>
                <td>
                  <span className={`badge badge--status badge--${item.status}`}>
                    {t(`contributor.status.${item.status}`)}
                  </span>
                </td>
                <td>
                  {item.submittedAt
                    ? new Date(item.submittedAt).toLocaleDateString()
                    : '—'}
                </td>
                <td>
                  <Link
                    to={`/admin/review/${item.submissionId}`}
                    className="btn btn--secondary"
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
