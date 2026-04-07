import { Outlet } from 'react-router-dom';
import SiteNav from './SiteNav';

export default function PublicLayout() {
  return (
    <>
      <SiteNav />
      <main className="page-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>© {new Date().getFullYear()} Fonthabesha</p>
      </footer>
    </>
  );
}
