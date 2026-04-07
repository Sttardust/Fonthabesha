import { apiClient } from './client';
import type { Collection } from '@/lib/types';

const PREFIX = '/api/v1/collections';

export const collectionsApi = {
  /** GET /api/v1/collections — returns a flat array of collection cards */
  list: (): Promise<Collection[]> =>
    apiClient.get<Collection[]>(PREFIX),

  /** GET /api/v1/collections/:identifier — identifier can be id or slug */
  get: (identifier: string): Promise<Collection> =>
    apiClient.get<Collection>(`${PREFIX}/${identifier}`),

  // Admin methods (not available on public API — use adminApi for these)
  create: (_payload: unknown): never => {
    throw new Error('Use adminApi for collection mutations');
  },
  update: (_id: string, _payload: unknown): never => {
    throw new Error('Use adminApi for collection mutations');
  },
  delete: (_id: string): never => {
    throw new Error('Use adminApi for collection mutations');
  },
};
