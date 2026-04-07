/**
 * useScrollToTop — scrolls window to (0, 0) on every pathname change.
 * Mount once inside a layout that wraps <Outlet />.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
}
