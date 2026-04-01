import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';

import { catalogApi } from '@/lib/api/catalog';
import { useSpecimenStore } from '@/lib/store/specimenStore';
import { useCatalogFilters } from '@/hooks/useCatalogFilters';
import FilterBar from '@/components/catalog/FilterBar';
import FontCard from '@/components/catalog/FontCard';

export default function FontsPage() {
  const { t } = useTranslation();
  const { viewMode, columnCount } = useSpecimenStore();
  const { filters, setFilters, resetFilters } = useCatalogFilters();

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['fonts', filters],
    queryFn: () => catalogApi.list(filters),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const gridClass =
    viewMode === 'grid'
      ? `font-card-grid font-grid-${columnCount}`
      : 'font-card-list';

  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <>
      <Helmet>
        <title>{t('catalog.title')} — Fonthabesha</title>
      </Helmet>

      {/* Sticky two-row filter bar */}
      <FilterBar
        filters={filters}
        totalCount={data?.pagination.totalItems}
        onFiltersChange={setFilters}
        onReset={resetFilters}
      />

      {/* Catalog body */}
      <div className={`catalog-body${isFetching ? ' catalog-body--fetching' : ''}`}>
        {isLoading && (
          <div className="catalog-status">
            <span className="catalog-spinner" aria-label={t('common.loading')} />
          </div>
        )}

        {isError && (
          <div className="catalog-status catalog-status--error">
            <p>{t('common.error')}</p>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setFilters({ page: 1 })}
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {!isLoading && !isError && data?.items.length === 0 && (
          <div className="catalog-status">
            <p>{t('catalog.noResults')}</p>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={resetFilters}
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {data && data.items.length > 0 && (
          <ul className={gridClass} role="list" aria-label="Font families">
            {data.items.map((family) => (
              <FontCard key={family.id} family={family} view={viewMode} />
            ))}
          </ul>
        )}

        {/* Pagination */}
        {data && totalPages > 1 && (
          <nav className="pagination" aria-label="Pagination">
            <button
              type="button"
              className="pagination__btn"
              disabled={filters.page === 1}
              onClick={() => setFilters({ page: (filters.page ?? 1) - 1 })}
            >
              ← {t('common.previous')}
            </button>
            <span className="pagination__info">
              {t('common.page')} <strong>{filters.page}</strong> {t('common.of')}{' '}
              <strong>{totalPages}</strong>
            </span>
            <button
              type="button"
              className="pagination__btn"
              disabled={filters.page === totalPages}
              onClick={() => setFilters({ page: (filters.page ?? 1) + 1 })}
            >
              {t('common.next')} →
            </button>
          </nav>
        )}
      </div>
    </>
  );
}
