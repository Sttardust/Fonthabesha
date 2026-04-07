import { apiClient } from './client';
import type {
  ReviewQueueItem,
  AdminReviewSummary,
  AdminReviewDetail,
  ReviewHistoryResponse,
  ReviewAnalytics,
  ReviewDecisionResponse,
  ReprocessResponse,
  SubmissionStatus,
  PaginatedResponse,
  VocabEntry,
  ProcessingFailure,
  LicenseAdmin,
} from '@/lib/types';

// All real admin routes live under /api/v1/admin/reviews
const REVIEWS_PREFIX = '/api/v1/admin/reviews';

export const adminApi = {
  // ── Review summary (dashboard stats) ────────────────────────────────────────

  /** GET /api/v1/admin/reviews/summary — pending/failed/changed/approved counts */
  reviewSummary: (): Promise<AdminReviewSummary> =>
    apiClient.get<AdminReviewSummary>(`${REVIEWS_PREFIX}/summary`),

  // ── Review queue ─────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/admin/reviews — returns a flat array (not paginated).
   * Pass a status to filter; defaults to pending statuses when omitted.
   */
  reviewQueue: (status?: SubmissionStatus): Promise<ReviewQueueItem[]> => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    const qs = params.toString();
    return apiClient.get<ReviewQueueItem[]>(`${REVIEWS_PREFIX}${qs ? `?${qs}` : ''}`);
  },

  /** GET /api/v1/admin/reviews/:submissionId — full review detail */
  getReview: (id: string): Promise<AdminReviewDetail> =>
    apiClient.get<AdminReviewDetail>(`${REVIEWS_PREFIX}/${id}`),

  /** GET /api/v1/admin/reviews/:submissionId/history */
  getReviewHistory: (
    id: string,
    page = 1,
    pageSize = 25,
  ): Promise<ReviewHistoryResponse> =>
    apiClient.get<ReviewHistoryResponse>(
      `${REVIEWS_PREFIX}/${id}/history?page=${page}&pageSize=${pageSize}`,
    ),

  // ── Review decisions ─────────────────────────────────────────────────────────

  /**
   * POST /api/v1/admin/reviews/:id/approve
   * Returns a lightweight decision confirmation, not the full review detail.
   * Refetch getReview() afterwards to update UI.
   */
  approve: (id: string, notes?: string): Promise<ReviewDecisionResponse> =>
    apiClient.post<ReviewDecisionResponse>(`${REVIEWS_PREFIX}/${id}/approve`, { notes }),

  /**
   * POST /api/v1/admin/reviews/:id/request-changes (notes required)
   * Returns a lightweight decision confirmation.
   */
  requestChanges: (id: string, notes: string): Promise<ReviewDecisionResponse> =>
    apiClient.post<ReviewDecisionResponse>(`${REVIEWS_PREFIX}/${id}/request-changes`, { notes }),

  /**
   * POST /api/v1/admin/reviews/:id/reject (notes required)
   * Returns a lightweight decision confirmation.
   */
  reject: (id: string, notes: string): Promise<ReviewDecisionResponse> =>
    apiClient.post<ReviewDecisionResponse>(`${REVIEWS_PREFIX}/${id}/reject`, { notes }),

  /**
   * POST /api/v1/admin/reviews/:id/reprocess
   * Re-queues font processing for a failed or stuck submission.
   */
  reprocess: (id: string, notes?: string): Promise<ReprocessResponse> =>
    apiClient.post<ReprocessResponse>(`${REVIEWS_PREFIX}/${id}/reprocess`, { notes }),

  // ── Review analytics ─────────────────────────────────────────────────────────

  /**
   * GET /api/v1/admin/reviews/analytics
   * @param from ISO date string (YYYY-MM-DD), defaults to 30 days ago
   * @param to   ISO date string (YYYY-MM-DD), defaults to today
   */
  analytics: (from: string, to: string): Promise<ReviewAnalytics> =>
    apiClient.get<ReviewAnalytics>(
      `${REVIEWS_PREFIX}/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    ),

  // ── Search index ─────────────────────────────────────────────────────────────

  /** POST /api/v1/admin/search/reindex — rebuild the search index */
  reindex: (): Promise<void> =>
    apiClient.post('/api/v1/admin/search/reindex'),

  // ── Processing failures ───────────────────────────────────────────────────────

  failures: (page = 1, pageSize = 25): Promise<PaginatedResponse<ProcessingFailure>> =>
    apiClient.get<PaginatedResponse<ProcessingFailure>>(
      `/api/v1/admin/failures?page=${page}&pageSize=${pageSize}`,
    ),

  retryFailure: (submissionId: string): Promise<void> =>
    apiClient.post(`/api/v1/admin/failures/${submissionId}/retry`),

  // ── Publishers ────────────────────────────────────────────────────────────────

  listPublishers: (page = 1, pageSize = 25): Promise<PaginatedResponse<VocabEntry>> =>
    apiClient.get<PaginatedResponse<VocabEntry>>(
      `/api/v1/admin/publishers?page=${page}&pageSize=${pageSize}`,
    ),

  createPublisher: (payload: { name: string; description?: string }): Promise<VocabEntry> =>
    apiClient.post<VocabEntry>('/api/v1/admin/publishers', payload),

  updatePublisher: (id: string, payload: { name?: string; description?: string }): Promise<VocabEntry> =>
    apiClient.patch<VocabEntry>(`/api/v1/admin/publishers/${id}`, payload),

  deletePublisher: (id: string): Promise<void> =>
    apiClient.delete(`/api/v1/admin/publishers/${id}`),

  // ── Designers ─────────────────────────────────────────────────────────────────

  listDesigners: (page = 1, pageSize = 25): Promise<PaginatedResponse<VocabEntry>> =>
    apiClient.get<PaginatedResponse<VocabEntry>>(
      `/api/v1/admin/designers?page=${page}&pageSize=${pageSize}`,
    ),

  createDesigner: (payload: { name: string; description?: string }): Promise<VocabEntry> =>
    apiClient.post<VocabEntry>('/api/v1/admin/designers', payload),

  updateDesigner: (id: string, payload: { name?: string; description?: string }): Promise<VocabEntry> =>
    apiClient.patch<VocabEntry>(`/api/v1/admin/designers/${id}`, payload),

  deleteDesigner: (id: string): Promise<void> =>
    apiClient.delete(`/api/v1/admin/designers/${id}`),

  // ── Categories ────────────────────────────────────────────────────────────────

  listCategories: (page = 1, pageSize = 25): Promise<PaginatedResponse<VocabEntry>> =>
    apiClient.get<PaginatedResponse<VocabEntry>>(
      `/api/v1/admin/categories?page=${page}&pageSize=${pageSize}`,
    ),

  createCategory: (payload: { name: string; description?: string }): Promise<VocabEntry> =>
    apiClient.post<VocabEntry>('/api/v1/admin/categories', payload),

  updateCategory: (id: string, payload: { name?: string; description?: string }): Promise<VocabEntry> =>
    apiClient.patch<VocabEntry>(`/api/v1/admin/categories/${id}`, payload),

  deleteCategory: (id: string): Promise<void> =>
    apiClient.delete(`/api/v1/admin/categories/${id}`),

  // ── Licenses (admin CRUD) ─────────────────────────────────────────────────────

  listLicenses: (page = 1, pageSize = 25): Promise<PaginatedResponse<LicenseAdmin>> =>
    apiClient.get<PaginatedResponse<LicenseAdmin>>(
      `/api/v1/admin/licenses?page=${page}&pageSize=${pageSize}`,
    ),

  createLicense: (payload: Omit<LicenseAdmin, 'id' | 'createdAt'>): Promise<LicenseAdmin> =>
    apiClient.post<LicenseAdmin>('/api/v1/admin/licenses', payload),

  updateLicense: (id: string, payload: Partial<Omit<LicenseAdmin, 'id' | 'createdAt'>>): Promise<LicenseAdmin> =>
    apiClient.patch<LicenseAdmin>(`/api/v1/admin/licenses/${id}`, payload),

  deleteLicense: (id: string): Promise<void> =>
    apiClient.delete(`/api/v1/admin/licenses/${id}`),
};
