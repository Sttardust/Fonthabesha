import { apiClient } from './client';
import type { Collection, PaginatedResponse } from '@/lib/types';

const PREFIX = '/api/v1/collections';

export const collectionsApi = {
  /**
   * List public collections — no auth required.
   * Collections is a public-browsing feature per V1 spec.
   */
  list: (page = 1, pageSize = 20): Promise<PaginatedResponse<Collection>> =>
    apiClient.get<PaginatedResponse<Collection>>(
      `${PREFIX}?page=${page}&pageSize=${pageSize}`,
    ),

  /** Get a single collection by id (public) */
  get: (id: string): Promise<Collection> =>
    apiClient.get<Collection>(`${PREFIX}/${id}`),

  /** Create a new collection (admin) */
  create: (payload: { name: string; description?: string; isPublic?: boolean }): Promise<Collection> =>
    apiClient.post<Collection>(PREFIX, payload),

  /** Update a collection (admin) */
  update: (id: string, payload: Partial<{ name: string; description: string; isPublic: boolean }>): Promise<Collection> =>
    apiClient.patch<Collection>(`${PREFIX}/${id}`, payload),

  /** Delete a collection (admin) */
  delete: (id: string): Promise<void> =>
    apiClient.delete(`${PREFIX}/${id}`),

  /** Add a font family to a collection (admin) */
  addFamily: (collectionId: string, familyId: string): Promise<void> =>
    apiClient.post(`${PREFIX}/${collectionId}/families/${familyId}`),

  /** Remove a font family from a collection (admin) */
  removeFamily: (collectionId: string, familyId: string): Promise<void> =>
    apiClient.delete(`${PREFIX}/${collectionId}/families/${familyId}`),
};
