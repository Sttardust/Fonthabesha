/**
 * ProcessingWarnings — shows an alert when a submission has styles that
 * are still processing or have processing errors.
 * Renders nothing when all styles are ready.
 */
import type { SubmissionStyle } from '@/lib/types';
import { bilingualValue } from '@/lib/utils/bilingualValue';

interface Props {
  styles: SubmissionStyle[];
}

export default function ProcessingWarnings({ styles }: Props) {
  const errorStyles     = styles.filter((s) => s.uploadStatus === 'error');
  const pendingStyles   = styles.filter(
    (s) => s.uploadStatus === 'pending' || s.uploadStatus === 'processing',
  );

  if (errorStyles.length === 0 && pendingStyles.length === 0) return null;

  return (
    <div className="processing-warnings" role="alert">
      {pendingStyles.length > 0 && (
        <div className="processing-warnings__block processing-warnings__block--pending">
          <span className="processing-warnings__icon" aria-hidden="true">⏳</span>
          <div>
            <strong>Still processing</strong>
            <ul className="processing-warnings__list">
              {pendingStyles.map((s) => (
                <li key={s.id}>
                  {bilingualValue(s.name)} — {s.weight}
                  {s.isItalic ? ' Italic' : ''}
                  <span className={`upload-badge upload-badge--${s.uploadStatus}`}>
                    {s.uploadStatus}
                  </span>
                </li>
              ))}
            </ul>
            <p className="processing-warnings__note">
              These styles are not yet available for preview. You may still review the submission.
            </p>
          </div>
        </div>
      )}

      {errorStyles.length > 0 && (
        <div className="processing-warnings__block processing-warnings__block--error">
          <span className="processing-warnings__icon" aria-hidden="true">⚠️</span>
          <div>
            <strong>Processing errors</strong>
            <ul className="processing-warnings__list">
              {errorStyles.map((s) => (
                <li key={s.id}>
                  {bilingualValue(s.name)} — {s.weight}
                  {s.isItalic ? ' Italic' : ''}
                  {s.errorMessage && (
                    <span className="processing-warnings__err">{s.errorMessage}</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="processing-warnings__note">
              These styles failed to process. Consider requesting changes from the contributor.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
