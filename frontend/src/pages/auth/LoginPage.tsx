import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { useAuthStore, selectIsAdmin, selectIsContributor } from '@/lib/store/authStore';

// ── Schema ─────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type LoginFormData = z.infer<typeof loginSchema>;

// ── Component ──────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') ?? '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await authApi.login(data);

      // Role-based redirect
      const role = useAuthStore.getState().role;
      if (role === 'admin' || role === 'reviewer') {
        navigate(nextPath.startsWith('/admin') ? nextPath : '/admin', { replace: true });
      } else if (role === 'contributor') {
        navigate(nextPath.startsWith('/contributor') ? nextPath : '/contributor', { replace: true });
      } else {
        navigate(nextPath === '/' ? '/' : nextPath, { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('root', { message: t('auth.invalidCredentials') });
      } else {
        setError('root', { message: t('auth.serverError') });
      }
    }
  };

  return (
    <>
      <Helmet>
        <title>ግባ — Fonthabesha</title>
      </Helmet>

      <div className="auth-shell">
        <div className="auth-card">
          {/* Brand mark */}
          <Link to="/" className="auth-card__brand" aria-label="Fonthabesha home">
            <span className="auth-card__logo" aria-hidden="true">ፍ</span>
          </Link>

          <h1 className="auth-card__title">{t('auth.login')}</h1>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`form-input${errors.email ? ' form-input--error' : ''}`}
                {...register('email')}
              />
              {errors.email && (
                <p className="form-error">{errors.email.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className={`form-input${errors.password ? ' form-input--error' : ''}`}
                {...register('password')}
              />
              {errors.password && (
                <p className="form-error">{errors.password.message}</p>
              )}
            </div>

            {errors.root && (
              <p className="form-error form-error--global">{errors.root.message}</p>
            )}

            <button
              type="submit"
              className="btn btn--primary btn--full"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('auth.loggingIn') : t('auth.submit')}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
