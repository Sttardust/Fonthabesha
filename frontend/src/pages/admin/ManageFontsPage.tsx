import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { bilingualValue } from '@/lib/utils/bilingualValue';

export default function ManageFontsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'families', page],
    queryFn: () => adminApi.listFamilies(page),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => adminApi.unpublishFamily(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'families'] }),
  });

  return (
    <>
      <Helmet><title>{t('admin.manageFonts')} — Fonthabesha</title></Helmet>
      <h1 className="portal-page-title">{t('admin.manageFonts')}</h1>

      {isLoading && <p>{t('common.loading')}</p>}
      {isError && <p>{t('common.error')}</p>}

      {data && (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Family</th>
                <th>Category</th>
                <th>Downloads</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((family) => (
                <tr key={family.id}>
                  <td>
                    <Link to={`/fonts/${family.slug}`} target="_blank" rel="noopener">
                      {bilingualValue(family.name)}
                    </Link>
                  </td>
                  <td>
                    <span className="badge">{t(`catalog.filters.${family.category}`)}</span>
                  </td>
                  <td>{family.downloadCount.toLocaleString()}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--danger"
                      style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
                      disabled={unpublishMutation.isPending}
                      onClick={() => unpublishMutation.mutate(family.id)}
                    >
                      Unpublish
                    </button>
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
