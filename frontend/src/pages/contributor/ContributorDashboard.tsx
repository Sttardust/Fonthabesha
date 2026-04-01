import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { contributorApi } from '@/lib/api/contributor';
import { bilingualValue } from '@/lib/utils/bilingualValue';

export default function ContributorDashboard() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['contributor', 'submissions'],
    queryFn: () => contributorApi.list(1, 5),
  });

  return (
    <>
      <Helmet><title>{t('contributor.portal')} — Fonthabesha</title></Helmet>
      <h1 className="portal-page-title">{t('contributor.portal')}</h1>

      <div className="portal-actions">
        <Link to="/contributor/submissions/new" className="btn btn--primary">
          + {t('contributor.newSubmission')}
        </Link>
      </div>

      <h2>{t('contributor.mySubmissions')}</h2>

      {isLoading && <p>{t('common.loading')}</p>}

      {data && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Family</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link to={`/contributor/submissions/${s.id}`}>
                    {bilingualValue(s.familyName)}
                  </Link>
                </td>
                <td>
                  <span className={`badge badge--status badge--${s.status}`}>
                    {t(`contributor.status.${s.status}`)}
                  </span>
                </td>
                <td>{new Date(s.updatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
