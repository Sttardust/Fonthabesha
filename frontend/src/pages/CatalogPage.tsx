import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { fetchFonts, fetchHealth, getApiBaseUrl } from '../lib/api';
import type { FontListResponse } from '../types/catalog';

type CatalogPageProps = {
  onHealthChange(status: string): void;
};

type SortOrder = 'newest' | 'popular' | 'alphabetical';

const EMPTY_RESPONSE: FontListResponse = {
  items: [],
  pagination: {
    page: 1,
    pageSize: 12,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
  },
};

export function CatalogPage({ onHealthChange }: CatalogPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [sort, setSort] = useState<SortOrder>(
    (searchParams.get('sort') as SortOrder | null) ?? 'newest',
  );
  const [catalog, setCatalog] = useState<FontListResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const activeQuery = searchParams.get('q') ?? '';
    const activeSort = (searchParams.get('sort') as SortOrder | null) ?? 'newest';

    setQuery(activeQuery);
    setSort(activeSort);
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const [health, fonts] = await Promise.all([
          fetchHealth(),
          fetchFonts({
            q: activeQuery,
            sort: activeSort,
            page: 1,
            pageSize: 12,
          }),
        ]);

        if (!cancelled) {
          onHealthChange(health.status);
          setCatalog(fonts);
        }
      } catch (loadError) {
        if (!cancelled) {
          onHealthChange('down');
          setCatalog(EMPTY_RESPONSE);
          setError(loadError instanceof Error ? loadError.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [onHealthChange, searchParams]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextParams = new URLSearchParams();

    if (query.trim()) {
      nextParams.set('q', query.trim());
    }

    if (sort !== 'newest') {
      nextParams.set('sort', sort);
    }

    setSearchParams(nextParams);
  }

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Public Catalog</p>
          <h1>Browse Amharic font families from the live API</h1>
          <p className="lede">
            This frontend now speaks to the backend directly. Search, sort, inspect family
            details, and use the returned asset URLs without hardcoded mock data.
          </p>
          <div className="status-row">
            <span className="api-url">{getApiBaseUrl()}</span>
            <span className="soft-note">{catalog.pagination.totalItems} published families</span>
          </div>
        </div>
      </section>

      <section className="catalog">
        <div className="section-header">
          <div>
            <p className="eyebrow">Catalog</p>
            <h2>Approved font families</h2>
          </div>
        </div>

        <form className="catalog-toolbar" onSubmit={handleSearchSubmit}>
          <label className="search-field">
            <span className="field-label">Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by family name, tag, or description"
            />
          </label>
          <label className="search-field search-field-compact">
            <span className="field-label">Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
              <option value="newest">Newest</option>
              <option value="popular">Popular</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </label>
          <button className="action-button" type="submit">
            Apply
          </button>
        </form>

        {error ? <p className="error-text">{error}</p> : null}

        {loading ? (
          <div className="empty-state">
            <p>Loading the catalog...</p>
          </div>
        ) : catalog.items.length === 0 ? (
          <div className="empty-state">
            <p>No published families match the current query.</p>
            <p>Approve a family in the backend or clear the search.</p>
          </div>
        ) : (
          <div className="font-grid">
            {catalog.items.map((font) => (
              <Link className="font-card font-card-link" key={font.id} to={`/fonts/${font.slug}`}>
                <div className="font-card-body">
                  <div className="font-card-heading">
                    <p className="font-name">{font.name.native ?? font.name.am ?? font.name.en}</p>
                    <p className="font-slug">{font.slug}</p>
                  </div>
                  <p className="font-card-subtle">
                    {font.category ?? 'Uncategorized'} · {font.license?.name ?? 'License pending'}
                  </p>
                  <div className="tag-row">
                    {font.tags.slice(0, 3).map((tag) => (
                      <span className="tag-chip" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="font-meta">
                  <span>{font.numberOfStyles} styles</span>
                  <span>{font.hasVariableStyles ? 'Variable' : 'Static'}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
