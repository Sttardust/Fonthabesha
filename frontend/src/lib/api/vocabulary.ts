import { apiClient } from './client';
import type { VocabularyTag, PaginatedResponse } from '@/lib/types';

const PREFIX = '/api/v1/admin/vocabulary';

export const vocabularyApi = {
  /** List all tags with usage counts */
  list: (page = 1, pageSize = 50): Promise<PaginatedResponse<VocabularyTag>> =>
    apiClient.get<PaginatedResponse<VocabularyTag>>(
      `${PREFIX}?page=${page}&pageSize=${pageSize}`,
    ),

  /** Create a new tag */
  create: (name: string): Promise<VocabularyTag> =>
    apiClient.post<VocabularyTag>(PREFIX, { name }),

  /** Rename an existing tag */
  update: (id: string, name: string): Promise<VocabularyTag> =>
    apiClient.patch<VocabularyTag>(`${PREFIX}/${id}`, { name }),

  /** Delete a tag (backend should handle re-tagging or warn if in use) */
  delete: (id: string): Promise<void> =>
    apiClient.delete(`${PREFIX}/${id}`),
};
