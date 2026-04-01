/**
 * Collections API
 *
 * NOTE: The collections feature is not yet implemented in the backend.
 * These stubs are kept so pages compile and show a graceful "not available"
 * state rather than crashing. Remove this notice and implement when the
 * backend /api/v1/collections routes are added.
 */
import { ApiError } from './client';

const NOT_IMPLEMENTED = (): never => {
  throw new ApiError(501, 'NOT_IMPLEMENTED', 'Collections are not yet available.');
};

export const collectionsApi = {
  list: NOT_IMPLEMENTED,
  get: NOT_IMPLEMENTED,
  create: NOT_IMPLEMENTED,
  update: NOT_IMPLEMENTED,
  delete: NOT_IMPLEMENTED,
  addFamily: NOT_IMPLEMENTED,
  removeFamily: NOT_IMPLEMENTED,
};
