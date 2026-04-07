import { useTranslation } from 'react-i18next';
import type { SubmissionStatus } from '@/lib/types';

interface Props {
  status: SubmissionStatus;
}

const STATUS_CLASS: Record<SubmissionStatus, string> = {
  draft:             'badge--status-draft',
  pending_review:    'badge--status-needs_review',
  changes_requested: 'badge--status-changes_requested',
  approved:          'badge--status-approved',
  rejected:          'badge--status-rejected',
  published:         'badge--status-approved',
};

export default function SubmissionStatusBadge({ status }: Props) {
  const { t } = useTranslation();
  return (
    <span className={`badge ${STATUS_CLASS[status]}`}>
      {t(`contributor.status.${status}`)}
    </span>
  );
}
