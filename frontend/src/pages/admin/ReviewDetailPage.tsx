/**
 * ReviewDetailPage — full two-column admin review view.
 *
 * Layout:
 *   [sticky action bar — title, status, action buttons]
 *   [two-column grid]
 *     Left (60%):  Style previews · ProcessingWarnings
 *     Right (40%): Submission metadata · ReviewHistory
 *   [full-width review panel]
 *     Notes textarea · Approve / Request Changes / Reject (with ConfirmDialog)
 */
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi } from '@/lib/api/admin';
import { bilingualValue } from '@/lib/utils/bilingualValue';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import ProcessingWarnings from '@/components/admin/ProcessingWarnings';
import ReviewHistory from '@/components/admin/ReviewHistory';
import StylePreviewRow from '@/components/admin/StylePreviewRow';

const CATEGORY_LABELS: Record<string, string> = {
  serif: 'Serif', sans_serif: 'Sans-serif', display: 'Display',
  handwriting: 'Handwriting', monospace: 'Monospace', decorative: 'Decorative',
};
const SCRIPT_LABELS: Record<string, string> = {
  ethiopic: 'Ethiopic only', latin: 'Latin only', both: 'Both',
};

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'submission', id],
    queryFn: () => adminApi.getSubmission(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d) return false;
      return d.styles.some(
        (s) => s.uploadStatus === 'processing' || s.uploadStatus === 'pending',
      )
        ? 5_000
        : false;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  const approveMutation = useMutation({
    mutationFn: () => adminApi.approve(id!, notes || undefined),
    onSuccess: () => { invalidate(); navigate('/admin/review'); },
  });
  const changesMutation = useMutation({
    mutationFn: () => adminApi.requestChanges(id!, notes),
    onSuccess: () => { invalidate(); navigate('/admin/review'); },
  });
  const rejectMutation = useMutation({
    mutationFn: () => adminApi.reject(id!, notes),
    onSuccess: () => { invalidate(); navigate('/admin/review'); },
  });

  const isMutating =
    approveMutation.isPending || changesMutation.isPending || rejectMutation.isPending;
  const mutationError =
    approveMutation.isError || changesMutation.isError || rejectMutation.isError;

  // ── Guards ────────────────────────────────────────────────────────────────
  if (isLoading) return <div className="page-loading">{t('common.loading')}</div>;
  if (isError || !data) {
    return (
      <div className="page-error">
        <p>{t('common.error')}</p>
        <Link to="/admin/review" className="btn btn--secondary">← Back</Link>
      </div>
    );
  }

  const familyName  = bilingualValue(data.familyName);
  const readyStyles = data.styles.filter((s) => s.uploadStatus === 'ready');
  const notesRequired = !notes.trim();

  return (
    <>
      <Helmet><title>Review: {familyName} — Admin</title></Helmet>

      {/* ── Sticky action bar ── */}
      <div className="review-action-bar">
        <div className="review-action-bar__left">
          <Link to="/admin/review" className="review-action-bar__back" aria-label="Back to queue">
            ←
          </Link>
          <h1 className="review-action-bar__title">{familyName}</h1>
          <span className={`badge badge--status badge--${data.status}`}>
            {t(`contributor.status.${data.status}`)}
          </span>
        </div>

        <div className="review-action-bar__actions">
          {/* Approve */}
          <ConfirmDialog
            trigger={
              <button
                type="button"
                className="btn btn--primary"
                disabled={isMutating || readyStyles.length === 0}
              >
                ✓ {t('admin.actions.approve')}
              </button>
            }
            title={`Approve "${familyName}"?`}
            description="This will publish the font family and make it available in the catalog."
            confirmLabel="Approve & Publish"
            confirmVariant="primary"
            isPending={approveMutation.isPending}
            onConfirm={() => approveMutation.mutate()}
          >
            {notes.trim() && (
              <blockquote className="confirm-dialog__notes-preview">{notes}</blockquote>
            )}
          </ConfirmDialog>

          {/* Request Changes */}
          <ConfirmDialog
            trigger={
              <button
                type="button"
                className="btn btn--warning"
                disabled={isMutating || notesRequired}
                title={notesRequired ? 'Add review notes before requesting changes' : undefined}
              >
                ↩ {t('admin.actions.requestChanges')}
              </button>
            }
            title="Request changes?"
            description="The contributor will be notified and can revise their submission."
            confirmLabel="Send feedback"
            confirmVariant="warning"
            isPending={changesMutation.isPending}
            onConfirm={() => changesMutation.mutate()}
          >
            <blockquote className="confirm-dialog__notes-preview">{notes}</blockquote>
          </ConfirmDialog>

          {/* Reject */}
          <ConfirmDialog
            trigger={
              <button
                type="button"
                className="btn btn--danger"
                disabled={isMutating || notesRequired}
                title={notesRequired ? 'Add review notes before rejecting' : undefined}
              >
                ✗ {t('admin.actions.reject')}
              </button>
            }
            title={`Reject "${familyName}"?`}
            description="The contributor will be notified. This action cannot be undone easily."
            confirmLabel="Reject submission"
            confirmVariant="danger"
            isPending={rejectMutation.isPending}
            onConfirm={() => rejectMutation.mutate()}
          >
            <blockquote className="confirm-dialog__notes-preview">{notes}</blockquote>
          </ConfirmDialog>
        </div>
      </div>

      {/* ── Main two-column grid ── */}
      <div className="review-detail-grid">
        {/* ── LEFT: Font previews ── */}
        <main className="review-detail-main">
          <section className="review-section">
            <h2 className="review-section__title">
              Font Styles
              <span className="submission-section__count">
                {readyStyles.length}/{data.styles.length} ready
              </span>
            </h2>

            {data.styles.length === 0 ? (
              <p className="review-empty">No font styles have been uploaded.</p>
            ) : (
              <div className="style-preview-list">
                {data.styles.map((style) => (
                  <StylePreviewRow
                    key={style.id}
                    submissionId={data.id}
                    style={style}
                  />
                ))}
              </div>
            )}
          </section>

          <ProcessingWarnings styles={data.styles} />

          {/* ── Review notes + actions (full width in left column) ── */}
          <section className="review-section review-notes-section">
            <h2 className="review-section__title">Review Notes</h2>
            <textarea
              id="review-notes"
              className="form-input form-textarea review-notes-textarea"
              rows={5}
              placeholder="Add feedback for the contributor (required for Changes / Reject)…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {notesRequired && (
              <p className="form-hint">
                Notes are required before requesting changes or rejecting.
              </p>
            )}
            {mutationError && (
              <p className="form-error form-error--global">{t('common.error')}</p>
            )}
          </section>
        </main>

        {/* ── RIGHT: Metadata + history ── */}
        <aside className="review-detail-aside">
          {/* Submission metadata */}
          <section className="review-section">
            <h2 className="review-section__title">Submission Details</h2>
            <dl className="review-meta">
              <div className="review-meta__row">
                <dt>Family Name</dt>
                <dd>
                  {data.familyName.en && <span>{data.familyName.en}</span>}
                  {data.familyName.am && (
                    <span lang="am" className="review-meta__am">{data.familyName.am}</span>
                  )}
                </dd>
              </div>
              <div className="review-meta__row">
                <dt>Contributor</dt>
                <dd>{data.contributorEmail}</dd>
              </div>
              {data.designerName && (
                <div className="review-meta__row">
                  <dt>Designer</dt>
                  <dd>{bilingualValue(data.designerName)}</dd>
                </div>
              )}
              <div className="review-meta__row">
                <dt>Category</dt>
                <dd>
                  <span className="badge badge--category">
                    {CATEGORY_LABELS[data.category] ?? data.category}
                  </span>
                </dd>
              </div>
              <div className="review-meta__row">
                <dt>Script</dt>
                <dd>{SCRIPT_LABELS[data.scriptSupport] ?? data.scriptSupport}</dd>
              </div>
              <div className="review-meta__row">
                <dt>License</dt>
                <dd>
                  {data.licenseUrl ? (
                    <a
                      href={data.licenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="review-meta__link"
                    >
                      {data.license} ↗
                    </a>
                  ) : (
                    data.license
                  )}
                </dd>
              </div>
              {data.tags.length > 0 && (
                <div className="review-meta__row">
                  <dt>Tags</dt>
                  <dd className="review-meta__tags">
                    {data.tags.map((tag) => (
                      <span key={tag} className="badge badge--tag">{tag}</span>
                    ))}
                  </dd>
                </div>
              )}
              <div className="review-meta__row">
                <dt>Submitted</dt>
                <dd>
                  {new Date(data.createdAt).toLocaleDateString(undefined, {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </dd>
              </div>
            </dl>

            {/* Description */}
            {(data.description?.en || data.description?.am) && (
              <div className="review-description">
                {data.description.en && (
                  <p className="review-description__text">{data.description.en}</p>
                )}
                {data.description.am && (
                  <p className="review-description__text" lang="am">
                    {data.description.am}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Review history */}
          <section className="review-section">
            <h2 className="review-section__title">Review History</h2>
            <ReviewHistory history={data.reviewHistory ?? []} />
          </section>
        </aside>
      </div>
    </>
  );
}
