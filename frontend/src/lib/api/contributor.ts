import { apiClient } from './client';
import type {
  SubmissionSummary,
  SubmissionDetail,
  CreateSubmissionResponse,
  UpdateMetadataResponse,
  UpdateStyleResponse,
  SubmitSubmissionResponse,
} from '@/lib/types';

const PREFIX = '/api/v1/submissions';

// ── Request payload types (aligned with backend DTOs) ─────────────────────────

/**
 * Matches backend CreateSubmissionDto.
 * Note: `declaredLicenseId` is the UUID of a License record (GET /api/v1/licenses).
 * `ownershipEvidenceType` must be one of the OwnershipEvidenceType enum values.
 */
export interface CreateSubmissionPayload {
  familyNameEn: string;
  familyNameAm?: string;
  nativeName?: string;
  slug?: string;
  descriptionEn?: string;
  descriptionAm?: string;
  primaryLanguage?: string;
  categoryId?: string;
  declaredLicenseId: string;
  ownershipEvidenceType:
    | 'source_url'
    | 'repository_url'
    | 'license_file'
    | 'ownership_statement'
    | 'other_document';
  ownershipEvidenceValue: string;
  contributorStatementText: string;
  termsAcceptanceName: string;
  supportsLatin?: boolean;
}

/** Matches backend UpdateSubmissionMetadataDto */
export interface UpdateSubmissionMetadataPayload {
  familyNameEn?: string;
  familyNameAm?: string | null;
  nativeName?: string | null;
  slug?: string;
  descriptionEn?: string | null;
  descriptionAm?: string | null;
  primaryLanguage?: string | null;
  categoryId?: string | null;
  supportsLatin?: boolean;
}

/** Matches backend UpdateSubmissionStyleDto */
export interface UpdateSubmissionStylePayload {
  name?: string;
  slug?: string;
  weightClass?: number;
  weightLabel?: string;
  isItalic?: boolean;
  isDefault?: boolean;
}

// ── API client ────────────────────────────────────────────────────────────────

export const contributorApi = {
  /**
   * List all submissions for the authenticated contributor.
   * Returns a flat array (not paginated).
   */
  list: (): Promise<SubmissionSummary[]> =>
    apiClient.get<SubmissionSummary[]>(PREFIX),

  /** Get full detail of a single submission */
  get: (id: string): Promise<SubmissionDetail> =>
    apiClient.get<SubmissionDetail>(`${PREFIX}/${id}`),

  /**
   * Create a new draft submission.
   * Returns a minimal response — navigate to detail page using response.id.
   */
  create: (payload: CreateSubmissionPayload): Promise<CreateSubmissionResponse> =>
    apiClient.post<CreateSubmissionResponse>(PREFIX, payload),

  /**
   * Update submission metadata (family name, description, category, etc.).
   * Returns the updated family fields only, not the full submission detail.
   */
  updateMetadata: (
    id: string,
    payload: UpdateSubmissionMetadataPayload,
  ): Promise<UpdateMetadataResponse> =>
    apiClient.patch<UpdateMetadataResponse>(`${PREFIX}/${id}/metadata`, payload),

  /**
   * Update a single style's metadata (name, weight, italic flag, etc.).
   * Returns the updated style record only, not the full submission detail.
   */
  updateStyle: (
    submissionId: string,
    styleId: string,
    payload: UpdateSubmissionStylePayload,
  ): Promise<UpdateStyleResponse> =>
    apiClient.patch<UpdateStyleResponse>(
      `${PREFIX}/${submissionId}/styles/${styleId}`,
      payload,
    ),

  /**
   * Submit for review.
   * Transitions status from ready_for_submission / changes_requested → needs_review.
   * Requires at least one completed upload.
   */
  submit: (id: string): Promise<SubmitSubmissionResponse> =>
    apiClient.post<SubmitSubmissionResponse>(`${PREFIX}/${id}/submit`),
};
