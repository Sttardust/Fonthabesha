import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';

export default function AdminDashboard() {
  const { t } = useTranslation();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.stats,
    staleTime: 30_000,
  });

  return (
    <>
      <Helmet><title>{t('admin.dashboard')} — Fonthabesha</title></Helmet>
      <h1 className="portal-page-title">{t('admin.dashboard')}</h1>

      {isLoading && <p>{t('common.loading')}</p>}

      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-card__value">{stats.totalFamilies}</span>
            <span className="stat-card__label">{t('admin.stats.totalFamilies')}</span>
          </div>
          <div className="stat-card stat-card--accent">
            <span className="stat-card__value">{stats.pendingReviews}</span>
            <span className="stat-card__label">{t('admin.stats.pendingReviews')}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__value">{stats.totalDownloads.toLocaleString()}</span>
            <span className="stat-card__label">{t('admin.stats.totalDownloads')}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__value">{stats.activeContributors}</span>
            <span className="stat-card__label">{t('admin.stats.activeContributors')}</span>
          </div>
        </div>
      )}

      <div className="portal-quick-links">
        <Link to="/admin/review" className="btn btn--primary">
          {t('admin.reviewQueue')}
          {stats && stats.pendingReviews > 0 && (
            <span className="badge badge--accent" style={{ marginLeft: '0.5rem' }}>
              {stats.pendingReviews}
            </span>
          )}
        </Link>
        <Link to="/admin/fonts" className="btn btn--secondary">
          {t('admin.manageFonts')}
        </Link>
      </div>
    </>
  );
}
