import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from './SiteNav';

export default function ContributorLayout() {
  const { t } = useTranslation();

  return (
    <>
      <SiteNav />
      <div className="portal-shell">
        <aside className="portal-sidebar">
          <p className="portal-sidebar__title">{t('contributor.portal')}</p>
          <nav>
            <NavLink
              to="/contributor"
              end
              className={({ isActive }) =>
                `portal-nav-link${isActive ? ' portal-nav-link--active' : ''}`
              }
            >
              {t('contributor.mySubmissions')}
            </NavLink>
            <NavLink
              to="/contributor/submissions/new"
              className={({ isActive }) =>
                `portal-nav-link${isActive ? ' portal-nav-link--active' : ''}`
              }
            >
              {t('contributor.newSubmission')}
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
