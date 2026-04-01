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

export interface SubmissionDetail extends SubmissionSummary {
  styles: {
    id: string;
    name: BilingualString;
    weight: number;
    isItalic: boolean;
    fileName: string;
    uploadStatus: 'pending' | 'processing' | 'ready' | 'error';
    errorMessage: string | null;
  }[];
}

// ── Admin / review ─────────────────────────────────────────────────────────────

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
