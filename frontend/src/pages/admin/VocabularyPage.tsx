/**
 * VocabularyPage — CRUD for canonical font tags.
 *
 * Features:
 *  - List all tags with usage count, sorted by usage desc
 *  - Inline "add tag" form at top
 *  - Inline rename (click tag name to edit in-place)
 *  - Delete with ConfirmDialog (warns when usageCount > 0)
 *  - Search/filter tags client-side
 */
import { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { vocabularyApi } from '@/lib/api/vocabulary';
import { ApiError } from '@/lib/api/client';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import type { VocabularyTag } from '@/lib/types';

// ── Inline editable tag row ────────────────────────────────────────────────────

function TagRow({
  tag,
  onRename,
  onDelete,
  isDeleting,
}: {
  tag: VocabularyTag;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tag.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(tag.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== tag.name) {
      onRename(tag.id, trimmed);
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft(tag.name);
    setEditing(false);
  };

  return (
    <li className="vocab-row">
      <div className="vocab-row__name">
        {editing ? (
          <input
            ref={inputRef}
            className="form-input form-input--sm vocab-row__input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            onBlur={commitEdit}
            maxLength={40}
          />
        ) : (
          <button
            type="button"
            className="vocab-row__tag-btn"
            onClick={startEdit}
            title="Click to rename"
          >
            {tag.name}
          </button>
        )}
      </div>

      <div className="vocab-row__usage">
        <span className="vocab-row__count" title={`${tag.usageCount} font families`}>
          {tag.usageCount}
        </span>
        <span className="vocab-row__count-label">
          {tag.usageCount === 1 ? 'font' : 'fonts'}
        </span>
      </div>

      <div className="vocab-row__actions">
        {editing ? (
          <>
            <button type="button" className="btn btn--sm btn--primary" onClick={commitEdit}>
              Save
            </button>
            <button type="button" className="btn btn--sm btn--ghost" onClick={cancelEdit}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={startEdit}
              aria-label={`Rename tag "${tag.name}"`}
            >
              Rename
            </button>
            <ConfirmDialog
              trigger={
                <button
                  type="button"
                  className="btn btn--sm btn--danger"
                  disabled={isDeleting}
                  aria-label={`Delete tag "${tag.name}"`}
                >
                  Delete
                </button>
              }
              title={`Delete tag "${tag.name}"?`}
              description={
                tag.usageCount > 0
                  ? `This tag is used by ${tag.usageCount} font ${tag.usageCount === 1 ? 'family' : 'families'}. Deleting it will remove it from those fonts.`
                  : 'This tag is not used by any fonts. It will be permanently deleted.'
              }
              confirmLabel="Delete tag"
              confirmVariant="danger"
              isPending={isDeleting}
              onConfirm={() => onDelete(tag.id)}
            />
          </>
        )}
      </div>
    </li>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function VocabularyPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [newTag, setNewTag]     = useState('');
  const [filter, setFilter]     = useState('');
  const [addError, setAddError] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'vocabulary'],
    queryFn: () => vocabularyApi.list(1, 200),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'vocabulary'] });

  const createMutation = useMutation({
    mutationFn: (name: string) => vocabularyApi.create(name),
    onSuccess: () => { setNewTag(''); setAddError(''); invalidate(); },
    onError: (err) => {
      setAddError(err instanceof ApiError ? err.message : t('common.error'));
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      vocabularyApi.update(id, name),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vocabularyApi.delete(id),
    onSuccess: invalidate,
  });

  const handleAdd = () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  };

  // Client-side filtering
  const tags = (data?.data ?? []).filter((tag) =>
    filter ? tag.name.toLowerCase().includes(filter.toLowerCase()) : true,
  );

  // Sort: most-used first
  const sorted = [...tags].sort((a, b) => b.usageCount - a.usageCount);

  return (
    <>
      <Helmet><title>{t('admin.vocabulary.title')} — Fonthabesha</title></Helmet>

      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('admin.vocabulary.title')}</h1>
        {data && (
          <span className="portal-page-subtitle">
            {data.total} {data.total === 1 ? 'tag' : 'tags'} total
          </span>
        )}
      </div>

      {/* ── Add tag form ── */}
      <div className="vocab-add-form">
        <div className="vocab-add-form__input-wrap">
          <input
            className={`form-input${addError ? ' form-input--error' : ''}`}
            placeholder={t('admin.vocabulary.newTagPlaceholder')}
            value={newTag}
            maxLength={40}
            onChange={(e) => { setNewTag(e.target.value); setAddError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          />
          {addError && <p className="form-error">{addError}</p>}
        </div>
        <button
          type="button"
          className="btn btn--primary"
          disabled={!newTag.trim() || createMutation.isPending}
          onClick={handleAdd}
        >
          {createMutation.isPending ? 'Adding…' : t('admin.vocabulary.addTag')}
        </button>
      </div>

      {/* ── Filter ── */}
      {data && data.data.length > 8 && (
        <div className="vocab-filter">
          <input
            className="form-input form-input--sm"
            placeholder="Filter tags…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {filter && (
            <span className="vocab-filter__count">
              {sorted.length} / {data.data.length}
            </span>
          )}
        </div>
      )}

      {isLoading && <p>{t('common.loading')}</p>}
      {isError   && <p className="form-error">{t('common.error')}</p>}

      {data && data.data.length === 0 && (
        <div className="dashboard-empty">
          <span className="dashboard-empty__icon" aria-hidden="true">🏷️</span>
          <p>No tags yet. Add the first one above.</p>
        </div>
      )}

      {sorted.length > 0 && (
        <ul className="vocab-list" aria-label="Tag vocabulary">
          {sorted.map((tag) => (
            <TagRow
              key={tag.id}
              tag={tag}
              onRename={(id, name) => renameMutation.mutate({ id, name })}
              onDelete={(id) => deleteMutation.mutate(id)}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </ul>
      )}

      {filter && sorted.length === 0 && data && data.data.length > 0 && (
        <p className="vocab-no-match">No tags matching "{filter}".</p>
      )}
    </>
  );
}
