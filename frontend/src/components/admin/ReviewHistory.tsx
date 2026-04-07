/**
 * ReviewHistory — timeline of review events for a submission.
 * Uses ReviewEvent from types/index.ts (actor.email, not actorEmail).
 */
import type { ReviewEvent } from '@/lib/types';

interface Props {
  history: ReviewEvent[];
}

const ACTION_LABEL: Record<string, string> = {
  submitted:        'Submitted for review',
  resubmitted:      'Resubmitted',
  approved:         'Approved',
  request_changes:  'Changes requested',
  rejected:         'Rejected',
  processing_failed: 'Processing failed',
};

const ACTION_ICON: Record<string, string> = {
  submitted:        '📨',
  resubmitted:      '🔄',
  approved:         '✅',
  request_changes:  '↩',
  rejected:         '❌',
  processing_failed: '⚠️',
};

const ACTION_CLASS: Record<string, string> = {
  submitted:        '',
  resubmitted:      '',
  approved:         'review-event--approved',
  request_changes:  'review-event--changes',
  rejected:         'review-event--rejected',
  processing_failed: 'review-event--error',
};

export default function ReviewHistory({ history }: Props) {
  if (history.length === 0) {
    return <p className="review-history__empty">No review history yet.</p>;
  }

  return (
    <ol className="review-history" aria-label="Review history">
      {history.map((event) => (
        <li key={event.id} className={`review-event ${ACTION_CLASS[event.action] ?? ''}`}>
          <span className="review-event__icon" aria-hidden="true">
            {ACTION_ICON[event.action] ?? '•'}
          </span>
          <div className="review-event__body">
            <div className="review-event__header">
              <strong className="review-event__action">
                {ACTION_LABEL[event.action] ?? event.action}
              </strong>
              <time
                className="review-event__time"
                dateTime={event.createdAt}
                title={new Date(event.createdAt).toLocaleString()}
              >
                {new Date(event.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </time>
            </div>
            {event.actor && (
              <span className="review-event__actor">
                {event.actor.displayName ?? event.actor.email}
              </span>
            )}
            {event.summary && (
              <p className="review-event__summary">{event.summary}</p>
            )}
            {event.targets.length > 0 && (
              <div className="review-event__targets">
                {event.targets.map((target, index) => (
                  <span key={`${event.id}:${index}`} className="badge">
                    {target.styleId ? `Style ${target.styleId}` : 'Style'}
                    {target.styleId && target.uploadId ? ' · ' : ''}
                    {target.uploadId ? `Upload ${target.uploadId}` : ''}
                  </span>
                ))}
              </div>
            )}
            {event.notes && (
              <blockquote className="review-event__notes">{event.notes}</blockquote>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
