import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore, selectIsAdmin, selectIsContributor } from '@/lib/store/authStore';
import { authApi } from '@/lib/api/auth';
import { catalogApi } from '@/lib/api/catalog';

// ── Language switcher ─────────────────────────────────────────────────────────

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const isAm = i18n.language === 'am';

  const toggle = () => {
    const next = isAm ? 'en' : 'am';
    i18n.changeLanguage(next);
    localStorage.setItem('fh_lang', next);
  };

  return (
    <button
      type="button"
      className="site-nav__cell site-nav__cell--lang site-nav__cell--btn"
      onClick={toggle}
      aria-label={isAm ? 'Switch to English' : 'ወደ አማርኛ ቀይር'}
      title={isAm ? 'Switch to English' : 'ወደ አማርኛ ቀይር'}
    >
      <span className="site-nav__label">{isAm ? 'EN' : 'አማ'}</span>
    </button>
  );
}

// ── Hamburger menu ─────────────────────────────────────────────────────────────

function HamburgerMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <div ref={menuRef} className="site-nav__hamburger-wrap">
      <button
        type="button"
        className={`site-nav__cell site-nav__cell--btn site-nav__cell--hamburger${open ? ' site-nav__cell--active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="site-nav__hamburger" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {open && (
        <div className="site-nav__dropdown" role="menu" aria-label="Menu">
          <NavLink
            to="/about"
            className="site-nav__dropdown-item"
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            {t('nav.about')}
          </NavLink>
          <NavLink
            to="/faq"
            className="site-nav__dropdown-item"
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            {t('nav.faq')}
          </NavLink>
        </div>
      )}
    </div>
  );
}

// ── SiteNav ────────────────────────────────────────────────────────────────────

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

  // Fetch font + collection counts for nav badges
  const { data: filtersData } = useQuery({
    queryKey: ['catalog-filters-nav'],
    queryFn: () => catalogApi.filters(),
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // We don't have a cheap "total count" endpoint, so fetch page 1 and use total
  const { data: fontCountData } = useQuery({
    queryKey: ['catalog-count-nav'],
    queryFn: () => catalogApi.list({ pageSize: 1 }),
    staleTime: 5 * 60 * 1000,
  });

  const fontCount = fontCountData?.total;
  // filtersData could include collection count in future; for now keep undefined
  void filtersData;

  return (
    <nav className="site-nav" aria-label="Main navigation">
      {/* Brand / Logo cell */}
      <Link to="/" className="site-nav__brand site-nav__cell" aria-label="Fonthabesha home">
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
          <span className="site-nav__label">{t('nav.fonts')}</span>
          {fontCount !== undefined && (
            <span className="site-nav__count">{fontCount.toLocaleString()}</span>
          )}
        </NavLink>

        {/* Collections — always public, no auth gate */}
        <NavLink
          to="/collections"
          className={({ isActive }) =>
            `site-nav__cell${isActive ? ' site-nav__cell--active' : ''}`
          }
        >
          <span className="site-nav__label">{t('nav.collections')}</span>
        </NavLink>

        <NavLink
          to="/licenses"
          className={({ isActive }) =>
            `site-nav__cell${isActive ? ' site-nav__cell--active' : ''}`
          }
        >
          <span className="site-nav__label">{t('nav.licenses')}</span>
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
            <span className="site-nav__label">{t('nav.dashboard')}</span>
          </NavLink>
        )}

        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `site-nav__cell${isActive ? ' site-nav__cell--active' : ''}`
            }
          >
            <span className="site-nav__label">{t('nav.admin')}</span>
          </NavLink>
        )}

        {isAuthenticated ? (
          <button
            type="button"
            className="site-nav__cell site-nav__cell--btn"
            onClick={handleLogout}
          >
            <span className="site-nav__label">{t('nav.logout')}</span>
          </button>
        ) : (
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `site-nav__cell${isActive ? ' site-nav__cell--active' : ''}`
            }
          >
            <span className="site-nav__label">{t('nav.login')}</span>
          </NavLink>
        )}

        <LanguageSwitcher />
        <HamburgerMenu />
      </div>
    </nav>
  );
}
