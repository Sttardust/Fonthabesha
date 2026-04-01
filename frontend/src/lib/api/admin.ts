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
};
