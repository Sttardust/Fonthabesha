import { apiClient } from './client';
import type { SubmissionSummary, SubmissionDetail, PaginatedResponse, BilingualString } from '@/lib/types';

const PREFIX = '/api/v1/submissions';

export interface CreateSubmissionPayload {
  familyName: BilingualString;
  designerName?: BilingualString;
  description?: BilingualString;
  category: string;
  scriptSupport: string;
  license: string;
  licenseUrl?: string;
  tags?: string[];
}

export interface StyleUploadMeta {
  name: BilingualString;
  weight: number;
  isItalic: boolean;
  fileName: string;
}

export const contributorApi = {
  /** List all submissions by the authenticated contributor */
  list: (page = 1, pageSize = 20): Promise<PaginatedResponse<SubmissionSummary>> =>
    apiClient.get<PaginatedResponse<SubmissionSummary>>(
      `${PREFIX}?page=${page}&pageSize=${pageSize}`,
    ),

  /** Get a single submission with its styles */
  get: (id: string): Promise<SubmissionDetail> =>
    apiClient.get<SubmissionDetail>(`${PREFIX}/${id}`),

  /** Create a new submission (draft) */
  create: (payload: CreateSubmissionPayload): Promise<SubmissionDetail> =>
    apiClient.post<SubmissionDetail>(PREFIX, payload),

  /** Update submission metadata */
  update: (id: string, payload: Partial<CreateSubmissionPayload>): Promise<SubmissionDetail> =>
    apiClient.patch<SubmissionDetail>(`${PREFIX}/${id}`, payload),

  /** Submit for review (transitions status from draft → pending_review) */
  submit: (id: string): Promise<SubmissionDetail> =>
    apiClient.post<SubmissionDetail>(`${PREFIX}/${id}/submit`),

  /** Delete a draft submission */
  delete: (id: string): Promise<void> =>
    apiClient.delete(`${PREFIX}/${id}`),

  /**
   * Get a pre-signed upload URL for a font style file.
   * Returns the upload URL and the style id to track progress.
   */
  getUploadUrl: (
    submissionId: string,
    meta: StyleUploadMeta,
  ): Promise<{ uploadUrl: string; styleId: string }> =>
    apiClient.post(`${PREFIX}/${submissionId}/styles/upload-url`, meta),

  /**
   * Upload a font file directly to S3 using a pre-signed URL.
   * This does NOT use the apiClient (no auth header needed for S3).
   */
  uploadToS3: async (uploadUrl: string, file: File): Promise<void> => {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file,
    });
    if (!res.ok) throw new Error(`S3 upload failed: ${res.statusText}`);
  },
};
