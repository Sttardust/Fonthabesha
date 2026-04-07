import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { collectionsApi } from '@/lib/api/collections';
import FontCard from '@/components/catalog/FontCard';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorState from '@/components/shared/ErrorState';

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['collections', id],
    queryFn: () => collectionsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <LoadingSpinner fullPage label={t('common.loading')} />;
  if (isError || !data) {
    return <ErrorState message={t('common.error')} onRetry={() => refetch()} />;
  }

  const families = data.featuredFamilies ?? [];
  const familyCount = data.familyCount ?? families.length;

  return (
    <>
      <Helmet>
        <title>{data.title} — Fonthabesha</title>
      </Helmet>
      <div className="collection-detail-hero">
        <div className="page-container">
          <Link to="/collections" className="back-link">
            ← {t('nav.collections')}
          </Link>
          <h1 className="page-title">{data.title}</h1>
          {data.description && (
            <p className="collection-detail-hero__desc">{data.description}</p>
          )}
          <p className="collection-detail-hero__count">
            {familyCount} {familyCount === 1 ? 'font' : 'fonts'}
          </p>
        </div>
      </div>
      <div className="page-container">
        {families.length === 0 ? (
          <p className="empty-state">{t('catalog.noResults')}</p>
        ) : (
          <div className="font-card-list-wrap">
            {families.map((family) => (
              <FontCard key={family.id} family={family} view="list" />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
