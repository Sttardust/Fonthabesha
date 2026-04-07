import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { adminApi } from '@/lib/api/admin';
import { bilingualValue } from '@/lib/utils/bilingualValue';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorState from '@/components/shared/ErrorState';
import Pagination from '@/components/shared/Pagination';
import type { ProcessingFailure } from '@/lib/types';

// ── Failure row ───────────────────────────────────────────────────────────────

function FailureRow({
  failure,
  onRetry,
  retrying,
}: {
  failure: ProcessingFailure;
  onRetry: (id: string) => void;
  retrying: boolean;
}) {
  const { t } = useTranslation();
  const name = bilingualValue(failure.familyName);

  return (
    <tr className="vocab-table__row vocab-table__row--error">
      <td className="vocab-table__cell">
        <Link
          to={`/admin/review/${failure.submissionId}`}
          className="vocab-table__link"
        >
          {name || failure.submissionId}
        </Link>
      </td>
      <td className="vocab-table__cell vocab-table__cell--muted">
        {failure.contributorEmail}
      </td>
      <td className="vocab-table__cell vocab-table__cell--error">
        {failure.errorMessage ?? t('admin.failures.unknownError')}
      </td>
      <td className="vocab-table__cell vocab-table__cell--muted">
        {new Date(failure.failedAt).toLocaleDateString()}
      </td>
      <td className="vocab-table__cell vocab-table__cell--actions">
        <button
          type="button"
          className="btn btn--outline btn--sm"
          onClick={() => onRetry(failure.submissionId)}
          disabled={retrying}
        >
          {retrying ? t('admin.failures.retrying') : t('admin.failures.retry')}
        </button>
        <Link
          to={`/admin/review/${failure.submissionId}`}
          className="btn btn--ghost btn--sm"
        >
          {t('common.view')}
        </Link>
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FailuresPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-failures', page],
    queryFn: () => adminApi.failures(page),
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => adminApi.retryFailure(id),
    onMutate: (id) => setRetryingId(id),
    onSettled: () => {
      setRetryingId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-failures'] });
    },
  });

  const failures = data?.data ?? [];

  return (
    <>
      <Helmet>
        <title>{t('admin.failures.title')} — Fonthabesha</title>
      </Helmet>

      <div className="page-container">
        <header className="page-header">
          <h1 className="page-title">{t('admin.failures.title')}</h1>
          {data && (
            <p className="page-subtitle">
              {data.total} {t('admin.failures.items')}
            </p>
          )}
        </header>

        {isLoading && <LoadingSpinner label={t('common.loading')} />}
        {isError && (
          <ErrorState message={t('common.error')} onRetry={() => refetch()} />
        )}

        {!isLoading && !isError && failures.length === 0 && (
          <div className="empty-state empty-state--success">
            <p>{t('admin.failures.empty')}</p>
          </div>
        )}

        {failures.length > 0 && (
          <>
            <div className="vocab-table-wrap">
              <table className="vocab-table">
                <thead>
                  <tr>
                    <th>{t('admin.failures.family')}</th>
                    <th>{t('admin.failures.contributor')}</th>
                    <th>{t('admin.failures.error')}</th>
                    <th>{t('admin.failures.date')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {failures.map((f) => (
                    <FailureRow
                      key={f.submissionId}
                      failure={f}
                      onRetry={(id) => retryMutation.mutate(id)}
                      retrying={retryingId === f.submissionId}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={data?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </>
  );
}
