/**
 * useUpload — multi-file upload state machine for contributor portal.
 *
 * Pipeline per file:
 *   idle → hashing → uploading → processing → ready
 *                        ↘ error (any step)
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { contributorApi } from '@/lib/api/contributor';

// ── Types ──────────────────────────────────────────────────────────────────────

export type FilePhase = 'idle' | 'hashing' | 'uploading' | 'processing' | 'ready' | 'error';

export interface UploadFile {
  uid: string;
  file: File;
  phase: FilePhase;
  /** 0–100, meaningful during 'uploading' */
  progress: number;
  sha256: string | null;
  /** styleId returned by the API after getUploadUrl */
  styleId: string | null;
  errorMessage: string | null;
  // user-editable metadata
  nameAm: string;
  nameEn: string;
  weight: number;
  isItalic: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function guessWeight(name: string): number {
  const n = name.toLowerCase();
  if (n.includes('thin')) return 100;
  if (n.includes('extralight') || n.includes('extra-light')) return 200;
  if (n.includes('light')) return 300;
  if (n.includes('medium')) return 500;
  if (n.includes('semibold') || n.includes('semi-bold')) return 600;
  if (n.includes('extrabold') || n.includes('extra-bold')) return 800;
  if (n.includes('black') || n.includes('heavy')) return 900;
  if (n.includes('bold')) return 700;
  return 400;
}

function guessItalic(name: string): boolean {
  return /italic|oblique/i.test(name);
}

async function hashFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener('load', () => {
      if (xhr.status < 400) resolve();
      else reject(new Error(`S3 upload failed (${xhr.status})`));
    });
    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.send(file);
  });
}

const ACCEPTED_EXTS = ['.ttf', '.otf', '.woff', '.woff2'];
const POLL_INTERVAL_MS = 3_000;

// ── Hook ───────────────────────────────────────────────────────────────────────

export interface UseUploadReturn {
  files: UploadFile[];
  addFiles: (list: FileList | File[]) => void;
  removeFile: (uid: string) => void;
  updateMeta: (
    uid: string,
    meta: Partial<Pick<UploadFile, 'nameAm' | 'nameEn' | 'weight' | 'isItalic'>>,
  ) => void;
  uploadFile: (uid: string) => Promise<void>;
  uploadAll: () => Promise<void>;
  clearCompleted: () => void;
  isUploading: boolean;
  allReady: boolean;
  hasErrors: boolean;
}

export function useUpload(submissionId: string): UseUploadReturn {
  const [files, setFiles] = useState<UploadFile[]>([]);

  // Keep a ref so async callbacks always see current state
  const filesRef = useRef<UploadFile[]>(files);
  filesRef.current = files;

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Polling: resolve 'processing' → 'ready' | 'error' ──────────────────────
  useEffect(() => {
    const hasProcessing = files.some((f) => f.phase === 'processing');

    if (hasProcessing && !pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        try {
          const detail = await contributorApi.get(submissionId);
          setFiles((prev) =>
            prev.map((f) => {
              if (f.phase !== 'processing' || !f.styleId) return f;
              const apiStyle = detail.styles.find((s) => s.id === f.styleId);
              if (!apiStyle) return f;
              if (apiStyle.uploadStatus === 'ready') return { ...f, phase: 'ready' };
              if (apiStyle.uploadStatus === 'error') {
                return {
                  ...f,
                  phase: 'error',
                  errorMessage: apiStyle.errorMessage ?? 'Processing error',
                };
              }
              return f;
            }),
          );
        } catch {
          // ignore transient polling errors
        }
      }, POLL_INTERVAL_MS);
    }

    if (!hasProcessing && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (!files.some((f) => f.phase === 'processing') && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [files, submissionId]);

  // ── addFiles ────────────────────────────────────────────────────────────────
  const addFiles = useCallback((list: FileList | File[]) => {
    const incoming = Array.from(list).filter((f) =>
      ACCEPTED_EXTS.some((ext) => f.name.toLowerCase().endsWith(ext)),
    );
    const entries: UploadFile[] = incoming.map((file) => {
      const baseName = file.name.replace(/\.[^.]+$/, '');
      return {
        uid: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        phase: 'idle',
        progress: 0,
        sha256: null,
        styleId: null,
        errorMessage: null,
        nameAm: '',
        nameEn: baseName,
        weight: guessWeight(baseName),
        isItalic: guessItalic(baseName),
      };
    });
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  // ── removeFile ──────────────────────────────────────────────────────────────
  const removeFile = useCallback((uid: string) => {
    setFiles((prev) => prev.filter((f) => f.uid !== uid));
  }, []);

  // ── updateMeta ──────────────────────────────────────────────────────────────
  const updateMeta = useCallback(
    (
      uid: string,
      meta: Partial<Pick<UploadFile, 'nameAm' | 'nameEn' | 'weight' | 'isItalic'>>,
    ) => {
      setFiles((prev) => prev.map((f) => (f.uid === uid ? { ...f, ...meta } : f)));
    },
    [],
  );

  // ── uploadFile ──────────────────────────────────────────────────────────────
  const uploadFile = useCallback(
    async (uid: string) => {
      const snapshot = filesRef.current.find((f) => f.uid === uid);
      if (!snapshot) return;

      // Transition: idle/error → hashing
      setFiles((prev) =>
        prev.map((f) =>
          f.uid === uid ? { ...f, phase: 'hashing', progress: 0, errorMessage: null } : f,
        ),
      );

      try {
        // 1. SHA-256 hash
        const sha256 = await hashFile(snapshot.file);

        setFiles((prev) =>
          prev.map((f) =>
            f.uid === uid ? { ...f, sha256, phase: 'uploading', progress: 0 } : f,
          ),
        );

        // 2. Get presigned upload URL from API
        const { uploadUrl, styleId } = await contributorApi.getUploadUrl(submissionId, {
          name: { am: snapshot.nameAm || null, en: snapshot.nameEn || null },
          weight: snapshot.weight,
          isItalic: snapshot.isItalic,
          fileName: snapshot.file.name,
        });

        setFiles((prev) =>
          prev.map((f) => (f.uid === uid ? { ...f, styleId } : f)),
        );

        // 3. PUT file to S3 with XHR progress
        await uploadWithProgress(uploadUrl, snapshot.file, (progress) => {
          setFiles((prev) =>
            prev.map((f) => (f.uid === uid ? { ...f, progress } : f)),
          );
        });

        // 4. Processing — poll will transition to ready/error
        setFiles((prev) =>
          prev.map((f) =>
            f.uid === uid
              ? { ...f, phase: 'processing', progress: 100, styleId }
              : f,
          ),
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.uid === uid
              ? {
                  ...f,
                  phase: 'error',
                  errorMessage:
                    err instanceof Error ? err.message : 'Upload failed',
                }
              : f,
          ),
        );
      }
    },
    [submissionId],
  );

  // ── uploadAll ───────────────────────────────────────────────────────────────
  const uploadAll = useCallback(async () => {
    const pending = filesRef.current.filter(
      (f) => f.phase === 'idle' || f.phase === 'error',
    );
    await Promise.allSettled(pending.map((f) => uploadFile(f.uid)));
  }, [uploadFile]);

  // ── clearCompleted ──────────────────────────────────────────────────────────
  const clearCompleted = useCallback(() => {
    setFiles((prev) => prev.filter((f) => f.phase !== 'ready'));
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isUploading = files.some(
    (f) => f.phase === 'hashing' || f.phase === 'uploading' || f.phase === 'processing',
  );
  const allReady = files.length > 0 && files.every((f) => f.phase === 'ready');
  const hasErrors = files.some((f) => f.phase === 'error');

  return {
    files,
    addFiles,
    removeFile,
    updateMeta,
    uploadFile,
    uploadAll,
    clearCompleted,
    isUploading,
    allReady,
    hasErrors,
  };
}
