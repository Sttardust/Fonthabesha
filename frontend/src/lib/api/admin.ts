import { apiClient } from './client';
import type {
  ReviewQueueItem,
  AdminStats,
  AdminSubmissionDetail,
  AdminCollection,
  FontFamilyDetail,
  AnalyticsResponse,
  PaginatedResponse,
  SubmissionStatus,
  VocabEntry,
  LicenseAdmin,
  ProcessingFailure,
} from '@/lib/types';

const REVIEW_PREFIX = '/api/v1/admin/submissions';
const FAMILIES_PREFIX = '/api/v1/admin/families';
const STATS_PREFIX = '/api/v1/admin/stats';

export const adminApi = {
  // ── Stats ────────────────────────────────────────────────────────────────────
  stats: (): Promise<AdminStats> =>
    apiClient.get<AdminStats>(STATS_PREFIX),

  // ── Review queue ─────────────────────────────────────────────────────────────
  reviewQueue: (
    status?: SubmissionStatus,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResponse<ReviewQueueItem>> => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status) params.set('status', status);
    return apiClient.get<PaginatedResponse<ReviewQueueItem>>(
      `${REVIEW_PREFIX}?${params.toString()}`,
    );
  },

  getSubmission: (id: string): Promise<AdminSubmissionDetail> =>
    apiClient.get<AdminSubmissionDetail>(`${REVIEW_PREFIX}/${id}`),

  /** Approve a submission → publishes it as a font family */
  approve: (id: string, notes?: string): Promise<AdminSubmissionDetail> =>
    apiClient.post<AdminSubmissionDetail>(`${REVIEW_PREFIX}/${id}/approve`, { notes }),

  /** Request changes from the contributor */
  requestChanges: (id: string, notes: string): Promise<AdminSubmissionDetail> =>
    apiClient.post<AdminSubmissionDetail>(`${REVIEW_PREFIX}/${id}/request-changes`, { notes }),

  /** Reject a submission */
  reject: (id: string, notes: string): Promise<AdminSubmissionDetail> =>
    apiClient.post<AdminSubmissionDetail>(`${REVIEW_PREFIX}/${id}/reject`, { notes }),

  // ── Published families management ────────────────────────────────────────────
  listFamilies: (page = 1, pageSize = 20): Promise<PaginatedResponse<FontFamilyDetail>> =>
    apiClient.get<PaginatedResponse<FontFamilyDetail>>(
      `${FAMILIES_PREFIX}?page=${page}&pageSize=${pageSize}`,
    ),

  unpublishFamily: (id: string): Promise<void> =>
    apiClient.post(`${FAMILIES_PREFIX}/${id}/unpublish`),

  deleteFamily: (id: string): Promise<void> =>
    apiClient.delete(`${FAMILIES_PREFIX}/${id}`),

  // ── Collections admin ─────────────────────────────────────────────────────────
  listCollections: (page = 1, pageSize = 20): Promise<PaginatedResponse<AdminCollection>> =>
    apiClient.get<PaginatedResponse<AdminCollection>>(
      `/api/v1/admin/collections?page=${page}&pageSize=${pageSize}`,
    ),

  createCollection: (payload: {
    name: string;
    description?: string;
    isPublic: boolean;
  }): Promise<AdminCollection> =>
    apiClient.post<AdminCollection>('/api/v1/admin/collections', payload),

  updateCollection: (
    id: string,
    payload: Partial<{ name: string; description: string; isPublic: boolean }>,
  ): Promise<AdminCollection> =>
    apiClient.patch<AdminCollection>(`/api/v1/admin/collections/${id}`, payload),

  deleteCollection: (id: string): Promise<void> =>
    apiClient.delete(`/api/v1/admin/collections/${id}`),

  addFamilyToCollection: (collectionId: string, familyId: string): Promise<void> =>
    apiClient.post(`/api/v1/admin/collections/${collectionId}/families/${familyId}`),

  removeFamilyFromCollection: (collectionId: string, familyId: string): Promise<void> =>
    apiClient.delete(`/api/v1/admin/collections/${collectionId}/families/${familyId}`),

  // ── Analytics ─────────────────────────────────────────────────────────────────
  analytics: (months = 12): Promise<AnalyticsResponse> =>
    apiClient.get<AnalyticsResponse>(`/api/v1/admin/analytics?months=${months}`),

  // ── Processing failures ───────────────────────────────────────────────────────
  failures: (page = 1, pageSize = 20): Promise<PaginatedResponse<ProcessingFailure>> =>
    apiClient.get<PaginatedResponse<ProcessingFailure>>(
      `/api/v1/admin/failures?page=${page}&pageSize=${pageSize}`,
    ),

  retryFailure: (submissionId: string): Promise<void> =>
    apiClient.post(`/api/v1/admin/uploads/${submissionId}/retry`),

  // ── Publishers ────────────────────────────────────────────────────────────────
  listPublishers: (page = 1, pageSize = 50): Promise<PaginatedResponse<VocabEntry>> =>
    apiClient.get<PaginatedResponse<VocabEntry>>(
      `/api/v1/admin/publishers?page=${page}&pageSize=${pageSize}`,
    ),
  createPublisher: (payload: { name: string; description?: string }): Promise<VocabEntry> =>
    apiClient.post<VocabEntry>('/api/v1/admin/publishers', payload),
  updatePublisher: (id: string, payload: Partial<{ name: string; description: string }>): Promise<VocabEntry> =>
    apiClient.patch<VocabEntry>(`/api/v1/admin/publishers/${id}`, payload),
  deletePublisher: (id: string): Promise<void> =>
    apiClient.delete(`/api/v1/admin/publishers/${id}`),

  // ── Designers ─────────────────────────────────────────────────────────────────
  listDesigners: (page = 1, pageSize = 50): Promise<PaginatedResponse<VocabEntry>> =>
    apiClient.get<PaginatedResponse<VocabEntry>>(
      `/api/v1/admin/designers?page=${page}&pageSize=${pageSize}`,
    ),
  createDesigner: (payload: { name: string; description?: string }): Promise<VocabEntry> =>
    apiClient.post<VocabEntry>('/api/v1/admin/designers', payload),
  updateDesigner: (id: string, payload: Partial<{ name: string; description: string }>): Promise<VocabEntry> =>
    apiClient.patch<VocabEntry>(`/api/v1/admin/designers/${id}`, payload),
  deleteDesigner: (id: string): Promise<void> =>
    apiClient.delete(`/api/v1/admin/designers/${id}`),

  // ── Licenses (admin) ──────────────────────────────────────────────────────────
  listLicenses: (page = 1, pageSize = 50): Promise<PaginatedResponse<LicenseAdmin>> =>
    apiClient.get<PaginatedResponse<LicenseAdmin>>(
      `/api/v1/admin/licenses?page=${page}&pageSize=${pageSize}`,
    ),
  createLicense: (payload: {
    code: string;
    name: string;
    summaryEn: string;
    summaryAm: string;
    fullTextUrl: string;
    allowsRedistribution: boolean;
    allowsCommercialUse: boolean;
    requiresAttribution: boolean;
    isActive?: boolean;
  }): Promise<LicenseAdmin> =>
    apiClient.post<LicenseAdmin>('/api/v1/admin/licenses', payload),
  updateLicense: (id: string, payload: Partial<{
    code: string;
    name: string;
    summaryEn: string;
    summaryAm: string;
    fullTextUrl: string;
    allowsRedistribution: boolean;
    allowsCommercialUse: boolean;
    requiresAttribution: boolean;
    isActive: boolean;
  }>): Promise<LicenseAdmin> =>
    apiClient.patch<LicenseAdmin>(`/api/v1/admin/licenses/${id}`, payload),
  deleteLicense: (id: string): Promise<void> =>
    apiClient.delete(`/api/v1/admin/licenses/${id}`),

  // ── Categories ────────────────────────────────────────────────────────────────
  listCategories: (page = 1, pageSize = 50): Promise<PaginatedResponse<VocabEntry>> =>
    apiClient.get<PaginatedResponse<VocabEntry>>(
      `/api/v1/admin/categories?page=${page}&pageSize=${pageSize}`,
    ),
  createCategory: (payload: { name: string; description?: string }): Promise<VocabEntry> =>
    apiClient.post<VocabEntry>('/api/v1/admin/categories', payload),
  updateCategory: (id: string, payload: Partial<{ name: string; description: string }>): Promise<VocabEntry> =>
    apiClient.patch<VocabEntry>(`/api/v1/admin/categories/${id}`, payload),
  deleteCategory: (id: string): Promise<void> =>
    apiClient.delete(`/api/v1/admin/categories/${id}`),
};
