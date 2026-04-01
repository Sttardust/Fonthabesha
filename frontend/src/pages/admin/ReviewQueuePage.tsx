import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { bilingualValue } from '@/lib/utils/bilingualValue';
import type { SubmissionStatus } from '@/lib/types';

const STATUS_FILTERS: Array<{ value: SubmissionStatus | undefined; label: string }> = [
  { value: undefined, label: 'All' },
  { value: 'pending_review', label: 'Pending' },
  { value: 'changes_requested', label: 'Changes Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function ReviewQueuePage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<SubmissionStatus | undefined>('pending_review');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'review', status, page],
    queryFn: () => adminApi.reviewQueue(status, page),
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
            onClick={() => { setStatus(f.value); setPage(1); }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <p>{t('common.loading')}</p>}
      {isError && <p>{t('common.error')}</p>}

      {data && (
        <>
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
              {data.data.map((item) => (
                <tr key={item.submissionId}>
                  <td>{bilingualValue(item.familyName)}</td>
                  <td>{item.contributorEmail}</td>
                  <td>
                    <span className={`badge badge--status badge--${item.status}`}>
                      {t(`contributor.status.${item.status}`)}
                    </span>
                  </td>
                  <td>{new Date(item.submittedAt).toLocaleDateString()}</td>
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

          {data.totalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="pagination__btn"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('common.previous')}
              </button>
              <span className="pagination__info">
                {t('common.page')} {page} {t('common.of')} {data.totalPages}
              </span>
              <button
                type="button"
                className="pagination__btn"
                disabled={page === data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
