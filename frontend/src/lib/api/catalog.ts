import { apiClient } from './client';
import type {
  FontFamilySummary,
  FontFamilyDetail,
  PaginatedResponse,
  SearchFilters,
} from '@/lib/types';

const PREFIX = '/api/v1/fonts';

export const catalogApi = {
  /** List font families with optional filters and pagination */
  list: (filters: SearchFilters = {}): Promise<PaginatedResponse<FontFamilySummary>> => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.category) params.set('category', filters.category);
    if (filters.script) params.set('script', filters.script);
    if (filters.isVariable !== undefined) params.set('isVariable', String(filters.isVariable));
    if (filters.isFeatured !== undefined) params.set('isFeatured', String(filters.isFeatured));
    if (filters.tags?.length) params.set('tags', filters.tags.join(','));
    if (filters.sort) params.set('sort', filters.sort);
    params.set('page', String(filters.page ?? 1));
    params.set('pageSize', String(filters.pageSize ?? 20));

    const query = params.toString();
    return apiClient.get<PaginatedResponse<FontFamilySummary>>(
      `${PREFIX}${query ? `?${query}` : ''}`,
    );
  },

  /** Get a single font family by slug */
  getBySlug: (slug: string): Promise<FontFamilyDetail> =>
    apiClient.get<FontFamilyDetail>(`${PREFIX}/${slug}`),

  /** Get featured fonts for the homepage hero */
  featured: (): Promise<FontFamilySummary[]> =>
    apiClient
      .get<PaginatedResponse<FontFamilySummary>>(`${PREFIX}?isFeatured=true&pageSize=6`)
      .then((r) => r.data),

  /** Get all available tags */
  tags: (): Promise<string[]> => apiClient.get<string[]>('/api/v1/tags'),
};
