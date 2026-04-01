/**
 * StyleMetaRow — inline form row for one queued font file.
 * Shows: phase badge, progress bar, name fields, weight, italic toggle,
 * per-file upload / retry button, and remove button.
 */
import { useTranslation } from 'react-i18next';
import type { UploadFile, FilePhase } from '@/hooks/useUpload';

interface Props {
  entry: UploadFile;
  onMeta: (uid: string, meta: Partial<Pick<UploadFile, 'nameAm' | 'nameEn' | 'weightClass' | 'isItalic'>>) => void;
  onUpload: (uid: string) => void;
  onRemove: (uid: string) => void;
}

const PHASE_LABELS: Record<FilePhase, string> = {
  idle: 'Ready',
  hashing: 'Hashing…',
  uploading: 'Uploading',
  processing: 'Processing…',
  ready: 'Ready ✓',
  error: 'Error',
};

const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
const WEIGHT_NAMES: Record<number, string> = {
  100: '100 Thin',
  200: '200 ExtraLight',
  300: '300 Light',
  400: '400 Regular',
  500: '500 Medium',
  600: '600 SemiBold',
  700: '700 Bold',
  800: '800 ExtraBold',
  900: '900 Black',
};

export default function StyleMetaRow({ entry, onMeta, onUpload, onRemove }: Props) {
  const { t } = useTranslation();
  const { uid, file, phase, progress, errorMessage, nameAm, nameEn, weightClass, isItalic } = entry;

  const isActive = phase === 'hashing' || phase === 'uploading' || phase === 'processing';
  const canUpload = phase === 'idle' || phase === 'error';
  const canRemove = phase !== 'hashing' && phase !== 'uploading';

  return (
    <div className={`style-meta-row style-meta-row--${phase}`} aria-label={file.name}>
      {/* ── file header row ── */}
      <div className="style-meta-row__header">
        <span className="style-meta-row__filename" title={file.name}>
          {file.name}
        </span>
        <span className={`upload-badge upload-badge--${phase}`}>
          {PHASE_LABELS[phase]}
        </span>
        <div className="style-meta-row__actions">
          {canUpload && (
            <button
              type="button"
              className="btn btn--sm btn--primary"
              onClick={() => onUpload(uid)}
              aria-label={phase === 'error' ? 'Retry upload' : 'Upload file'}
            >
              {phase === 'error' ? 'Retry' : t('contributor.upload.uploadFile')}
            </button>
          )}
          {canRemove && (
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => onRemove(uid)}
              aria-label="Remove file"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── progress bar ── */}
      {(phase === 'uploading' || phase === 'hashing') && (
        <div className="upload-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="upload-progress__fill"
            style={{ width: `${phase === 'hashing' ? 0 : progress}%` }}
          />
          {phase === 'uploading' && (
            <span className="upload-progress__label">{progress}%</span>
          )}
        </div>
      )}

      {/* ── processing spinner ── */}
      {phase === 'processing' && (
        <div className="upload-processing">
          <span className="upload-processing__spinner" aria-hidden="true" />
          {t('contributor.upload.processing')}
        </div>
      )}

      {/* ── error message ── */}
      {phase === 'error' && errorMessage && (
        <p className="form-error style-meta-row__error">{errorMessage}</p>
      )}

      {/* ── metadata form (hidden once ready or actively uploading) ── */}
      {phase !== 'ready' && (
        <div className="style-meta-row__form">
          <div className="style-meta-row__fields">
            <div className="form-group form-group--sm">
              <label className="form-label" htmlFor={`nameEn-${uid}`}>
                Style Name (EN)
              </label>
              <input
                id={`nameEn-${uid}`}
                className="form-input form-input--sm"
                value={nameEn}
                disabled={isActive}
                onChange={(e) => onMeta(uid, { nameEn: e.target.value })}
                placeholder="e.g. Regular"
              />
            </div>
            <div className="form-group form-group--sm">
              <label className="form-label" htmlFor={`nameAm-${uid}`}>
                Style Name (አማርኛ)
              </label>
              <input
                id={`nameAm-${uid}`}
                className="form-input form-input--sm"
                value={nameAm}
                disabled={isActive}
                onChange={(e) => onMeta(uid, { nameAm: e.target.value })}
                placeholder="ለምሳሌ፦ መደበኛ"
              />
            </div>
            <div className="form-group form-group--sm">
              <label className="form-label" htmlFor={`weight-${uid}`}>
                Weight
              </label>
              <select
                id={`weight-${uid}`}
                className="form-input form-input--sm"
                value={weightClass}
                disabled={isActive}
                onChange={(e) => onMeta(uid, { weightClass: Number(e.target.value) })}
              >
                {WEIGHTS.map((w) => (
                  <option key={w} value={w}>
                    {WEIGHT_NAMES[w]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group form-group--sm form-group--toggle">
              <label className="toggle-label" htmlFor={`italic-${uid}`}>
                <input
                  id={`italic-${uid}`}
                  type="checkbox"
                  className="toggle-input"
                  checked={isItalic}
                  disabled={isActive}
                  onChange={(e) => onMeta(uid, { isItalic: e.target.checked })}
                />
                <span className="toggle-track" aria-hidden="true" />
                Italic
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
