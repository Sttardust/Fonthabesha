import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from './SiteNav';

export default function AdminLayout() {
  const { t } = useTranslation();

  return (
    <>
      <SiteNav />
      <div className="portal-shell">
        <aside className="portal-sidebar">
          <p className="portal-sidebar__title">{t('admin.dashboard')}</p>
          <nav>
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                `portal-nav-link${isActive ? ' portal-nav-link--active' : ''}`
              }
            >
              {t('admin.dashboard')}
            </NavLink>
            <NavLink
              to="/admin/review"
              className={({ isActive }) =>
                `portal-nav-link${isActive ? ' portal-nav-link--active' : ''}`
              }
            >
              {t('admin.reviewQueue')}
            </NavLink>
            <NavLink
              to="/admin/analytics"
              className={({ isActive }) =>
                `portal-nav-link${isActive ? ' portal-nav-link--active' : ''}`
              }
            >
              {t('admin.analytics.title')}
            </NavLink>
          </nav>
        </aside>
        <main className="portal-content">
          <Outlet />
        </main>
      </div>
    </>
  );
}
