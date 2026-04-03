import { Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from './SiteNav';
import SkipLink from './SkipLink';
import { useScrollToTop } from '@/hooks/useScrollToTop';

export default function PublicLayout() {
  const { t } = useTranslation();
  useScrollToTop();

  return (
    <>
      <SkipLink />
      <SiteNav />
      <main id="main-content" className="page-main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="site-footer__brand">
            <Link to="/" className="site-footer__logo" aria-label="Fonthabesha home">
              <span aria-hidden="true">ፍ</span> Fonthabesha
            </Link>
            <p className="site-footer__tagline">
              {t('footer.tagline')}
            </p>
          </div>

          <nav className="site-footer__nav" aria-label="Footer navigation">
            <div className="site-footer__col">
              <p className="site-footer__col-title">{t('footer.colFonts')}</p>
              <Link to="/fonts">{t('footer.browseAll')}</Link>
              <Link to="/fonts?feat=true">{t('footer.featured')}</Link>
            </div>
            <div className="site-footer__col">
              <p className="site-footer__col-title">{t('footer.colInfo')}</p>
              <Link to="/about">{t('nav.about')}</Link>
              <Link to="/licenses">{t('nav.licenses')}</Link>
              <Link to="/contributor">{t('about.contribute')}</Link>
            </div>
          </nav>
        </div>

        <div className="site-footer__bottom">
          <span>© {new Date().getFullYear()} Fonthabesha</span>
          <span className="site-footer__made">
            {t('footer.madeWith')}
          </span>
        </div>
      </footer>
    </>
  );
}
