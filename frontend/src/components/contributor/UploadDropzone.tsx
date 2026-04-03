/**
 * UploadDropzone — drag-and-drop font file upload zone.
 * Accepts .ttf .otf and .woff files.
 * Renders a StyleMetaRow for each queued file.
 */
import { useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { UseUploadReturn } from '@/hooks/useUpload';
import StyleMetaRow from './StyleMetaRow';

// .woff2 not accepted — backend only processes source formats (TTF/OTF/WOFF)
const ACCEPT = '.ttf,.otf,.woff';

interface Props extends UseUploadReturn {
  disabled?: boolean;
}

export default function UploadDropzone({
  files,
  addFiles,
  removeFile,
  updateMeta,
  uploadFile,
  uploadAll,
  clearCompleted,
  isUploading,
  hasErrors,
  disabled = false,
}: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const dt = e.dataTransfer;
      if (dt.files.length > 0) addFiles(dt.files);
    },
    [disabled, addFiles],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(e.target.files);
      // reset so same file can be re-selected
      e.target.value = '';
    },
    [addFiles],
  );

  const pendingCount = files.filter((f) => f.phase === 'idle' || f.phase === 'error').length;
  const readyCount   = files.filter((f) => f.phase === 'ready').length;

  return (
    <div className="upload-dropzone-wrap">
      {/* ── Drop target ── */}
      <div
        className={`upload-dropzone${isDragOver ? ' upload-dropzone--drag-over' : ''}${disabled ? ' upload-dropzone--disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={t('contributor.upload.dropzone')}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="upload-dropzone__input"
          onChange={handleInputChange}
          aria-hidden="true"
          tabIndex={-1}
        />

        {/* Cloud icon */}
        <svg
          className="upload-dropzone__icon"
          viewBox="0 0 48 48"
          fill="none"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M38 20.5A10 10 0 0 0 28 12a10 10 0 0 0-9.6 7.2A8 8 0 1 0 10 35h28a8 8 0 0 0 0-16v1.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M24 26v10M20 30l4-4 4 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <p className="upload-dropzone__label">
          {isDragOver
            ? t('contributor.upload.dropHere')
            : t('contributor.upload.dropzone')}
        </p>
        <p className="upload-dropzone__hint">
          {t('contributor.upload.accepted')}
        </p>
      </div>

      {/* ── File queue ── */}
      {files.length > 0 && (
        <div className="upload-queue">
          <div className="upload-queue__header">
            <span className="upload-queue__count">
              {files.length} {files.length === 1 ? 'file' : 'files'}
              {readyCount > 0 && ` · ${readyCount} uploaded`}
            </span>
            <div className="upload-queue__controls">
              {readyCount > 0 && (
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={clearCompleted}
                >
                  {t('contributor.upload.clearUploaded')}
                </button>
              )}
              {pendingCount > 0 && (
                <button
                  type="button"
                  className="btn btn--sm btn--primary"
                  disabled={isUploading || disabled}
                  onClick={uploadAll}
                >
                  {isUploading
                    ? t('contributor.upload.uploading')
                    : `${t('contributor.upload.uploadAll')} (${pendingCount})`}
                </button>
              )}
            </div>
          </div>

          <ul className="upload-queue__list" aria-label="Upload queue">
            {files.map((entry) => (
              <li key={entry.uid}>
                <StyleMetaRow
                  entry={entry}
                  onMeta={updateMeta}
                  onUpload={uploadFile}
                  onRemove={removeFile}
                />
              </li>
            ))}
          </ul>

          {hasErrors && (
            <p className="upload-queue__error-hint">
              {t('contributor.upload.hasErrors')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
