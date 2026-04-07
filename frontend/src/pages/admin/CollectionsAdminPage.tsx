import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { apiClient } from '@/lib/api/client';
import CollectionEditModal from '@/components/admin/CollectionEditModal';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorState from '@/components/shared/ErrorState';

interface AdminCollection {
  id: string;
  title: string;
  description?: string | null;
  isPublic: boolean;
  isFeatured?: boolean;
  familyCount?: number;
  status?: string;
}

const PREFIX = '/api/v1/admin/collections';

export default function CollectionsAdminPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editTarget, setEditTarget] = useState<AdminCollection | null | 'new'>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-collections'],
    queryFn: () => apiClient.get<AdminCollection[]>(PREFIX),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`${PREFIX}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-collections'] }),
  });

  const collections = data ?? [];

  return (
    <>
      <Helmet><title>{t('admin.collections.title')} — Fonthabesha</title></Helmet>
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('admin.collections.title')}</h1>
        <button type="button" className="btn btn--primary" onClick={() => setEditTarget('new')}>
          + {t('admin.collections.new')}
        </button>
      </div>

      {isLoading && <LoadingSpinner label={t('common.loading')} />}
      {isError && <ErrorState message={t('common.error')} onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <table className="vocab-table">
          <thead>
            <tr className="vocab-table__head">
              <th className="vocab-table__th">{t('admin.collections.name')}</th>
              <th className="vocab-table__th">{t('admin.collections.fonts')}</th>
              <th className="vocab-table__th">{t('admin.collections.public')}</th>
              <th className="vocab-table__th">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {collections.length === 0 && (
              <tr><td colSpan={4} className="vocab-table__empty">{t('collections.empty')}</td></tr>
            )}
            {collections.map((col) => (
              <tr key={col.id} className="vocab-table__row">
                <td className="vocab-table__cell">{col.title}</td>
                <td className="vocab-table__cell">{col.familyCount ?? 0}</td>
                <td className="vocab-table__cell">
                  <span className={`badge badge--${col.isPublic ? 'success' : 'neutral'}`}>
                    {col.isPublic ? t('common.yes') : t('common.no')}
                  </span>
                </td>
                <td className="vocab-table__cell vocab-table__cell--actions">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => setEditTarget(col)}
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    onClick={() => {
                      if (window.confirm(`Delete "${col.title}"?`)) {
                        deleteMut.mutate(col.id);
                      }
                    }}
                    disabled={deleteMut.isPending}
                  >
                    {t('common.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editTarget !== null && (
        <CollectionEditModal
          initialData={editTarget === 'new' ? undefined : editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['admin-collections'] });
            setEditTarget(null);
          }}
        />
      )}
    </>
  );
}
