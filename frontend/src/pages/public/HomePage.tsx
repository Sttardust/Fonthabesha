/**
 * HomePage
 *
 * Matches the Fontshare pattern: the home IS the catalog.
 * A minimal hero band sits above the filter bar, then the full font grid follows.
 * Navigating to `/` lands directly on browsable fonts.
 */

import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';

import { catalogApi } from '@/lib/api/catalog';
import { useSpecimenStore } from '@/lib/store/specimenStore';
import { useCatalogFilters } from '@/hooks/useCatalogFilters';
import FilterBar from '@/components/catalog/FilterBar';
import FontCard from '@/components/catalog/FontCard';

export default function HomePage() {
  const { t } = useTranslation();
  const { viewMode, columnCount } = useSpecimenStore();

  // Use the same URL-param-driven filters as FontsPage so the hero page
  // behaves identically — fully bookmarkable, back-button safe.
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

  const totalItems = data?.pagination.totalItems;
  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <>
      <Helmet>
        <title>Fonthabesha — {t('home.tagline')}</title>
        <meta
          name="description"
          content="Fonthabesha — Free Ethiopic and Amharic fonts for designers, developers, and communities worldwide."
        />
      </Helmet>

      {/* ── Hero band ── */}
      <section className="home-hero" aria-label="Hero">
        <div className="home-hero__inner">
          <p className="home-hero__am">{t('home.tagline')}</p>
          <p className="home-hero__sub">{t('home.subTagline')}</p>
          {totalItems !== undefined && (
            <p className="home-hero__count">
              {totalItems.toLocaleString()} fonts and counting
            </p>
          )}
        </div>
      </section>

      {/* ── Sticky filter bar (same as /fonts) ── */}
      <FilterBar
        filters={filters}
        totalCount={totalItems}
        onFiltersChange={setFilters}
        onReset={resetFilters}
      />

      {/* ── Font grid ── */}
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
