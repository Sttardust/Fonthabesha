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
};
