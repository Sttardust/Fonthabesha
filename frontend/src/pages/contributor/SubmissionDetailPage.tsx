import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contributorApi } from '@/lib/api/contributor';
import { bilingualValue } from '@/lib/utils/bilingualValue';

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['contributor', 'submission', id],
    queryFn: () => contributorApi.get(id!),
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: () => contributorApi.submit(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contributor', 'submission', id] });
      queryClient.invalidateQueries({ queryKey: ['contributor', 'submissions'] });
    },
  });

  if (isLoading) return <div className="page-loading">{t('common.loading')}</div>;
  if (isError || !data) return <div className="page-error">{t('common.error')}</div>;

  const canSubmit = data.status === 'draft' || data.status === 'changes_requested';
  const familyName = bilingualValue(data.familyName);

  return (
    <>
      <Helmet><title>{familyName} — {t('contributor.portal')}</title></Helmet>

      <div className="portal-page-header">
        <h1 className="portal-page-title">{familyName}</h1>
        <span className={`badge badge--status badge--${data.status}`}>
          {t(`contributor.status.${data.status}`)}
        </span>
      </div>

      {data.reviewNotes && (
        <div className="review-notes">
          <strong>Reviewer notes:</strong>
          <p>{data.reviewNotes}</p>
        </div>
      )}

      {/* Styles / font files */}
      <section className="submission-styles">
        <h2>Font Styles</h2>
        {data.styles.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)' }}>
            No styles uploaded yet.
          </p>
        )}
        <ul className="processing-list">
          {data.styles.map((style) => (
            <li key={style.id} className="processing-item">
              <span className="processing-item__name">
                {bilingualValue(style.name)} · {style.weight}{style.isItalic ? ' Italic' : ''}
              </span>
              <span className={`badge badge--status badge--${style.uploadStatus}`}>
                {style.uploadStatus}
              </span>
              {style.errorMessage && (
                <span className="processing-item__error">{style.errorMessage}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Actions */}
      {canSubmit && (
        <div className="form-actions">
          <button
            type="button"
            className="btn btn--primary"
            disabled={submitMutation.isPending || data.styles.length === 0}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? t('common.loading') : 'Submit for Review'}
          </button>
          {data.styles.length === 0 && (
            <p className="form-error">Upload at least one font style before submitting.</p>
          )}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Link to="/contributor/submissions" className="btn btn--secondary">
          ← {t('common.back')}
        </Link>
      </div>
    </>
  );
}
