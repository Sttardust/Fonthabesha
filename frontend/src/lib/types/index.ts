// ─────────────────────────────────────────────────────────────────────────────
// Fonthabesha frontend types — aligned with backend response shapes
// ─────────────────────────────────────────────────────────────────────────────

// ── Primitives ─────────────────────────────────────────────────────────────────

export interface BilingualString {
  am: string | null;
  en: string | null;
}

// ── Pagination (matches backend: { items, pagination }) ────────────────────────

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ── Enums / literals ───────────────────────────────────────────────────────────

export type UserRole = 'user' | 'contributor' | 'reviewer' | 'admin';

/** Real Prisma SubmissionStatus enum values */
export type SubmissionStatus =
  | 'draft'
  | 'uploaded'
  | 'processing'
  | 'processing_failed'
  | 'ready_for_submission'
  | 'needs_review'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'archived';

/** Real Prisma UploadProcessingStatus enum values */
export type UploadProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed';

// ── Catalog filter options (GET /api/v1/fonts/filters) ────────────────────────

export interface CatalogCategory { name: string; slug: string; }
export interface CatalogLicense { code: string; name: string; }
export interface CatalogPublisher { id: string; name: string; slug: string; }
export interface CatalogDesigner { id: string; name: string; slug: string; }
export interface CatalogTag { id: string; nameEn: string; nameAm: string | null; slug: string; }

export interface CatalogFilters {
  categories: CatalogCategory[];
  licenses: CatalogLicense[];
  publishers: CatalogPublisher[];
  designers: CatalogDesigner[];
  tags: CatalogTag[];
}

// ── Font list item (GET /api/v1/fonts — mapFamilyListItem) ─────────────────────

export interface FontFamilySummary {
  id: string;
  slug: string;
  /** name.native is the original-script name (e.g. Ethiopic) */
  name: { en: string | null; am: string | null; native: string | null };
  category: string | null;
  script: string | null;
  license: { code: string; name: string } | null;
  publisher: { id: string; name: string } | null;
  designers: Array<{ id: string; name: string }>;
  tags: string[];
  numberOfStyles: number;
  hasVariableStyles: boolean;
  defaultPreviewStyleId: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
}

// ── Font style detail (GET /api/v1/fonts/:slug/styles — mapStyleDetail) ────────

export interface FontStyleDetail {
  id: string;
  name: string;
  slug: string;
  /** Absolute URL served via /api/v1/assets/styles/:id */
  assetUrl: string;
  weightClass: number | null;
  weightLabel: string | null;
  isItalic: boolean;
  isVariable: boolean;
  isDefault: boolean;
  format: string | null;
  fileSizeBytes: number;
  axes: unknown[];
  features: unknown[];
  metrics: Record<string, unknown>;
}

// ── Font family detail (GET /api/v1/fonts/:slug) ───────────────────────────────

export interface FontFamilyDetail {
  id: string;
  slug: string;
  name: { en: string | null; am: string | null; native: string | null };
  description: { en: string | null; am: string | null };
  category: string | null;
  script: string | null;
  primaryLanguage: string | null;
  license: {
    code: string;
    name: string;
    summary: { en: string | null; am: string | null };
  } | null;
  publisher: { id: string; name: string; slug: string } | null;
  designers: Array<{ id: string; name: string; slug: string }>;
  tags: Array<{ id: string; name: { en: string | null; am: string | null }; slug: string }>;
  supports: { ethiopic: boolean; latin: boolean };
  specimenDefaults: { am: string | null; en: string | null };
  styles: FontStyleDetail[];
  download: { familyPackageAvailable: boolean };
  /** Backend returns empty array — pairings are intentionally out of scope */
  relatedFamilies: FontFamilySummary[];
  coverImageUrl: string | null;
  publishedAt: string | null;
  version: string | null;
}

// ── Search / filter params (maps to ListFontsDto) ──────────────────────────────

export interface SearchFilters {
  q?: string;
  category?: string;
  script?: string;
  license?: string;
  publisher?: string;
  /** Query param name matches backend: `variable` (boolean) */
  variable?: boolean;
  sort?: 'popular' | 'newest' | 'alphabetical';
  page?: number;
  pageSize?: number;
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

/** Full user profile returned by backend (toCurrentUserProfile) */
export interface CurrentUserProfile {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  displayName: string | null;
  legalFullName: string | null;
  countryCode: string | null;
  organizationName: string | null;
  phoneNumber: string | null;
  role: UserRole;
  status: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: CurrentUserProfile;
}

// ── Downloads ─────────────────────────────────────────────────────────────────

export interface DownloadUrlResponse {
  url: string;
  expiresAt: string;
}

// ── Submissions (contributor) ──────────────────────────────────────────────────

/** One item from GET /api/v1/submissions (returns flat array, not paginated) */
export interface SubmissionSummary {
  id: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  family: {
    id: string;
    slug: string | null;
    nameEn: string;
    nameAm: string | null;
  };
  declaredLicense: {
    id: string;
    code: string;
    name: string;
  } | null;
}

/** One upload record inside a submission detail */
export interface SubmissionUpload {
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256: string | null;
  metadata: unknown;
  warnings: unknown[];
  processingError: string | null;
  processingStatus: UploadProcessingStatus;
  uploadedAt: string;
  processedAt: string | null;
}

/** One style record inside a submission detail */
export interface SubmissionStyleRecord {
  id: string;
  name: string;
  slug: string;
  weightClass: number | null;
  weightLabel: string | null;
  isItalic: boolean;
  isDefault: boolean;
  format: string | null;
  fileSizeBytes: number;
  sha256: string | null;
  status: string;
}

/** GET /api/v1/submissions/:id (getContributorSubmissionDetail) */
export interface SubmissionDetail {
  id: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  family: {
    id: string;
    slug: string | null;
    nameEn: string;
    nameAm: string | null;
    nativeName: string | null;
    descriptionEn: string | null;
    descriptionAm: string | null;
    primaryLanguage: string | null;
    supportsEthiopic: boolean;
    supportsLatin: boolean;
    category: { id: string; name: string; slug: string } | null;
  };
  declaredLicense: { id: string; code: string; name: string } | null;
  uploads: SubmissionUpload[];
  styles: SubmissionStyleRecord[];
  analysis: {
    status: string;
    completedUploadCount: number;
    queuedUploadCount: number;
    processingUploadCount: number;
    processingWarnings: unknown[];
    blockingIssues: Array<{ uploadId: string; message: string | null }>;
  };
  review: {
    actionRequired: boolean;
    actionItems: unknown[];
    issueResolutions: unknown[];
    cycle: unknown;
    latestContributorFeedback: ReviewEvent | null;
    history: ReviewEvent[];
  };
  permissions: {
    canEditMetadata: boolean;
    canEditStyles: boolean;
    canSubmitForReview: boolean;
  };
}

// ── Uploads (POST /api/v1/uploads/init + /complete) ───────────────────────────

export interface InitUploadPayload {
  submissionId: string;
  filename: string;
  contentType: string;
}

export interface InitUploadResponse {
  uploadId: string;
  submission: {
    id: string;
    status: SubmissionStatus;
    family: { id: string; slug: string | null; nameEn: string };
  };
  upload: {
    storageKey: string;
    filename: string;
    contentType: string;
    expiresInSeconds: number;
    method: string;
    url: string;
  };
}

export interface CompleteUploadPayload {
  uploadId: string;
  sha256?: string;
}

// ── Review history event ───────────────────────────────────────────────────────

export interface ReviewActor {
  id: string;
  displayName: string | null;
  email: string;
  role: UserRole;
}

export interface ReviewEvent {
  id: string;
  /** ReviewAction enum from backend (e.g. submitted, approved, request_changes, ...) */
  action: string;
  notes: string | null;
  createdAt: string;
  actor: ReviewActor | null;
}

// ── Admin / review ─────────────────────────────────────────────────────────────

/** One item from GET /api/v1/admin/reviews (listReviewQueue — flat array) */
export interface ReviewQueueItem {
  submissionId: string;
  familyId: string;
  slug: string | null;
  name: { en: string | null; am: string | null };
  status: SubmissionStatus;
  publisher: { id: string; name: string } | null;
  submittedBy: { id: string; displayName: string | null; email: string };
  submittedAt: string | null;
  uploadCount: number;
}

/** GET /api/v1/admin/reviews/summary */
export interface AdminReviewSummary {
  counts: {
    needsReview: number;
    processingFailed: number;
    changesRequested: number;
    approved7d: number;
    rejected7d: number;
  };
}

export interface AdminStyleRecord {
  id: string;
  name: string;
  slug: string;
  weightClass: number | null;
  weightLabel: string | null;
  isItalic: boolean;
  isDefault: boolean;
  format: string | null;
  fileSizeBytes: number;
  sha256: string | null;
  status: string;
}

export interface AdminUploadRecord extends SubmissionUpload {
  storageKey: string | null;
  uploader: { id: string; displayName: string | null; email: string } | null;
}

/** GET /api/v1/admin/reviews/:submissionId (getReviewDetail) */
export interface AdminReviewDetail {
  family: {
    id: string;
    slug: string | null;
    status: SubmissionStatus;
    name: { en: string | null; am: string | null };
    description: { en: string | null; am: string | null };
    publisher: { id: string; name: string } | null;
    category: { id: string; name: string; slug: string } | null;
    script: string | null;
    primaryLanguage: string | null;
    supportsEthiopic: boolean;
    supportsLatin: boolean;
    publishedAt: string | null;
  };
  submissionId: string;
  submission: {
    submittedBy: {
      id: string;
      displayName: string | null;
      email: string;
      legalFullName: string | null;
      countryCode: string | null;
      organizationName: string | null;
      phoneNumber: string | null;
    };
    submittedAt: string | null;
    declaredLicense: { id: string; code: string; name: string } | null;
    ownershipEvidence: { type: string; value: string };
    contributorAssent: {
      termsVersion: string | null;
      acceptedAt: string | null;
      acceptanceName: string | null;
    };
  };
  styles: AdminStyleRecord[];
  processing: {
    status: string;
    warnings: unknown[];
    blockingIssues: unknown[];
  };
  uploads: AdminUploadRecord[];
  reviewHistory: ReviewEvent[];
  permissions: {
    canApprove: boolean;
    canReject: boolean;
    canRequestChanges: boolean;
    canReprocess: boolean;
  };
}

/** GET /api/v1/admin/reviews/analytics — review activity analytics */
export interface ReviewAnalytics {
  filters: { from: string; to: string; timezone: string };
  queue: { needsReview: number; processingFailed: number; changesRequested: number };
  totals: {
    submitted: number;
    approved: number;
    rejected: number;
    requestChanges: number;
    processingFailed: number;
    reprocessed: number;
  };
  turnaround: {
    reviewedSubmissionCount: number;
    averageHours: number | null;
    averageHoursByDecision: Record<string, number | null>;
  };
  topIssueCodes: Array<{ issueCode: string; count: number }>;
  reviewerBreakdown: Array<{
    reviewer: { id: string; displayName: string | null; email: string; role: string };
    decisionCounts: { approved: number; rejected: number; requestChanges: number };
    reviewedSubmissionCount: number;
    latestDecisionAt: string | null;
    turnaroundHours: { average: number | null };
  }>;
}

/** Paginated review history (GET /api/v1/admin/reviews/:id/history) */
export interface ReviewHistoryResponse {
  items: ReviewEvent[];
  pagination: PaginationMeta;
}

// ── Mutation response shapes (action-specific, NOT full SubmissionDetail) ──────

/**
 * POST /api/v1/submissions — createDraftSubmission response.
 * Returns minimal shape; redirect to detail page after create.
 */
export interface CreateSubmissionResponse {
  id: string;
  status: SubmissionStatus;
  family: { id: string; slug: string | null; nameEn: string; nameAm: string | null };
  declaredLicense: { id: string; code: string; name: string } | null;
  termsVersion: string;
  createdAt: string;
}

/**
 * PATCH /api/v1/submissions/:id/metadata — updateContributorSubmissionMetadata response.
 */
export interface UpdateMetadataResponse {
  submissionId: string;
  status: SubmissionStatus;
  family: {
    id: string;
    slug: string | null;
    nameEn: string;
    nameAm: string | null;
    nativeName: string | null;
    descriptionEn: string | null;
    descriptionAm: string | null;
    primaryLanguage: string | null;
    supportsLatin: boolean;
    category: { id: string; name: string; slug: string } | null;
  };
}

/**
 * PATCH /api/v1/submissions/:id/styles/:styleId — updateContributorStyle response.
 */
export interface UpdateStyleResponse {
  submissionId: string;
  status: SubmissionStatus;
  style: {
    id: string;
    name: string;
    slug: string;
    weightClass: number | null;
    weightLabel: string | null;
    isItalic: boolean;
    isDefault: boolean;
    format: string | null;
    fileSizeBytes: number;
    sha256: string | null;
    status: string;
  };
}

/**
 * POST /api/v1/submissions/:id/submit — submitContributorSubmission response.
 */
export interface SubmitSubmissionResponse {
  id: string;
  status: SubmissionStatus;
  submittedAt: string;
  family: { id: string; slug: string | null; nameEn: string; nameAm: string | null };
  completedUploadCount: number;
}

/**
 * POST /api/v1/admin/reviews/:id/{approve|reject|request-changes} response.
 */
export interface ReviewDecisionResponse {
  submissionId: string;
  familyId: string;
  status: SubmissionStatus;
  publishedAt: string | null;
  reviewDecision: {
    action: 'approved' | 'rejected' | 'request_changes';
    notes: string | null;
    metadata: unknown;
  };
}

/**
 * POST /api/v1/admin/reviews/:id/reprocess response.
 */
export interface ReprocessResponse {
  submission: {
    id: string;
    status: SubmissionStatus;
    family: { id: string; slug: string | null; nameEn: string };
  };
  reprocessedUploadCount: number;
  skippedUploadCount: number;
  uploads: unknown[];
}
