/**
 * CollectionsAdminPage — full CRUD for admin-managed font collections.
 *
 * Features:
 *  - Paginated list with name, description, visibility, font count, created date
 *  - Create new collection via CollectionEditModal
 *  - Edit existing collection via CollectionEditModal (pre-filled)
 *  - Delete collection via ConfirmDialog
 *  - Link to public collection page (new tab)
 */
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api/admin';
import type { AdminCollection } from '@/lib/types';
import CollectionEditModal from '@/components/admin/CollectionEditModal';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

export default function CollectionsAdminPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminCollection | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'collections', page],
    queryFn: () => adminApi.listCollections(page),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] });

  const createMutation = useMutation({
    mutationFn: adminApi.createCollection,
    onSuccess: () => { invalidate(); setModalOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name: string; description?: string; isPublic: boolean }) =>
      adminApi.updateCollection(id, payload),
    onSuccess: () => { invalidate(); setModalOpen(false); setEditTarget(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCollection(id),
    onSuccess: invalidate,
  });

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openCreate = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit   = (col: AdminCollection) => { setEditTarget(col); setModalOpen(true); };

  const handleModalSubmit = (data: { name: string; description?: string; isPublic: boolean }) => {
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Helmet><title>{t('admin.collections.title')} — Fonthabesha</title></Helmet>

      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('admin.collections.title')}</h1>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          + {t('admin.collections.new')}
        </button>
      </div>

      {isLoading && <p>{t('common.loading')}</p>}
      {isError   && <p className="form-error">{t('common.error')}</p>}

      {data && data.data.length === 0 && (
        <div className="dashboard-empty">
          <span className="dashboard-empty__icon" aria-hidden="true">📚</span>
          <p>No collections yet. Create one to curate font families.</p>
        </div>
      )}

      {data && data.data.length > 0 && (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Visibility</th>
                <th>Fonts</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((col) => (
                <tr key={col.id}>
                  <td>
                    <div className="collection-cell">
                      <span className="collection-cell__name">{col.name}</span>
                      {col.description && (
                        <span className="collection-cell__desc">{col.description}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge--visibility badge--visibility-${col.isPublic ? 'public' : 'private'}`}>
                      {col.isPublic ? '🌐 Public' : '🔒 Private'}
                    </span>
                  </td>
                  <td>{col.familyCount}</td>
                  <td>
                    {new Date(col.createdAt).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </td>
                  <td>
                    <div className="action-cell">
                      <button
                        type="button"
                        className="btn btn--sm btn--secondary"
                        onClick={() => openEdit(col)}
                      >
                        Edit
                      </button>
                      <Link
                        to={`/collections/${col.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn--sm btn--ghost"
                        title="View public page"
                      >
                        ↗
                      </Link>
                      <ConfirmDialog
                        trigger={
                          <button
                            type="button"
                            className="btn btn--sm btn--danger"
                            disabled={deleteMutation.isPending}
                          >
                            Delete
                          </button>
                        }
                        title={`Delete "${col.name}"?`}
                        description={
                          col.familyCount > 0
                            ? `This collection contains ${col.familyCount} font${col.familyCount !== 1 ? 's' : ''}. Deleting it will not remove those fonts from the catalog.`
                            : 'This collection is empty. It will be permanently deleted.'
                        }
                        confirmLabel="Delete collection"
                        confirmVariant="danger"
                        isPending={deleteMutation.isPending}
                        onConfirm={() => deleteMutation.mutate(col.id)}
                      />
                    </div>
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

      {/* Create / Edit modal */}
      <CollectionEditModal
        open={modalOpen}
        onOpenChange={(open) => { setModalOpen(open); if (!open) setEditTarget(null); }}
        initialData={editTarget}
        isPending={isSaving}
        onSubmit={handleModalSubmit}
      />
    </>
  );
}
