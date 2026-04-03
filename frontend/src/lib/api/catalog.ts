import { apiClient } from './client';
import type {
  FontFamilySummary,
  FontFamilyDetail,
  FontStyleDetail,
  PaginatedResponse,
  CatalogFilters,
  SearchFilters,
} from '@/lib/types';

const PREFIX = '/api/v1/fonts';

export const catalogApi = {
  /**
   * List font families with optional filters and pagination.
   * Returns { items, pagination } — matches backend shape.
   */
  list: (filters: SearchFilters = {}): Promise<PaginatedResponse<FontFamilySummary>> => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.category) params.set('category', filters.category);
    if (filters.script) params.set('script', filters.script);
    if (filters.license) params.set('license', filters.license);
    if (filters.publisher) params.set('publisher', filters.publisher);
    // backend param is `variable` (boolean), not `isVariable`
    if (filters.variable !== undefined) params.set('variable', String(filters.variable));
    if (filters.sort) params.set('sort', filters.sort);
    params.set('page', String(filters.page ?? 1));
    params.set('pageSize', String(filters.pageSize ?? 20));

    const query = params.toString();
    return apiClient.get<PaginatedResponse<FontFamilySummary>>(
      `${PREFIX}${query ? `?${query}` : ''}`,
    );
  },

  /**
   * Full-text search (uses search index when q is present, falls back to DB).
   * Same response shape as list().
   */
  search: (filters: SearchFilters = {}): Promise<PaginatedResponse<FontFamilySummary>> => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.category) params.set('category', filters.category);
    if (filters.script) params.set('script', filters.script);
    if (filters.license) params.set('license', filters.license);
    if (filters.publisher) params.set('publisher', filters.publisher);
    if (filters.variable !== undefined) params.set('variable', String(filters.variable));
    if (filters.sort) params.set('sort', filters.sort);
    params.set('page', String(filters.page ?? 1));
    params.set('pageSize', String(filters.pageSize ?? 20));

    return apiClient.get<PaginatedResponse<FontFamilySummary>>(
      `/api/v1/search/fonts?${params.toString()}`,
    );
  },

  /** Get a single font family detail by slug */
  getBySlug: (slug: string): Promise<FontFamilyDetail> =>
    apiClient.get<FontFamilyDetail>(`${PREFIX}/${slug}`),

  /** Get all approved styles for a font family by slug */
  getStyles: (slug: string): Promise<FontStyleDetail[]> =>
    apiClient.get<FontStyleDetail[]>(`${PREFIX}/${slug}/styles`),

  /**
   * Get all available filter facets (categories, licenses, publishers, designers, tags).
   * Use this to populate filter dropdowns in the catalog.
   */
  filters: (): Promise<CatalogFilters> =>
    apiClient.get<CatalogFilters>(`${PREFIX}/filters`),
};
