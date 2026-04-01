import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { collectionsApi } from '@/lib/api/collections';
import { bilingualValue } from '@/lib/utils/bilingualValue';
import { useSpecimenStore } from '@/lib/store/specimenStore';

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const specimenText = useSpecimenStore((s) => s.text);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['collections', id],
    queryFn: () => collectionsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="page-loading">{t('common.loading')}</div>;
  if (isError || !data) return <div className="page-error">{t('common.error')}</div>;

  return (
    <>
      <Helmet><title>{data.name} — Fonthabesha</title></Helmet>
      <div className="page-container">
        <h1 className="page-title">{data.name}</h1>
        {data.description && <p>{data.description}</p>}
        <ul className="font-card-list">
          {data.families.map((family) => (
            <li key={family.id}>
              <Link to={`/fonts/${family.slug}`} className="font-card">
                <div className="specimen-area">
                  <span className="font-card__specimen">{specimenText}</span>
                </div>
                <div className="font-card__meta">
                  <span className="font-card__name">{bilingualValue(family.name)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
