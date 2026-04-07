import { apiClient } from './client';
import type { InitUploadPayload, InitUploadResponse, CompleteUploadPayload } from '@/lib/types';

const PREFIX = '/api/v1/uploads';

export const uploadsApi = {
  /**
   * Initialise an upload — creates an Upload record and returns a presigned S3 PUT URL.
   * Call this before uploading the file bytes.
   */
  init: (payload: InitUploadPayload): Promise<InitUploadResponse> =>
    apiClient.post<InitUploadResponse>(`${PREFIX}/init`, payload),

  /**
   * Signal that the file bytes have been PUT to S3 successfully.
   * Triggers background font-processing pipeline (queued → processing → completed|failed).
   * Optionally pass the SHA-256 hex digest for integrity verification.
   */
  complete: (payload: CompleteUploadPayload): Promise<void> =>
    apiClient.post<void>(`${PREFIX}/complete`, payload),
};
