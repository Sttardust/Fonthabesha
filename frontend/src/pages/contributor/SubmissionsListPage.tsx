import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { contributorApi } from '@/lib/api/contributor';
import { bilingualValue } from '@/lib/utils/bilingualValue';

export default function SubmissionsListPage() {
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['contributor', 'submissions', 'all'],
    queryFn: () => contributorApi.list(1, 50),
  });

  return (
    <>
      <Helmet><title>{t('contributor.mySubmissions')} — Fonthabesha</title></Helmet>
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('contributor.mySubmissions')}</h1>
        <Link to="/contributor/submissions/new" className="btn btn--primary">
          + {t('contributor.newSubmission')}
        </Link>
      </div>

      {isLoading && <p>{t('common.loading')}</p>}
      {isError && <p>{t('common.error')}</p>}

      {data && data.data.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)' }}>
          No submissions yet. Start by uploading a font family.
        </p>
      )}

      {data && data.data.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Family Name</th>
              <th>Status</th>
              <th>Submitted</th>
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
                <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                <td>{new Date(s.updatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
