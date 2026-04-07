import { useTranslation } from 'react-i18next';

type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'error';

interface Props {
  status: ProcessingStatus;
  errorMessage?: string | null;
  /** File or style name to show alongside the status */
  label?: string;
}

const STATUS_ICONS: Record<ProcessingStatus, string> = {
  pending:    '○',
  processing: '◌',
  ready:      '✓',
  error:      '✗',
};

const STATUS_CLASSES: Record<ProcessingStatus, string> = {
  pending:    'processing-feedback--pending',
  processing: 'processing-feedback--processing',
  ready:      'processing-feedback--ready',
  error:      'processing-feedback--error',
};

export default function ProcessingFeedback({ status, errorMessage, label }: Props) {
  const { t } = useTranslation();

  const statusLabel = {
    pending:    t('contributor.upload.processing'),
    processing: t('contributor.upload.processing'),
    ready:      t('contributor.status.approved'),
    error:      t('common.error'),
  }[status];

  return (
    <div className={`processing-feedback ${STATUS_CLASSES[status]}`} role="status">
      <span className="processing-feedback__icon" aria-hidden="true">
        {STATUS_ICONS[status]}
      </span>
      <span className="processing-feedback__info">
        {label && <span className="processing-feedback__label">{label}</span>}
        <span className="processing-feedback__status">{statusLabel}</span>
        {status === 'error' && errorMessage && (
          <span className="processing-feedback__error">{errorMessage}</span>
        )}
      </span>
    </div>
  );
}
