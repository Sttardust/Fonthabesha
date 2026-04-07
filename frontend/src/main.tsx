import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';

// i18n must be imported before anything that uses translations
import './lib/i18n';

import { router } from './router';
import './styles.css';

// ── TanStack Query client ──────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000, // 1 minute
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// ── Bootstrap silent token refresh ────────────────────────────────────────────
// If a refresh token exists from a previous session, attempt to silently
// restore the auth state before the app renders the first route.

async function bootstrap() {
  const REFRESH_KEY = 'fh_refresh';
  const hasRefresh = !!localStorage.getItem(REFRESH_KEY);

  if (hasRefresh) {
    // Lazy import to avoid circular deps at module level
    const { authApi } = await import('./lib/api/auth');
    await authApi.refresh().catch(() => {
      // Refresh failed — proceed unauthenticated. clearSession already called.
    });
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </HelmetProvider>
    </React.StrictMode>,
  );
}

bootstrap();
