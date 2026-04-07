/**
 * useUpload — multi-file upload state machine for the contributor portal.
 *
 * Pipeline per file:
 *   idle → hashing → uploading → processing → ready
 *                        ↘ error (any step)
 *
 * Real upload flow (aligned with backend):
 *   1. POST /api/v1/uploads/init  → { uploadId, upload: { url } }
 *   2. PUT <presigned S3 url>     (XHR with progress events)
 *   3. POST /api/v1/uploads/complete  { uploadId, sha256 }
 *   4. Poll GET /api/v1/submissions/:id until upload.processingStatus
 *      transitions to 'completed' or 'failed'
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { contributorApi } from '@/lib/api/contributor';
import { uploadsApi } from '@/lib/api/uploads';

// ── Types ──────────────────────────────────────────────────────────────────────

export type FilePhase = 'idle' | 'hashing' | 'uploading' | 'processing' | 'ready' | 'error';

export interface UploadFile {
  uid: string;
  file: File;
  phase: FilePhase;
  /** 0–100, meaningful during 'uploading' */
  progress: number;
  sha256: string | null;
  /** uploadId returned by POST /uploads/init, used for polling */
  uploadId: string | null;
  errorMessage: string | null;
  // user-editable style metadata
  nameAm: string;
  nameEn: string;
  weightClass: number;
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

function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ttf': return 'font/ttf';
    case 'otf': return 'font/otf';
    case 'woff': return 'font/woff';
    default: return 'application/octet-stream';
  }
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
  contentType: string,
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
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(file);
  });
}

// .woff2 is NOT accepted — backend rejects it (not a source format)
const ACCEPTED_EXTS = ['.ttf', '.otf', '.woff'];
const POLL_INTERVAL_MS = 3_000;

// ── Hook ───────────────────────────────────────────────────────────────────────

export interface UseUploadReturn {
  files: UploadFile[];
  addFiles: (list: FileList | File[]) => void;
  removeFile: (uid: string) => void;
  updateMeta: (
    uid: string,
    meta: Partial<Pick<UploadFile, 'nameAm' | 'nameEn' | 'weightClass' | 'isItalic'>>,
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
  const filesRef = useRef<UploadFile[]>(files);
  filesRef.current = files;
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const hasProcessing = files.some((f) => f.phase === 'processing');

    if (hasProcessing && !pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        try {
          const detail = await contributorApi.get(submissionId);
          setFiles((prev) =>
            prev.map((f) => {
              if (f.phase !== 'processing' || !f.uploadId) return f;
              const apiUpload = detail.uploads.find((u) => u.id === f.uploadId);
              if (!apiUpload) return f;
              if (apiUpload.processingStatus === 'completed') return { ...f, phase: 'ready' };
              if (apiUpload.processingStatus === 'failed') {
                return { ...f, phase: 'error', errorMessage: apiUpload.processingError ?? 'Processing failed' };
              }
              return f;
            }),
          );
        } catch { /* ignore transient errors */ }
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
        uploadId: null,
        errorMessage: null,
        nameAm: '',
        nameEn: baseName,
        weightClass: guessWeight(baseName),
        isItalic: guessItalic(baseName),
      };
    });
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const removeFile = useCallback((uid: string) => {
    setFiles((prev) => prev.filter((f) => f.uid !== uid));
  }, []);

  const updateMeta = useCallback(
    (uid: string, meta: Partial<Pick<UploadFile, 'nameAm' | 'nameEn' | 'weightClass' | 'isItalic'>>) => {
      setFiles((prev) => prev.map((f) => (f.uid === uid ? { ...f, ...meta } : f)));
    },
    [],
  );

  const uploadFile = useCallback(
    async (uid: string) => {
      const snapshot = filesRef.current.find((f) => f.uid === uid);
      if (!snapshot) return;

      setFiles((prev) =>
        prev.map((f) =>
          f.uid === uid ? { ...f, phase: 'hashing', progress: 0, errorMessage: null } : f,
        ),
      );

      try {
        const sha256 = await hashFile(snapshot.file);
        const contentType = guessMimeType(snapshot.file.name);

        setFiles((prev) =>
          prev.map((f) => f.uid === uid ? { ...f, sha256, phase: 'uploading', progress: 0 } : f),
        );

        // Step 1: Init upload — get presigned S3 URL
        const initRes = await uploadsApi.init({ submissionId, filename: snapshot.file.name, contentType });
        const { uploadId } = initRes;
        const presignedUrl = initRes.upload.url;

        setFiles((prev) => prev.map((f) => (f.uid === uid ? { ...f, uploadId } : f)));

        // Step 2: PUT to S3
        await uploadWithProgress(presignedUrl, snapshot.file, contentType, (progress) => {
          setFiles((prev) => prev.map((f) => (f.uid === uid ? { ...f, progress } : f)));
        });

        // Step 3: Signal completion → triggers backend processing
        await uploadsApi.complete({ uploadId, sha256 });

        // Step 4: Enter processing phase — polling resolves to ready/error
        setFiles((prev) =>
          prev.map((f) =>
            f.uid === uid ? { ...f, phase: 'processing', progress: 100, uploadId } : f,
          ),
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.uid === uid
              ? { ...f, phase: 'error', errorMessage: err instanceof Error ? err.message : 'Upload failed' }
              : f,
          ),
        );
      }
    },
    [submissionId],
  );

  const uploadAll = useCallback(async () => {
    const pending = filesRef.current.filter((f) => f.phase === 'idle' || f.phase === 'error');
    await Promise.allSettled(pending.map((f) => uploadFile(f.uid)));
  }, [uploadFile]);

  const clearCompleted = useCallback(() => {
    setFiles((prev) => prev.filter((f) => f.phase !== 'ready'));
  }, []);

  const isUploading = files.some(
    (f) => f.phase === 'hashing' || f.phase === 'uploading' || f.phase === 'processing',
  );
  const allReady = files.length > 0 && files.every((f) => f.phase === 'ready');
  const hasErrors = files.some((f) => f.phase === 'error');

  return { files, addFiles, removeFile, updateMeta, uploadFile, uploadAll, clearCompleted, isUploading, allReady, hasErrors };
}
