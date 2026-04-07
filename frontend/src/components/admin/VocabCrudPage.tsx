/**
 * VocabCrudPage
 *
 * A reusable CRUD table for simple vocabulary entries (Publishers, Designers,
 * Categories). Receives async handlers so each page just wires up the right
 * adminApi methods.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorState from '@/components/shared/ErrorState';
import Pagination from '@/components/shared/Pagination';
import type { VocabEntry, PaginatedResponse } from '@/lib/types';

// ── Types ──────────────────────────────────────────────────────────────────────

interface VocabCrudPageProps {
  /** Page <title> */
  title: string;
  /** i18n key prefix used for labels like `{prefix}.empty` */
  i18nPrefix: string;
  /** Query key array for TanStack Query caching */
  queryKey: string[];
  /** Fetch all entries */
  listFn: (page: number) => Promise<PaginatedResponse<VocabEntry>>;
  /** Create a new entry */
  createFn: (payload: { name: string; description?: string }) => Promise<VocabEntry>;
  /** Update an existing entry */
  updateFn: (id: string, payload: { name?: string; description?: string }) => Promise<VocabEntry>;
  /** Delete an entry */
  deleteFn: (id: string) => Promise<void>;
}

// ── Inline edit / create form ─────────────────────────────────────────────────

function EntryForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial?: { name: string; description?: string };
  onSave: (name: string, description: string) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  return (
    <tr className="vocab-table__row vocab-table__row--editing">
      <td className="vocab-table__cell" colSpan={2}>
        <div className="vocab-inline-form">
          <input
            type="text"
            className="form-input form-input--compact"
            placeholder={t('admin.vocab.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <input
            type="text"
            className="form-input form-input--compact"
            placeholder={t('admin.vocab.descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </td>
      <td className="vocab-table__cell vocab-table__cell--actions">
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={!name.trim() || isSaving}
          onClick={() => onSave(name.trim(), description.trim())}
        >
          {isSaving ? t('common.saving') : t('common.save')}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onCancel}
        >
          {t('common.cancel')}
        </button>
      </td>
    </tr>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function VocabCrudPage({
  title,
  i18nPrefix,
  queryKey,
  listFn,
  createFn,
  updateFn,
  deleteFn,
}: VocabCrudPageProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...queryKey, page],
    queryFn: () => listFn(page),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey });

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => { setCreatingNew(false); invalidate(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string; description?: string } }) =>
      updateFn(id, payload),
    onSuccess: () => { setEditingId(null); invalidate(); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => { setDeleteTargetId(null); invalidate(); },
  });

  const entries = data?.items ?? [];

  return (
    <>
      <Helmet>
        <title>{title} — Fonthabesha</title>
      </Helmet>

      <div className="page-container">
        <header className="page-header page-header--row">
          <div>
            <h1 className="page-title">{title}</h1>
            {data && (
              <p className="page-subtitle">
                {data.pagination.totalItems} {t(`${i18nPrefix}.items`)}
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => { setCreatingNew(true); setEditingId(null); }}
            disabled={creatingNew}
          >
            + {t(`${i18nPrefix}.new`)}
          </button>
        </header>

        {isLoading && <LoadingSpinner label={t('common.loading')} />}
        {isError && <ErrorState message={t('common.error')} onRetry={() => refetch()} />}

        {!isLoading && !isError && (
          <div className="vocab-table-wrap">
            <table className="vocab-table">
              <thead>
                <tr>
                  <th>{t('admin.vocab.name')}</th>
                  <th>{t('admin.vocab.description')}</th>
                  <th>{t('admin.vocab.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {/* New entry row */}
                {creatingNew && (
                  <EntryForm
                    onSave={(name, description) =>
                      createMutation.mutate({ name, description: description || undefined })
                    }
                    onCancel={() => setCreatingNew(false)}
                    isSaving={createMutation.isPending}
                  />
                )}

                {entries.length === 0 && !creatingNew && (
                  <tr>
                    <td colSpan={3} className="vocab-table__empty">
                      {t(`${i18nPrefix}.empty`)}
                    </td>
                  </tr>
                )}

                {entries.map((entry) =>
                  editingId === entry.id ? (
                    <EntryForm
                      key={entry.id}
                      initial={{ name: entry.name, description: entry.description ?? '' }}
                      onSave={(name, description) =>
                        updateMutation.mutate({
                          id: entry.id,
                          payload: { name, description: description || undefined },
                        })
                      }
                      onCancel={() => setEditingId(null)}
                      isSaving={updateMutation.isPending}
                    />
                  ) : (
                    <tr key={entry.id} className="vocab-table__row">
                      <td className="vocab-table__cell vocab-table__cell--name">
                        {entry.name}
                        {entry.slug && (
                          <span className="vocab-table__slug">/{entry.slug}</span>
                        )}
                      </td>
                      <td className="vocab-table__cell vocab-table__cell--muted">
                        {entry.description ?? '—'}
                      </td>
                      <td className="vocab-table__cell vocab-table__cell--actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => { setEditingId(entry.id); setCreatingNew(false); }}
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger-ghost btn--sm"
                          onClick={() => {
                            if (window.confirm(
                              t('admin.vocab.deleteConfirm', { name: entry.name })
                            )) {
                              setDeleteTargetId(entry.id);
                              deleteMutation.mutate(entry.id);
                            }
                          }}
                          disabled={deleteMutation.isPending && deleteTargetId === entry.id}
                        >
                          {deleteMutation.isPending && deleteTargetId === entry.id
                            ? t('common.deleting')
                            : t('common.delete')}
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={data?.pagination.totalPages ?? 1}
          onPageChange={setPage}
        />
      </div>

      {/* Inline confirm for delete — simple window.confirm to avoid Radix trigger complexity */}
      {/* Full Radix ConfirmDialog requires a trigger element; for programmatic delete we use a
          lightweight confirm pattern here. The dedicated ReviewDetailPage uses the full dialog. */}
    </>
  );
}
