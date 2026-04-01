import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore, selectIsAdmin, selectIsContributor } from '@/lib/store/authStore';
import { authApi } from '@/lib/api/auth';

export default function SiteNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isContributor = useAuthStore(selectIsContributor);
  const isAdmin = useAuthStore(selectIsAdmin);

  const handleLogout = async () => {
    await authApi.logout();
    navigate('/');
  };

  return (
    <nav className="site-nav" aria-label="Main navigation">
      {/* Brand / Logo cell */}
      <Link to="/" className="site-nav__brand" aria-label="Fonthabesha home">
        <span className="site-nav__logo" aria-hidden="true">ፍ</span>
        <span className="site-nav__name">Fonthabesha</span>
      </Link>

      {/* Primary nav links */}
      <div className="site-nav__links">
        <NavLink
          to="/fonts"
          className={({ isActive }) =>
            `site-nav__cell${isActive ? ' site-nav__cell--active' : ''}`
          }
        >
          {t('nav.fonts')}
        </NavLink>

        {isAuthenticated && (
          <NavLink
            to="/collections"
            className={({ isActive }) =>
              `site-nav__cell${isActive ? ' site-nav__cell--active' : ''}`
            }
          >
            {t('nav.collections')}
          </NavLink>
        )}

        <NavLink
          to="/licenses"
          className={({ isActive }) =>
            `site-nav__cell${isActive ? ' site-nav__cell--active' : ''}`
          }
        >
          Licenses
        </NavLink>

        <NavLink
          to="/about"
          className={({ isActive }) =>
            `site-nav__cell${isActive ? ' site-nav__cell--active' : ''}`
          }
        >
          {t('nav.about')}
        </NavLink>
      </div>

      {/* Right-side actions */}
      <div className="site-nav__actions">
        {isContributor && !isAdmin && (
          <NavLink
            to="/contributor"
            className={({ isActive }) =>
              `site-nav__cell${isActive ? ' site-nav__cell--active' : ''}`
            }
          >
            {t('nav.dashboard')}
          </NavLink>
        )}

        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `site-nav__cell${isActive ? ' site-nav__cell--active' : ''}`
            }
          >
            {t('nav.admin')}
          </NavLink>
        )}

        {isAuthenticated ? (
          <button
            type="button"
            className="site-nav__cell site-nav__cell--btn"
            onClick={handleLogout}
          >
            {t('nav.logout')}
          </button>
        ) : (
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `site-nav__cell${isActive ? ' site-nav__cell--active' : ''}`
            }
          >
            {t('nav.login')}
          </NavLink>
        )}
      </div>
    </nav>
  );
}
