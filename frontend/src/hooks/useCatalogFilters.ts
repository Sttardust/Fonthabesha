/**
 * useCatalogFilters
 *
 * Keeps SearchFilters in sync with URL search params.
 * All filter state is serialized to/from the URL so the catalog is
 * fully bookmarkable and back-button safe.
 */

import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SearchFilters } from '@/lib/types';

const DEFAULT_PAGE_SIZE = 20;

/** Parse current URL search params into a SearchFilters object */
function parseParams(params: URLSearchParams): SearchFilters {
  return {
    q:        params.get('q')       || undefined,
    category: params.get('cat')     || undefined,
    script:   params.get('script')  || undefined,
    // backend param is `variable` (boolean)
    variable: params.get('var') === '1' ? true : undefined,
    sort:     (params.get('sort') as SearchFilters['sort']) || 'newest',
    page:     parseInt(params.get('page') ?? '1', 10),
    pageSize: parseInt(params.get('size') ?? String(DEFAULT_PAGE_SIZE), 10),
  };
}

/** Serialize a SearchFilters object into URL search params */
function buildParams(filters: SearchFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.q)        p.set('q',      filters.q);
  if (filters.category) p.set('cat',    filters.category);
  if (filters.script)   p.set('script', filters.script);
  if (filters.variable) p.set('var',    '1');
  if (filters.sort && filters.sort !== 'newest') p.set('sort', filters.sort);
  if (filters.page   && filters.page   !== 1)                p.set('page', String(filters.page));
  if (filters.pageSize && filters.pageSize !== DEFAULT_PAGE_SIZE) p.set('size', String(filters.pageSize));
  return p;
}

const DEFAULT_FILTERS: SearchFilters = {
  page:     1,
  pageSize: DEFAULT_PAGE_SIZE,
  sort:     'newest',
};

export function useCatalogFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = parseParams(searchParams);

  const setFilters = useCallback(
    (patch: Partial<SearchFilters>) => {
      setSearchParams(
        buildParams({ ...filters, ...patch }),
        { replace: true },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, setSearchParams],
  );

  const resetFilters = useCallback(() => {
    setSearchParams(buildParams(DEFAULT_FILTERS), { replace: true });
  }, [setSearchParams]);

  return { filters, setFilters, resetFilters };
}
