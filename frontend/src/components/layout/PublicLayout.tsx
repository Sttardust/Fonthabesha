import { Outlet, Link } from 'react-router-dom';
import SiteNav from './SiteNav';
import SkipLink from './SkipLink';
import { useScrollToTop } from '@/hooks/useScrollToTop';

export default function PublicLayout() {
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
              Free Ethiopic &amp; Amharic fonts for everyone.
            </p>
          </div>

          <nav className="site-footer__nav" aria-label="Footer navigation">
            <div className="site-footer__col">
              <p className="site-footer__col-title">Fonts</p>
              <Link to="/fonts">Browse all</Link>
              <Link to="/fonts?feat=true">Featured</Link>
              <Link to="/collections">Collections</Link>
            </div>
            <div className="site-footer__col">
              <p className="site-footer__col-title">Info</p>
              <Link to="/about">About</Link>
              <Link to="/licenses">Licenses</Link>
              <Link to="/contributor">Contribute</Link>
            </div>
          </nav>
        </div>

        <div className="site-footer__bottom">
          <span>© {new Date().getFullYear()} Fonthabesha</span>
          <span className="site-footer__made">
            Made with ❤️ for the Ethiopian community
          </span>
        </div>
      </footer>
    </>
  );
}
