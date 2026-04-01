import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { collectionsApi } from '@/lib/api/collections';

export default function CollectionsPage() {
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['collections'],
    queryFn: () => collectionsApi.list(),
  });

  return (
    <>
      <Helmet><title>{t('nav.collections')} — Fonthabesha</title></Helmet>
      <div className="page-container">
        <h1 className="page-title">{t('nav.collections')}</h1>
        {isLoading && <p>{t('common.loading')}</p>}
        {isError && <p>{t('common.error')}</p>}
        {data && (
          <ul className="collections-list">
            {data.data.map((col) => (
              <li key={col.id}>
                <Link to={`/collections/${col.id}`} className="collection-card">
                  <strong>{col.name}</strong>
                  <span>{col.families.length} fonts</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
