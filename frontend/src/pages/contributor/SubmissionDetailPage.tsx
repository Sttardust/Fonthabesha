/**
 * SubmissionDetailPage — full contributor view of one submission.
 *
 * Sections:
 *  1. Header — family name, status badge, optional reviewer notes
 *  2. Upload zone — UploadDropzone (draft / changes_requested only)
 *  3. Uploaded styles — processing status list with polling
 *  4. Actions — Submit for Review / Edit metadata / Back
 */
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contributorApi } from '@/lib/api/contributor';
import { bilingualValue } from '@/lib/utils/bilingualValue';
import { useUpload } from '@/hooks/useUpload';
import UploadDropzone from '@/components/contributor/UploadDropzone';

// ── Processing status badge labels ────────────────────────────────────────────
const UPLOAD_STATUS_LABEL: Record<string, string> = {
  pending:    'Queued',
  processing: 'Processing…',
  ready:      'Ready ✓',
  error:      'Error',
};

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // ── Remote submission data ─────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ['contributor', 'submission', id],
    queryFn: () => contributorApi.get(id!),
    enabled: !!id,
    // Refresh every 5s while any style is still processing
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d) return false;
      return d.styles.some((s) => s.uploadStatus === 'processing' || s.uploadStatus === 'pending')
        ? 5_000
        : false;
    },
  });

  // ── Upload state machine ───────────────────────────────────────────────────
  const upload = useUpload(id ?? '');

  // ── Submit for review mutation ─────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: () => contributorApi.submit(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contributor', 'submission', id] });
      queryClient.invalidateQueries({ queryKey: ['contributor', 'submissions'] });
    },
  });

  // ── Loading / error guards ─────────────────────────────────────────────────
  if (isLoading) {
    return <div className="page-loading">{t('common.loading')}</div>;
  }
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

  const familyName = bilingualValue(data.familyName);
  const isEditable = data.status === 'draft' || data.status === 'changes_requested';

  // Can submit when editable + at least one server-side ready style + nothing uploading
  const serverReadyCount = data.styles.filter((s) => s.uploadStatus === 'ready').length;
  const localUploading   = upload.isUploading;
  const canSubmit        = isEditable && serverReadyCount > 0 && !localUploading;

  return (
    <>
      <Helmet>
        <title>{familyName} — {t('contributor.portal')}</title>
      </Helmet>

      {/* ── Header ── */}
      <div className="portal-page-header">
        <div className="portal-page-header__titles">
          <h1 className="portal-page-title">{familyName}</h1>
          {data.familyName.en && data.familyName.am && (
            <span className="portal-page-subtitle" lang="am">
              {data.familyName.am}
            </span>
          )}
        </div>
        <span className={`badge badge--status badge--${data.status}`}>
          {t(`contributor.status.${data.status}`)}
        </span>
      </div>

      {/* ── Reviewer notes ── */}
      {data.reviewNotes && (
        <div className="review-notes" role="note">
          <strong>{t('contributor.upload.reviewerNotes')}</strong>
          <p>{data.reviewNotes}</p>
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

      {/* ── Uploaded styles from server ── */}
      {data.styles.length > 0 && (
        <section className="submission-section">
          <h2 className="submission-section__title">
            {t('contributor.upload.uploadedStyles')}
            <span className="submission-section__count">
              {serverReadyCount}/{data.styles.length} ready
            </span>
          </h2>

          <ul className="processing-list">
            {data.styles.map((style) => (
              <li key={style.id} className="processing-item">
                <div className="processing-item__info">
                  <span className="processing-item__name">
                    {bilingualValue(style.name)}
                  </span>
                  <span className="processing-item__meta">
                    {style.weight}
                    {style.isItalic ? ' Italic' : ''}
                  </span>
                  <span className="processing-item__file">{style.fileName}</span>
                </div>
                <div className="processing-item__status">
                  <span className={`upload-badge upload-badge--${style.uploadStatus}`}>
                    {UPLOAD_STATUS_LABEL[style.uploadStatus] ?? style.uploadStatus}
                  </span>
                  {style.uploadStatus === 'processing' && (
                    <span className="upload-processing__spinner" aria-label="Processing" />
                  )}
                </div>
                {style.errorMessage && (
                  <p className="processing-item__error form-error">
                    {style.errorMessage}
                  </p>
                )}
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

            {serverReadyCount === 0 && (
              <p className="form-error">
                {t('contributor.upload.needStyles')}
              </p>
            )}
            {localUploading && (
              <p className="form-hint">
                {t('contributor.upload.waitForUploads')}
              </p>
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
