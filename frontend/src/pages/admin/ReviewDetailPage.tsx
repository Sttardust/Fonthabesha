import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi } from '@/lib/api/admin';
import { bilingualValue } from '@/lib/utils/bilingualValue';

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'submission', id],
    queryFn: () => adminApi.getSubmission(id!),
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: () => adminApi.approve(id!, notes || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      navigate('/admin/review');
    },
  });

  const changesMutation = useMutation({
    mutationFn: () => adminApi.requestChanges(id!, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      navigate('/admin/review');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => adminApi.reject(id!, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      navigate('/admin/review');
    },
  });

  const isPending = approveMutation.isPending || changesMutation.isPending || rejectMutation.isPending;

  if (isLoading) return <div className="page-loading">{t('common.loading')}</div>;
  if (isError || !data) return <div className="page-error">{t('common.error')}</div>;

  const familyName = bilingualValue(data.familyName);

  return (
    <>
      <Helmet><title>Review: {familyName} — Fonthabesha</title></Helmet>

      <div className="portal-page-header">
        <h1 className="portal-page-title">Review: {familyName}</h1>
        <span className={`badge badge--status badge--${data.status}`}>
          {t(`contributor.status.${data.status}`)}
        </span>
      </div>

      {/* Submission styles */}
      <section className="submission-styles">
        <h2>Font Styles</h2>
        <ul className="processing-list">
          {data.styles.map((style) => (
            <li key={style.id} className="processing-item">
              <span className="processing-item__name">
                {bilingualValue(style.name)} · {style.weight}{style.isItalic ? ' Italic' : ''} — {style.fileName}
              </span>
              <span className={`badge badge--status badge--${style.uploadStatus}`}>
                {style.uploadStatus}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Review notes */}
      <div className="form-group" style={{ marginTop: '2rem' }}>
        <label className="form-label" htmlFor="review-notes">
          Review Notes
        </label>
        <textarea
          id="review-notes"
          className="form-input form-textarea"
          rows={4}
          placeholder="Add notes for the contributor (required for changes / rejection)…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Action buttons */}
      <div className="form-actions" style={{ gap: '0.75rem' }}>
        <button
          type="button"
          className="btn btn--primary"
          disabled={isPending}
          onClick={() => approveMutation.mutate()}
        >
          ✓ {t('admin.actions.approve')}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={isPending || !notes.trim()}
          onClick={() => changesMutation.mutate()}
        >
          ↩ {t('admin.actions.requestChanges')}
        </button>
        <button
          type="button"
          className="btn btn--danger"
          disabled={isPending || !notes.trim()}
          onClick={() => rejectMutation.mutate()}
        >
          ✗ {t('admin.actions.reject')}
        </button>
      </div>

      {(approveMutation.isError || changesMutation.isError || rejectMutation.isError) && (
        <p className="form-error form-error--global">{t('common.error')}</p>
      )}
    </>
  );
}
