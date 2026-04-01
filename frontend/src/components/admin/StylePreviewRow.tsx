/**
 * StylePreviewRow — shows a font style's specimen text in its loaded typeface.
 * Used in the admin review detail page.
 * Uses AdminStyleRecord shape (from getReviewDetail).
 */
import { useEffect, useState } from 'react';
import { loadFontStyle, getCssFamilyName } from '@/lib/utils/fontLoader';
import type { AdminStyleRecord } from '@/lib/types';

const SPECIMEN_TEXT = 'ሰላም ዓለም · Hello World';
const FALLBACK_FONT = '"Noto Sans Ethiopic", sans-serif';

const STATUS_LABEL: Record<string, string> = {
  draft:    'Draft',
  approved: 'Approved ✓',
};

interface Props {
  submissionId: string;
  style: AdminStyleRecord;
  /** Public asset URL for the font file (from /api/v1/assets/styles/:id) */
  assetUrl?: string;
  specimenText?: string;
}

export default function StylePreviewRow({
  submissionId,
  style,
  assetUrl,
  specimenText,
}: Props) {
  const [cssFamilyName, setCssFamilyName] = useState<string | null>(null);

  useEffect(() => {
    if (!assetUrl) return;
    let cancelled = false;
    loadFontStyle(submissionId, style.id, assetUrl).then(() => {
      if (!cancelled) setCssFamilyName(getCssFamilyName(submissionId, style.id));
    });
    return () => { cancelled = true; };
  }, [submissionId, style.id, assetUrl]);

  const fontFamily = cssFamilyName ?? FALLBACK_FONT;
  const isApproved = style.status === 'approved';

  return (
    <div className={`style-preview-row style-preview-row--${style.status}`}>
      {/* specimen */}
      <div
        className="style-preview-row__specimen"
        style={{
          fontFamily,
          fontWeight: style.weightClass ?? undefined,
          fontStyle: style.isItalic ? 'italic' : 'normal',
          opacity: isApproved ? 1 : 0.4,
        }}
        aria-label={`Specimen for ${style.name}`}
      >
        {specimenText ?? SPECIMEN_TEXT}
      </div>

      {/* meta row */}
      <div className="style-preview-row__meta">
        <span className="style-preview-row__name">{style.name}</span>
        <span className="style-preview-row__weight">
          {style.weightClass ?? '—'}{style.isItalic ? ' Italic' : ''}
        </span>
        <span className={`upload-badge upload-badge--${style.status}`}>
          {STATUS_LABEL[style.status] ?? style.status}
        </span>
      </div>
    </div>
  );
}
