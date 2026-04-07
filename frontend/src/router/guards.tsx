import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, selectIsAdmin, selectIsContributor } from '@/lib/store/authStore';

interface Props {
  children: React.ReactNode;
}

/** Requires the user to be authenticated. Redirects to /login with `?next=` param. */
export function RequireAuth({ children }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}

/** Requires contributor (or higher) role. */
export function RequireContributor({ children }: Props) {
  const isContributor = useAuthStore(selectIsContributor);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (!isContributor) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/** Requires reviewer or admin role. */
export function RequireAdmin({ children }: Props) {
  const isAdmin = useAuthStore(selectIsAdmin);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/** Redirect already-authenticated users away from the login page. */
export function RedirectIfAuth({ children }: Props) {
  const role = useAuthStore((s) => s.role);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    if (role === 'admin' || role === 'reviewer') {
      return <Navigate to="/admin" replace />;
    }
    if (role === 'contributor') {
      return <Navigate to="/contributor" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
