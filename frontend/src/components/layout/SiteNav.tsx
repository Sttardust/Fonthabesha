import { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore, selectIsAdmin, selectIsContributor } from '@/lib/store/authStore';
import { authApi } from '@/lib/api/auth';

export default function SiteNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isContributor   = useAuthStore(selectIsContributor);
  const isAdmin         = useAuthStore(selectIsAdmin);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef    = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Lock body scroll while menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Trap focus inside menu & close on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [menuOpen]);

  const handleLogout = async () => {
    await authApi.logout();
    navigate('/');
  };

  const navCell = ({ isActive }: { isActive: boolean }) =>
    `site-nav__cell${isActive ? ' site-nav__cell--active' : ''}`;

  const mobileLink = ({ isActive }: { isActive: boolean }) =>
    `mobile-nav__link${isActive ? ' mobile-nav__link--active' : ''}`;

  return (
    <>
      <nav className="site-nav" aria-label="Main navigation">
        {/* Brand */}
        <Link to="/" className="site-nav__brand" aria-label="Fonthabesha home">
          <span className="site-nav__logo" aria-hidden="true">ፍ</span>
          <span className="site-nav__name">Fonthabesha</span>
        </Link>

        {/* Desktop nav links (hidden on mobile) */}
        <div className="site-nav__links" role="list">
          <NavLink to="/fonts"    className={navCell} role="listitem">{t('nav.fonts')}</NavLink>
          <NavLink to="/licenses" className={navCell} role="listitem">{t('nav.licenses')}</NavLink>
          <NavLink to="/about"    className={navCell} role="listitem">{t('nav.about')}</NavLink>
        </div>

        {/* Desktop right actions */}
        <div className="site-nav__actions">
          {isContributor && !isAdmin && (
            <NavLink to="/contributor" className={navCell}>{t('nav.dashboard')}</NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={navCell}>{t('nav.admin')}</NavLink>
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
            <NavLink to="/login" className={navCell}>{t('nav.login')}</NavLink>
          )}
        </div>

        {/* Mobile hamburger button */}
        <button
          ref={triggerRef}
          type="button"
          className={`site-nav__hamburger${menuOpen ? ' site-nav__hamburger--open' : ''}`}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-menu"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </nav>

      {/* Mobile nav overlay */}
      {menuOpen && (
        <div
          className="mobile-nav-backdrop"
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div
        id="mobile-nav-menu"
        ref={menuRef}
        className={`mobile-nav${menuOpen ? ' mobile-nav--open' : ''}`}
        role="dialog"
        aria-label="Navigation menu"
        aria-modal="true"
        aria-hidden={!menuOpen}
      >
        <nav aria-label="Mobile navigation links">
          <NavLink to="/fonts"    className={mobileLink}>{t('nav.fonts')}</NavLink>
          <NavLink to="/licenses" className={mobileLink}>{t('nav.licenses')}</NavLink>
          <NavLink to="/about"    className={mobileLink}>{t('nav.about')}</NavLink>

          {isContributor && !isAdmin && (
            <NavLink to="/contributor" className={mobileLink}>{t('nav.dashboard')}</NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={mobileLink}>{t('nav.admin')}</NavLink>
          )}

          <div className="mobile-nav__divider" role="separator" />

          {isAuthenticated ? (
            <button
              type="button"
              className="mobile-nav__action-btn"
              onClick={handleLogout}
            >
              {t('nav.logout')}
            </button>
          ) : (
            <NavLink to="/login" className={mobileLink}>{t('nav.login')}</NavLink>
          )}
        </nav>
      </div>
    </>
  );
}
