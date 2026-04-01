/**
 * SubmissionDetailPage — full contributor view of one submission.
 *
 * Sections:
 *  1. Header — family name, status badge, optional reviewer feedback
 *  2. Upload zone — UploadDropzone (editable states only)
 *  3. Uploaded styles — processing status list with polling
 *  4. Actions — Submit for Review / Back
 */
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contributorApi } from '@/lib/api/contributor';
import { useUpload } from '@/hooks/useUpload';
import UploadDropzone from '@/components/contributor/UploadDropzone';

const UPLOAD_STATUS_LABEL: Record<string, string> = {
  queued:     'Queued',
  processing: 'Processing…',
  completed:  'Ready ✓',
  failed:     'Error',
};

/** Submission statuses where the contributor can still make changes */
const EDITABLE_STATUSES = new Set([
  'draft',
  'uploaded',
  'processing_failed',
  'ready_for_submission',
  'changes_requested',
]);

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['contributor', 'submission', id],
    queryFn: () => contributorApi.get(id!),
    enabled: !!id,
    // Refresh while any upload is still being processed
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d) return false;
      const hasProcessing = d.uploads.some(
        (u) => u.processingStatus === 'queued' || u.processingStatus === 'processing',
      );
      return hasProcessing ? 5_000 : false;
    },
  });

  const upload = useUpload(id ?? '');

  const submitMutation = useMutation({
    mutationFn: () => contributorApi.submit(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contributor', 'submission', id] });
      queryClient.invalidateQueries({ queryKey: ['contributor', 'submissions'] });
    },
  });

  if (isLoading) return <div className="page-loading">{t('common.loading')}</div>;
  if (isError || !data) {
    return (
      <div className="page-error">
        <p>{t('common.error')}</p>
        <Link to="/contributor/submissions" className="btn btn--secondary">
          ← {t('common.back')}
        </Link>
      </div>
    );
  }

  const familyName  = data.family.nameAm ?? data.family.nameEn;
  const isEditable  = EDITABLE_STATUSES.has(data.status);

  // Count completed uploads (backend: processingStatus === 'completed')
  const completedUploadCount = data.analysis.completedUploadCount;
  const canSubmit =
    data.permissions.canSubmitForReview && !upload.isUploading;

  // Latest reviewer feedback from review history
  const latestFeedback = data.review.latestContributorFeedback;

  return (
    <>
      <Helmet>
        <title>{familyName} — {t('contributor.portal')}</title>
      </Helmet>

      {/* ── Header ── */}
      <div className="portal-page-header">
        <div className="portal-page-header__titles">
          <h1 className="portal-page-title">{familyName}</h1>
          {data.family.nameAm && data.family.nameEn && (
            <span className="portal-page-subtitle" lang="en">
              {data.family.nameEn}
            </span>
          )}
        </div>
        <span className={`badge badge--status badge--${data.status}`}>
          {t(`contributor.status.${data.status}`)}
        </span>
      </div>

      {/* ── Reviewer feedback ── */}
      {latestFeedback && (
        <div className="review-notes" role="note">
          <strong>{t('contributor.upload.reviewerNotes')}</strong>
          {latestFeedback.notes && <p>{latestFeedback.notes}</p>}
        </div>
      )}

      {/* ── Processing / blocking issues ── */}
      {data.analysis.blockingIssues.length > 0 && (
        <div className="processing-warnings" role="alert">
          <p><strong>Processing errors require attention:</strong></p>
          <ul>
            {data.analysis.blockingIssues.map((issue, i) => (
              <li key={i}>{issue.message ?? 'Unknown processing error'}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Upload zone (editable states only) ── */}
      {isEditable && (
        <section className="submission-section">
          <h2 className="submission-section__title">
            {t('contributor.upload.addStyles')}
          </h2>
          <UploadDropzone {...upload} disabled={!isEditable} />
        </section>
      )}

      {/* ── Uploads from server ── */}
      {data.uploads.length > 0 && (
        <section className="submission-section">
          <h2 className="submission-section__title">
            {t('contributor.upload.uploadedStyles')}
            <span className="submission-section__count">
              {completedUploadCount}/{data.uploads.length} ready
            </span>
          </h2>

          <ul className="processing-list">
            {data.uploads.map((upload) => (
              <li key={upload.id} className="processing-item">
                <div className="processing-item__info">
                  <span className="processing-item__file">
                    {upload.originalFilename}
                  </span>
                  <span className="processing-item__meta">
                    {(upload.fileSizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="processing-item__status">
                  <span className={`upload-badge upload-badge--${upload.processingStatus}`}>
                    {UPLOAD_STATUS_LABEL[upload.processingStatus] ?? upload.processingStatus}
                  </span>
                  {(upload.processingStatus === 'queued' || upload.processingStatus === 'processing') && (
                    <span className="upload-processing__spinner" aria-label="Processing" />
                  )}
                </div>
                {upload.processingError && (
                  <p className="processing-item__error form-error">
                    {upload.processingError}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Styles (font records linked to uploads) ── */}
      {data.styles.length > 0 && (
        <section className="submission-section">
          <h2 className="submission-section__title">Font Styles</h2>
          <ul className="processing-list">
            {data.styles.map((style) => (
              <li key={style.id} className="processing-item">
                <div className="processing-item__info">
                  <span className="processing-item__name">{style.name}</span>
                  <span className="processing-item__meta">
                    {style.weightClass ?? '—'}{style.isItalic ? ' Italic' : ''}
                  </span>
                </div>
                <div className="processing-item__status">
                  <span className={`upload-badge upload-badge--${style.status}`}>
                    {style.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Actions ── */}
      <div className="submission-actions">
        {isEditable && (
          <div className="submission-actions__submit">
            <button
              type="button"
              className="btn btn--primary btn--lg"
              disabled={!canSubmit || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending
                ? t('common.loading')
                : t('contributor.upload.submitForReview')}
            </button>

            {completedUploadCount === 0 && (
              <p className="form-error">{t('contributor.upload.needStyles')}</p>
            )}
            {upload.isUploading && (
              <p className="form-hint">{t('contributor.upload.waitForUploads')}</p>
            )}
            {submitMutation.isError && (
              <p className="form-error">{t('common.error')}</p>
            )}
          </div>
        )}

        <Link to="/contributor/submissions" className="btn btn--secondary">
          ← {t('common.back')}
        </Link>
      </div>
    </>
  );
}
