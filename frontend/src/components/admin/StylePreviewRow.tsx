/**
 * StylePreviewRow — shows a font style's specimen text in its loaded typeface,
 * alongside metadata and upload-status badge. Used in the admin review detail.
 */
import { useEffect, useState } from 'react';
import { loadFontStyle, getCssFamilyName } from '@/lib/utils/fontLoader';
import { bilingualValue } from '@/lib/utils/bilingualValue';
import type { SubmissionStyle } from '@/lib/types';

const SPECIMEN_TEXT = 'ሰላም ዓለም · Hello World';
const FALLBACK_FONT = '"Noto Sans Ethiopic", sans-serif';

const UPLOAD_LABEL: Record<string, string> = {
  pending:    'Queued',
  processing: 'Processing…',
  ready:      'Ready ✓',
  error:      'Error',
};

interface Props {
  submissionId: string;
  style: SubmissionStyle;
  specimenText?: string;
}

export default function StylePreviewRow({ submissionId, style, specimenText }: Props) {
  const [cssFamilyName, setCssFamilyName] = useState<string | null>(null);

  useEffect(() => {
    if (style.uploadStatus !== 'ready' || !style.assetUrl) return;
    let cancelled = false;
    loadFontStyle(submissionId, style.id, style.assetUrl).then(() => {
      if (!cancelled) setCssFamilyName(getCssFamilyName(submissionId, style.id));
    });
    return () => { cancelled = true; };
  }, [submissionId, style.id, style.uploadStatus, style.assetUrl]);

  const fontFamily = cssFamilyName ?? FALLBACK_FONT;
  const isReady    = style.uploadStatus === 'ready';

  return (
    <div className={`style-preview-row style-preview-row--${style.uploadStatus}`}>
      {/* specimen */}
      <div
        className="style-preview-row__specimen"
        style={{
          fontFamily,
          fontWeight: style.weight,
          fontStyle: style.isItalic ? 'italic' : 'normal',
          opacity: isReady ? 1 : 0.4,
        }}
        aria-label={`Specimen for ${bilingualValue(style.name)}`}
      >
        {specimenText ?? SPECIMEN_TEXT}
      </div>

      {/* meta row */}
      <div className="style-preview-row__meta">
        <span className="style-preview-row__name">
          {bilingualValue(style.name)}
        </span>
        <span className="style-preview-row__weight">
          {style.weight}{style.isItalic ? ' Italic' : ''}
        </span>
        <span className="style-preview-row__file">{style.fileName}</span>
        <span className={`upload-badge upload-badge--${style.uploadStatus}`}>
          {UPLOAD_LABEL[style.uploadStatus] ?? style.uploadStatus}
        </span>
        {style.uploadStatus === 'processing' && (
          <span className="upload-processing__spinner" aria-label="Processing" />
        )}
      </div>

      {style.errorMessage && (
        <p className="style-preview-row__error form-error">{style.errorMessage}</p>
      )}
    </div>
  );
}
