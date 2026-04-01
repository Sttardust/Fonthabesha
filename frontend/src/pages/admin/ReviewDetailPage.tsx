/**
 * ReviewDetailPage — full two-column admin review view.
 *
 * Layout:
 *   [sticky action bar — title, status, action buttons]
 *   [two-column grid]
 *     Left (60%):  Style previews · ProcessingWarnings
 *     Right (40%): Submission metadata · ReviewHistory
 */
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi } from '@/lib/api/admin';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import ProcessingWarnings from '@/components/admin/ProcessingWarnings';
import ReviewHistory from '@/components/admin/ReviewHistory';
import StylePreviewRow from '@/components/admin/StylePreviewRow';

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'review', id],
    queryFn: () => adminApi.getReview(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d) return false;
      const hasProcessing = d.uploads.some(
        (u) => u.processingStatus === 'queued' || u.processingStatus === 'processing',
      );
      return hasProcessing ? 5_000 : false;
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
  const reprocessMutation = useMutation({
    mutationFn: () => adminApi.reprocess(id!),
    onSuccess: invalidate,
  });

  const isMutating =
    approveMutation.isPending ||
    changesMutation.isPending ||
    rejectMutation.isPending ||
    reprocessMutation.isPending;
  const mutationError =
    approveMutation.isError || changesMutation.isError || rejectMutation.isError;

  if (isLoading) return <div className="page-loading">{t('common.loading')}</div>;
  if (isError || !data) {
    return (
      <div className="page-error">
        <p>{t('common.error')}</p>
        <Link to="/admin/review" className="btn btn--secondary">← Back</Link>
      </div>
    );
  }

  const familyName   = data.family.name.am ?? data.family.name.en ?? data.submissionId;
  const notesRequired = !notes.trim();
  const { permissions } = data;

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
          <span className={`badge badge--status badge--${data.family.status}`}>
            {t(`contributor.status.${data.family.status}`)}
          </span>
        </div>

        <div className="review-action-bar__actions">
          {permissions.canApprove && (
            <ConfirmDialog
              trigger={
                <button type="button" className="btn btn--primary" disabled={isMutating}>
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
          )}

          {permissions.canRequestChanges && (
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
          )}

          {permissions.canReject && (
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
              description="The contributor will be notified. This action is difficult to reverse."
              confirmLabel="Reject submission"
              confirmVariant="danger"
              isPending={rejectMutation.isPending}
              onConfirm={() => rejectMutation.mutate()}
            >
              <blockquote className="confirm-dialog__notes-preview">{notes}</blockquote>
            </ConfirmDialog>
          )}

          {permissions.canReprocess && (
            <button
              type="button"
              className="btn btn--secondary"
              disabled={isMutating}
              onClick={() => reprocessMutation.mutate()}
            >
              ↻ Reprocess
            </button>
          )}
        </div>
      </div>

      {/* ── Main two-column grid ── */}
      <div className="review-detail-grid">
        {/* ── LEFT: Font previews + notes ── */}
        <main className="review-detail-main">
          <section className="review-section">
            <h2 className="review-section__title">
              Font Styles
              <span className="submission-section__count">
                {data.styles.filter((s) => s.status === 'approved').length}/{data.styles.length} approved
              </span>
            </h2>

            {data.styles.length === 0 ? (
              <p className="review-empty">No font styles have been uploaded yet.</p>
            ) : (
              <div className="style-preview-list">
                {data.styles.map((style) => (
                  <StylePreviewRow
                    key={style.id}
                    submissionId={data.submissionId}
                    style={style}
                  />
                ))}
              </div>
            )}
          </section>

          <ProcessingWarnings uploads={data.uploads} />

          {/* Review notes */}
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
          <section className="review-section">
            <h2 className="review-section__title">Submission Details</h2>
            <dl className="review-meta">
              <div className="review-meta__row">
                <dt>Family Name</dt>
                <dd>
                  {data.family.name.en && <span>{data.family.name.en}</span>}
                  {data.family.name.am && (
                    <span lang="am" className="review-meta__am">{data.family.name.am}</span>
                  )}
                </dd>
              </div>
              <div className="review-meta__row">
                <dt>Contributor</dt>
                <dd>{data.submission.submittedBy.email}</dd>
              </div>
              {data.submission.submittedBy.legalFullName && (
                <div className="review-meta__row">
                  <dt>Legal Name</dt>
                  <dd>{data.submission.submittedBy.legalFullName}</dd>
                </div>
              )}
              {data.family.category && (
                <div className="review-meta__row">
                  <dt>Category</dt>
                  <dd>
                    <span className="badge badge--category">{data.family.category.name}</span>
                  </dd>
                </div>
              )}
              {data.family.script && (
                <div className="review-meta__row">
                  <dt>Script</dt>
                  <dd>{data.family.script}</dd>
                </div>
              )}
              {data.submission.declaredLicense && (
                <div className="review-meta__row">
                  <dt>License</dt>
                  <dd>{data.submission.declaredLicense.name} ({data.submission.declaredLicense.code})</dd>
                </div>
              )}
              <div className="review-meta__row">
                <dt>Ownership evidence</dt>
                <dd>
                  <span className="badge">{data.submission.ownershipEvidence.type.replace(/_/g, ' ')}</span>
                  <br />
                  <span style={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>
                    {data.submission.ownershipEvidence.value}
                  </span>
                </dd>
              </div>
              {data.submission.submittedAt && (
                <div className="review-meta__row">
                  <dt>Submitted</dt>
                  <dd>
                    {new Date(data.submission.submittedAt).toLocaleDateString(undefined, {
                      month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </dd>
                </div>
              )}
            </dl>

            {(data.family.description.en || data.family.description.am) && (
              <div className="review-description">
                {data.family.description.en && (
                  <p className="review-description__text">{data.family.description.en}</p>
                )}
                {data.family.description.am && (
                  <p className="review-description__text" lang="am">
                    {data.family.description.am}
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="review-section">
            <h2 className="review-section__title">Review History</h2>
            <ReviewHistory history={data.reviewHistory ?? []} />
          </section>
        </aside>
      </div>
    </>
  );
}
