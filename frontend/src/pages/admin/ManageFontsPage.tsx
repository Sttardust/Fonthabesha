import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { apiClient } from '@/lib/api/client';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorState from '@/components/shared/ErrorState';
import Pagination from '@/components/shared/Pagination';
import type { FontFamilySummary, PaginatedResponse } from '@/lib/types';

const ADMIN_FAMILIES_PREFIX = '/api/v1/admin/families';

interface AdminFamilyRow extends FontFamilySummary {
  status?: string;
}

export default function ManageFontsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-families', page, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '25' });
      if (search) params.set('q', search);
      return apiClient.get<PaginatedResponse<AdminFamilyRow>>(`${ADMIN_FAMILIES_PREFIX}?${params}`);
    },
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) => apiClient.post(`${ADMIN_FAMILIES_PREFIX}/${id}/archive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-families'] }),
  });

  const restoreMut = useMutation({
    mutationFn: (id: string) => apiClient.post(`${ADMIN_FAMILIES_PREFIX}/${id}/restore`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-families'] }),
  });

  const families = data?.items ?? [];
  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <>
      <Helmet><title>{t('admin.manageFonts')} — Fonthabesha</title></Helmet>
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('admin.manageFonts')}</h1>
        <div className="portal-page-header__actions">
          <input
            type="search"
            className="form-input form-input--compact"
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {isLoading && <LoadingSpinner label={t('common.loading')} />}
      {isError && <ErrorState message={t('common.error')} onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <>
          <table className="vocab-table">
            <thead>
              <tr className="vocab-table__head">
                <th className="vocab-table__th">{t('admin.family')}</th>
                <th className="vocab-table__th">{t('admin.category')}</th>
                <th className="vocab-table__th">{t('admin.styles')}</th>
                <th className="vocab-table__th">{t('admin.status')}</th>
                <th className="vocab-table__th">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {families.length === 0 && (
                <tr><td colSpan={5} className="vocab-table__empty">{t('admin.noFonts')}</td></tr>
              )}
              {families.map((fam) => (
                <tr key={fam.id} className="vocab-table__row">
                  <td className="vocab-table__cell">
                    <Link to={`/fonts/${fam.slug}`} className="text-link" target="_blank">
                      {fam.name.en ?? fam.name.am ?? fam.slug}
                    </Link>
                  </td>
                  <td className="vocab-table__cell">{fam.category ?? '—'}</td>
                  <td className="vocab-table__cell">{fam.numberOfStyles}</td>
                  <td className="vocab-table__cell">
                    <span className={`badge badge--${fam.status === 'archived' ? 'error' : 'success'}`}>
                      {fam.status ?? 'active'}
                    </span>
                  </td>
                  <td className="vocab-table__cell vocab-table__cell--actions">
                    {fam.status === 'archived' ? (
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => restoreMut.mutate(fam.id)}
                        disabled={restoreMut.isPending}
                      >
                        {t('common.restore')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        onClick={() => {
                          if (window.confirm(`Archive "${fam.name.en}"?`)) {
                            archiveMut.mutate(fam.id);
                          }
                        }}
                        disabled={archiveMut.isPending}
                      >
                        {t('common.archive')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </>
  );
}
