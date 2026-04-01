import { apiClient } from './client';
import type { Collection, PaginatedResponse } from '@/lib/types';

const PREFIX = '/api/v1/collections';

export const collectionsApi = {
  /** Get the authenticated user's collections */
  list: (page = 1, pageSize = 20): Promise<PaginatedResponse<Collection>> =>
    apiClient.get<PaginatedResponse<Collection>>(
      `${PREFIX}?page=${page}&pageSize=${pageSize}`,
    ),

  /** Get a single collection by id */
  get: (id: string): Promise<Collection> =>
    apiClient.get<Collection>(`${PREFIX}/${id}`),

  /** Create a new collection */
  create: (payload: { name: string; description?: string; isPublic?: boolean }): Promise<Collection> =>
    apiClient.post<Collection>(PREFIX, payload),

  /** Update a collection */
  update: (id: string, payload: Partial<{ name: string; description: string; isPublic: boolean }>): Promise<Collection> =>
    apiClient.patch<Collection>(`${PREFIX}/${id}`, payload),

  /** Delete a collection */
  delete: (id: string): Promise<void> =>
    apiClient.delete(`${PREFIX}/${id}`),

  /** Add a font family to a collection */
  addFamily: (collectionId: string, familyId: string): Promise<void> =>
    apiClient.post(`${PREFIX}/${collectionId}/families/${familyId}`),

  /** Remove a font family from a collection */
  removeFamily: (collectionId: string, familyId: string): Promise<void> =>
    apiClient.delete(`${PREFIX}/${collectionId}/families/${familyId}`),
};
