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

// ── Lazy-loaded pages ──────────────────────────────────────────────────────────
const FontDetailPage       = lazy(() => import('@/pages/public/FontDetailPage'));
const CollectionsPage      = lazy(() => import('@/pages/public/CollectionsPage'));
const CollectionDetailPage = lazy(() => import('@/pages/public/CollectionDetailPage'));
const AboutPage            = lazy(() => import('@/pages/public/AboutPage'));
const LicensesPage         = lazy(() => import('@/pages/public/LicensesPage'));
const FaqPage              = lazy(() => import('@/pages/public/FaqPage'));

// Auth
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));

// Contributor portal
const ContributorDashboard  = lazy(() => import('@/pages/contributor/ContributorDashboard'));
const SubmissionsListPage   = lazy(() => import('@/pages/contributor/SubmissionsListPage'));
const NewSubmissionPage     = lazy(() => import('@/pages/contributor/NewSubmissionPage'));
const SubmissionDetailPage  = lazy(() => import('@/pages/contributor/SubmissionDetailPage'));
const ProfilePage           = lazy(() => import('@/pages/contributor/ProfilePage'));

// Admin / reviewer
const AdminDashboard       = lazy(() => import('@/pages/admin/AdminDashboard'));
const ReviewQueuePage      = lazy(() => import('@/pages/admin/ReviewQueuePage'));
const ReviewDetailPage     = lazy(() => import('@/pages/admin/ReviewDetailPage'));
const ManageFontsPage      = lazy(() => import('@/pages/admin/ManageFontsPage'));
const CollectionsAdminPage = lazy(() => import('@/pages/admin/CollectionsAdminPage'));
const VocabularyPage       = lazy(() => import('@/pages/admin/VocabularyPage'));
const AnalyticsPage        = lazy(() => import('@/pages/admin/AnalyticsPage'));
const FailuresPage         = lazy(() => import('@/pages/admin/FailuresPage'));
const PublishersPage       = lazy(() => import('@/pages/admin/PublishersPage'));
const DesignersPage        = lazy(() => import('@/pages/admin/DesignersPage'));
const LicensesAdminPage    = lazy(() => import('@/pages/admin/LicensesAdminPage'));
const CategoriesPage       = lazy(() => import('@/pages/admin/CategoriesPage'));

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
  return <Suspense fallback={<PageSpinner />}>{children}</Suspense>;
}

// ── Router ─────────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  // ── Public routes — no auth required ────────────────────────────────────────
  {
    element: <PublicLayout />,
    children: [
      { path: '/',                element: <HomePage /> },
      { path: '/fonts',           element: <FontsPage /> },
      { path: '/fonts/:slug',     element: <Lazy><FontDetailPage /></Lazy> },
      // Collections are public — no RequireAuth
      { path: '/collections',     element: <Lazy><CollectionsPage /></Lazy> },
      { path: '/collections/:id', element: <Lazy><CollectionDetailPage /></Lazy> },
      { path: '/about',           element: <Lazy><AboutPage /></Lazy> },
      { path: '/licenses',        element: <Lazy><LicensesPage /></Lazy> },
      { path: '/faq',             element: <Lazy><FaqPage /></Lazy> },
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
        <Lazy><RegisterPage /></Lazy>
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
      { index: true,               element: <Lazy><ContributorDashboard /></Lazy> },
      { path: 'profile',           element: <Lazy><ProfilePage /></Lazy> },
      { path: 'submissions',       element: <Lazy><SubmissionsListPage /></Lazy> },
      { path: 'submissions/new',   element: <Lazy><NewSubmissionPage /></Lazy> },
      { path: 'submissions/:id',   element: <Lazy><SubmissionDetailPage /></Lazy> },
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
      { index: true,            element: <Lazy><AdminDashboard /></Lazy> },
      { path: 'review',         element: <Lazy><ReviewQueuePage /></Lazy> },
      { path: 'review/:id',     element: <Lazy><ReviewDetailPage /></Lazy> },
      { path: 'fonts',          element: <Lazy><ManageFontsPage /></Lazy> },
      { path: 'collections',    element: <Lazy><CollectionsAdminPage /></Lazy> },
      { path: 'vocabulary',     element: <Lazy><VocabularyPage /></Lazy> },
      { path: 'analytics',      element: <Lazy><AnalyticsPage /></Lazy> },
      { path: 'failures',       element: <Lazy><FailuresPage /></Lazy> },
      { path: 'publishers',     element: <Lazy><PublishersPage /></Lazy> },
      { path: 'designers',      element: <Lazy><DesignersPage /></Lazy> },
      { path: 'licenses',       element: <Lazy><LicensesAdminPage /></Lazy> },
      { path: 'categories',     element: <Lazy><CategoriesPage /></Lazy> },
    ],
  },

  // ── 404 ───────────────────────────────────────────────────────────────────────
  { path: '*', element: <NotFoundPage /> },
]);
