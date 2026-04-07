import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { collectionsApi } from '@/lib/api/collections';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorState from '@/components/shared/ErrorState';
import type { Collection } from '@/lib/types';

// ── Collection card ───────────────────────────────────────────────────────────

function CollectionCard({ collection }: { collection: Collection }) {
  const { i18n } = useTranslation();
  const isAm = i18n.language === 'am';

  const specimenText = collection.specimenText ?? (isAm ? 'አዲስ ፊደሎች' : 'New Fonts');
  const familyCount  = collection.familyCount ?? collection.families?.length ?? 0;

  return (
    <Link
      to={`/collections/${collection.id}`}
      className="collection-card"
      aria-label={`${collection.name} — ${familyCount} fonts`}
    >
      {/* Visual area — cover image or specimen text */}
      <div className="collection-card__visual">
        {collection.coverImageUrl ? (
          <img
            src={collection.coverImageUrl}
            alt=""
            className="collection-card__cover"
            loading="lazy"
          />
        ) : (
          <div className="collection-card__specimen" aria-hidden="true">
            {specimenText}
          </div>
        )}
      </div>

      {/* Card meta */}
      <div className="collection-card__body">
        <h2 className="collection-card__name">{collection.name}</h2>
        {collection.description && (
          <p className="collection-card__desc">{collection.description}</p>
        )}
        <span className="collection-card__count">
          {familyCount} {familyCount === 1 ? 'font' : 'fonts'}
        </span>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CollectionsPage() {
  const { t } = useTranslation();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['collections'],
    queryFn: () => collectionsApi.list(),
  });

  const collections = data?.data ?? [];

  return (
    <>
      <Helmet>
        <title>{t('nav.collections')} — Fonthabesha</title>
      </Helmet>

      <div className="page-container">
        <header className="page-header">
          <h1 className="page-title">{t('nav.collections')}</h1>
          {data && (
            <p className="page-subtitle">
              {data.total} {t('nav.collections').toLowerCase()}
            </p>
          )}
        </header>

        {isLoading && <LoadingSpinner fullPage label={t('common.loading')} />}

        {isError && (
          <ErrorState
            message={t('common.error')}
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !isError && collections.length === 0 && (
          <p className="empty-state">{t('collections.empty')}</p>
        )}

        {collections.length > 0 && (
          <div className="collections-grid">
            {collections.map((col) => (
              <CollectionCard key={col.id} collection={col} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
