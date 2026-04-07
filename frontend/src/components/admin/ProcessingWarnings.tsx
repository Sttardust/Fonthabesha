/**
 * ProcessingWarnings — shows alerts when uploads have errors or are still processing.
 * Used in the admin review detail page.
 * Takes AdminUploadRecord[] from AdminReviewDetail.uploads.
 */
import type { AdminUploadRecord } from '@/lib/types';

interface Props {
  uploads: AdminUploadRecord[];
}

export default function ProcessingWarnings({ uploads }: Props) {
  const failed    = uploads.filter((u) => u.processingStatus === 'failed');
  const pending   = uploads.filter(
    (u) => u.processingStatus === 'queued' || u.processingStatus === 'processing',
  );

  if (failed.length === 0 && pending.length === 0) return null;

  return (
    <div className="processing-warnings" role="alert">
      {pending.length > 0 && (
        <div className="processing-warnings__block processing-warnings__block--pending">
          <span className="processing-warnings__icon" aria-hidden="true">⏳</span>
          <div>
            <strong>Still processing</strong>
            <ul className="processing-warnings__list">
              {pending.map((u) => (
                <li key={u.id}>
                  {u.originalFilename}
                  <span className={`upload-badge upload-badge--${u.processingStatus}`}>
                    {u.processingStatus}
                  </span>
                </li>
              ))}
            </ul>
            <p className="processing-warnings__note">
              These uploads are not yet processed. You may still review the submission.
            </p>
          </div>
        </div>
      )}

      {failed.length > 0 && (
        <div className="processing-warnings__block processing-warnings__block--error">
          <span className="processing-warnings__icon" aria-hidden="true">⚠️</span>
          <div>
            <strong>Processing errors</strong>
            <ul className="processing-warnings__list">
              {failed.map((u) => (
                <li key={u.id}>
                  {u.originalFilename}
                  {u.processingError && (
                    <span className="processing-warnings__err">{u.processingError}</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="processing-warnings__note">
              Consider requesting changes from the contributor.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
