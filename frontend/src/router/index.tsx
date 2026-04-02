import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';

import { RequireAuth, RequireContributor, RequireAdmin, RedirectIfAuth } from './guards';

// ── Layouts ────────────────────────────────────────────────────────────────────
import PublicLayout from '@/components/layout/PublicLayout';
import ContributorLayout from '@/components/layout/ContributorLayout';
import AdminLayout from '@/components/layout/AdminLayout';

// ── Eagerly-loaded pages (above the fold / first interaction) ──────────────────
import HomePage from '@/pages/public/HomePage';
import FontsPage from '@/pages/public/FontsPage';
import LoginPage from '@/pages/auth/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';
import RegisterPage from '@/pages/auth/RegisterPage';

// ── Lazy-loaded pages ──────────────────────────────────────────────────────────
const FontDetailPage = lazy(() => import('@/pages/public/FontDetailPage'));
const CollectionsPage = lazy(() => import('@/pages/public/CollectionsPage'));
const CollectionDetailPage = lazy(() => import('@/pages/public/CollectionDetailPage'));
const AboutPage = lazy(() => import('@/pages/public/AboutPage'));
const LicensesPage = lazy(() => import('@/pages/public/LicensesPage'));

// Contributor portal
const ContributorDashboard = lazy(() => import('@/pages/contributor/ContributorDashboard'));
const SubmissionsListPage = lazy(() => import('@/pages/contributor/SubmissionsListPage'));
const NewSubmissionPage = lazy(() => import('@/pages/contributor/NewSubmissionPage'));
const SubmissionDetailPage = lazy(() => import('@/pages/contributor/SubmissionDetailPage'));
const ProfilePage = lazy(() => import('@/pages/contributor/ProfilePage'));

// Admin / reviewer
const AdminDashboard        = lazy(() => import('@/pages/admin/AdminDashboard'));
const ReviewQueuePage       = lazy(() => import('@/pages/admin/ReviewQueuePage'));
const ReviewDetailPage      = lazy(() => import('@/pages/admin/ReviewDetailPage'));
const ManageFontsPage       = lazy(() => import('@/pages/admin/ManageFontsPage'));
const CollectionsAdminPage  = lazy(() => import('@/pages/admin/CollectionsAdminPage'));
const VocabularyPage        = lazy(() => import('@/pages/admin/VocabularyPage'));
const AnalyticsPage         = lazy(() => import('@/pages/admin/AnalyticsPage'));

// ── Loading fallback ───────────────────────────────────────────────────────────
function PageSpinner() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        fontSize: '0.875rem',
        color: 'var(--color-text-muted)',
      }}
    >
      በመጫን ላይ…
    </div>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSpinner />}>{children}</Suspense>
}

// ── Router ─────────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  // ── Public routes ────────────────────────────────────────────────────────────
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/fonts', element: <FontsPage /> },
      {
        path: '/fonts/:slug',
        element: <Lazy><FontDetailPage /></Lazy>,
      },
      {
        path: '/collections',
        element: (
          <RequireAuth>
            <Lazy><CollectionsPage /></Lazy>
          </RequireAuth>
        ),
      },
      {
        path: '/collections/:id',
        element: (
          <RequireAuth>
            <Lazy><CollectionDetailPage /></Lazy>
          </RequireAuth>
        ),
      },
      { path: '/about',    element: <Lazy><AboutPage /></Lazy> },
      { path: '/licenses', element: <Lazy><LicensesPage /></Lazy> },
    ],
  },

  // ── Auth routes ──────────────────────────────────────────────────────────────
  {
    path: '/login',
    element: (
      <RedirectIfAuth>
        <LoginPage />
      </RedirectIfAuth>
    ),
  },
  {
    path: '/register',
    element: (
      <RedirectIfAuth>
        <RegisterPage />
      </RedirectIfAuth>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <RedirectIfAuth>
        <ForgotPasswordPage />
      </RedirectIfAuth>
    ),
  },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },

  // ── Contributor portal ───────────────────────────────────────────────────────
  {
    path: '/contributor',
    element: (
      <RequireContributor>
        <ContributorLayout />
      </RequireContributor>
    ),
    children: [
      { index: true, element: <Lazy><ContributorDashboard /></Lazy> },
      { path: 'submissions', element: <Lazy><SubmissionsListPage /></Lazy> },
      { path: 'submissions/new', element: <Lazy><NewSubmissionPage /></Lazy> },
      { path: 'submissions/:id', element: <Lazy><SubmissionDetailPage /></Lazy> },
      { path: 'profile', element: <Lazy><ProfilePage /></Lazy> },
    ],
  },

  // ── Admin / reviewer ─────────────────────────────────────────────────────────
  {
    path: '/admin',
    element: (
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    ),
    children: [
      { index: true, element: <Lazy><AdminDashboard /></Lazy> },
      { path: 'review', element: <Lazy><ReviewQueuePage /></Lazy> },
      { path: 'review/:id', element: <Lazy><ReviewDetailPage /></Lazy> },
      { path: 'fonts', element: <Lazy><ManageFontsPage /></Lazy> },
      { path: 'collections', element: <Lazy><CollectionsAdminPage /></Lazy> },
      { path: 'vocabulary', element: <Lazy><VocabularyPage /></Lazy> },
      { path: 'analytics', element: <Lazy><AnalyticsPage /></Lazy> },
    ],
  },

  // ── 404 ───────────────────────────────────────────────────────────────────────
  { path: '*', element: <NotFoundPage /> },
]);
