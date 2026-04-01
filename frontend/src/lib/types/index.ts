// ── Primitives ─────────────────────────────────────────────────────────────────

export interface BilingualString {
  am: string | null;
  en: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Enums / literals ───────────────────────────────────────────────────────────

export type UserRole = 'user' | 'contributor' | 'reviewer' | 'admin';

export type SubmissionStatus =
  | 'draft'
  | 'pending_review'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'published';

export type FontCategory =
  | 'serif'
  | 'sans_serif'
  | 'display'
  | 'handwriting'
  | 'monospace'
  | 'decorative';

export type ScriptSupport = 'ethiopic' | 'latin' | 'both';

// ── Font catalog ───────────────────────────────────────────────────────────────

export interface FontStyleSummary {
  id: string;
  name: BilingualString;
  weight: number;
  isItalic: boolean;
  /** Direct URL to the font file – use in CSS @font-face src */
  assetUrl: string;
}

export interface FontFamilySummary {
  id: string;
  slug: string;
  name: BilingualString;
  designer: BilingualString | null;
  category: FontCategory;
  scriptSupport: ScriptSupport;
  styles: FontStyleSummary[];
  tags: string[];
  isVariable: boolean;
  isFeatured: boolean;
  downloadCount: number;
  createdAt: string;
}

export interface FontFamilyDetail extends FontFamilySummary {
  description: BilingualString | null;
  license: string;
  licenseUrl: string | null;
  pairsWith: FontFamilySummary[];
  submissionId: string | null;
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    role: UserRole;
  };
}

// ── Downloads ─────────────────────────────────────────────────────────────────

export interface DownloadUrlResponse {
  url: string;
  expiresAt: string;
}

// ── Collections ───────────────────────────────────────────────────────────────

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  families: FontFamilySummary[];
  createdAt: string;
  updatedAt: string;
}

// ── Submissions (contributor) ──────────────────────────────────────────────────

export interface SubmissionSummary {
  id: string;
  familyName: BilingualString;
  status: SubmissionStatus;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionStyle {
  id: string;
  name: BilingualString;
  weight: number;
  isItalic: boolean;
  fileName: string;
  uploadStatus: 'pending' | 'processing' | 'ready' | 'error';
  errorMessage: string | null;
  /** Present when uploadStatus === 'ready'; use in CSS @font-face */
  assetUrl: string | null;
}

export interface SubmissionDetail extends SubmissionSummary {
  styles: SubmissionStyle[];
}

// ── Admin / review ─────────────────────────────────────────────────────────────

export interface ReviewEvent {
  id: string;
  action: 'submitted' | 'approved' | 'request_changes' | 'rejected' | 'resubmitted';
  notes: string | null;
  actorEmail: string;
  createdAt: string;
}

export interface AdminSubmissionDetail extends SubmissionDetail {
  designerName: BilingualString | null;
  description: BilingualString | null;
  category: FontCategory;
  scriptSupport: ScriptSupport;
  license: string;
  licenseUrl: string | null;
  tags: string[];
  contributorEmail: string;
  reviewHistory: ReviewEvent[];
}

export interface ReviewQueueItem {
  submissionId: string;
  familyName: BilingualString;
  contributorEmail: string;
  status: SubmissionStatus;
  submittedAt: string;
}

export interface AdminStats {
  totalFamilies: number;
  pendingReviews: number;
  totalDownloads: number;
  activeContributors: number;
}

// ── Vocabulary (admin-managed tags) ───────────────────────────────────────────

export interface VocabularyTag {
  id: string;
  name: string;
  usageCount: number;
  createdAt: string;
}

// ── Analytics ──────────────────────────────────────────────────────────────────

export interface AnalyticsPeriod {
  /** ISO month string: "2024-01" */
  period: string;
  downloads: number;
  newFamilies: number;
  newSubmissions: number;
}

export interface TopFont {
  familyId: string;
  slug: string;
  name: BilingualString;
  downloads: number;
  category: FontCategory;
}

export interface AnalyticsResponse {
  periods: AnalyticsPeriod[];
  topFonts: TopFont[];
  totalDownloads: number;
  totalFamilies: number;
  totalContributors: number;
}

// ── Admin collection ───────────────────────────────────────────────────────────

export interface AdminCollection {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  familyCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface SearchFilters {
  q?: string;
  category?: FontCategory;
  script?: ScriptSupport;
  tags?: string[];
  isVariable?: boolean;
  isFeatured?: boolean;
  page?: number;
  pageSize?: number;
  sort?: 'newest' | 'popular' | 'name';
}
