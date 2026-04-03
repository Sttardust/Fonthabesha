/**
 * RegisterPage — /register
 *
 * Contributor self-registration. On success the user is logged in
 * automatically and redirected to /contributor.
 * If emailVerificationRequired is returned, a "check your email" screen
 * is shown with an option to proceed directly to the portal.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';

// ── Schema ────────────────────────────────────────────────────────────────────
// confirmPassword is validated manually in onSubmit to keep the inferred type
// a simple flat object (avoids the optional/transform Zod-RHF type mismatch).

const registerSchema = z.object({
  email:            z.string().email().max(320),
  password:         z.string().min(8, 'At least 8 characters').max(200),
  confirmPassword:  z.string(),
  displayName:      z.string().trim().min(2).max(120),
  legalFullName:    z.string().trim().min(2).max(160),
  countryCode:      z.string().length(2, 'Must be exactly 2 letters (e.g. ET)'),
  organizationName: z.string().max(160),
  phoneNumber:      z.string().refine((v) => v === '' || (v.length >= 7 && v.length <= 40), {
    message: '7–40 characters',
  }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

// ── Component ─────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') ?? '/contributor';
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      countryCode: 'ET',
      organizationName: '',
      phoneNumber: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    // Cross-field check (not in Zod to keep the inferred type clean)
    if (data.password !== data.confirmPassword) {
      setError('confirmPassword', { message: t('auth.passwordsDoNotMatch') });
      return;
    }

    try {
      const res = await authApi.register({
        email:            data.email,
        password:         data.password,
        displayName:      data.displayName,
        legalFullName:    data.legalFullName,
        countryCode:      data.countryCode.toUpperCase(),
        organizationName: data.organizationName || null,
        phoneNumber:      data.phoneNumber     || null,
      });

      if (res.emailVerificationRequired) {
        setPendingEmail(data.email);
        return;
      }

      const role = useAuthStore.getState().role;
      if (role === 'admin' || role === 'reviewer') {
        navigate('/admin', { replace: true });
      } else {
        navigate(nextPath.startsWith('/contributor') ? nextPath : '/contributor', { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('email', { message: t('auth.emailAlreadyRegistered') });
        } else {
          setError('root', { message: err.message || t('auth.registrationError') });
        }
        return;
      }
      setError('root', { message: t('auth.serverError') });
    }
  };

  // ── Email verification pending screen ──────────────────────────────────────

  if (pendingEmail) {
    return (
      <>
        <Helmet><title>{t('auth.checkYourEmail')} — Fonthabesha</title></Helmet>
        <div className="auth-shell">
          <div className="auth-card">
            <Link to="/" className="auth-card__brand" aria-label="Fonthabesha home">
              <span className="auth-card__logo" aria-hidden="true">ፍ</span>
            </Link>
            <h1 className="auth-card__title">{t('auth.checkYourEmail')}</h1>
            <p className="auth-card__subtitle">
              {t('auth.emailVerificationPending', { email: pendingEmail })}
            </p>
            <button
              type="button"
              className="btn btn--primary btn--full"
              onClick={() => navigate('/contributor', { replace: true })}
            >
              {t('auth.continueToPortal')}
            </button>
            <p className="form-hint">
              {t('auth.haveAccount')}{' '}
              <Link to="/login">{t('nav.login')}</Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  // ── Registration form ─────────────────────────────────────────────────────

  return (
    <>
      <Helmet>
        <title>{t('auth.register')} — Fonthabesha</title>
      </Helmet>

      <div className="auth-shell">
        <div className="auth-card auth-card--wide">
          <Link to="/" className="auth-card__brand" aria-label="Fonthabesha home">
            <span className="auth-card__logo" aria-hidden="true">ፍ</span>
          </Link>

          <h1 className="auth-card__title">{t('auth.register')}</h1>
          <p className="auth-card__subtitle">{t('auth.registerSubtitle')}</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* ── Account credentials ── */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">
                {t('auth.email')} <span className="form-label__required" aria-hidden="true">*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                className={`form-input${errors.email ? ' form-input--error' : ''}`}
                {...register('email')}
              />
              {errors.email && <p className="form-error" role="alert">{errors.email.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">
                {t('auth.password')} <span className="form-label__required" aria-hidden="true">*</span>
              </label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                className={`form-input${errors.password ? ' form-input--error' : ''}`}
                {...register('password')}
              />
              {errors.password && <p className="form-error" role="alert">{errors.password.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-confirm-password">
                {t('auth.confirmPassword')} <span className="form-label__required" aria-hidden="true">*</span>
              </label>
              <input
                id="reg-confirm-password"
                type="password"
                autoComplete="new-password"
                className={`form-input${errors.confirmPassword ? ' form-input--error' : ''}`}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="form-error" role="alert">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* ── Profile details ── */}
            <div className="auth-section-divider">
              <span>{t('profile.title')}</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-displayName">
                {t('profile.displayName')} <span className="form-label__required" aria-hidden="true">*</span>
              </label>
              <input
                id="reg-displayName"
                type="text"
                autoComplete="nickname"
                maxLength={120}
                className={`form-input${errors.displayName ? ' form-input--error' : ''}`}
                {...register('displayName')}
              />
              {errors.displayName && <p className="form-error" role="alert">{errors.displayName.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-legalFullName">
                {t('profile.legalFullName')} <span className="form-label__required" aria-hidden="true">*</span>
              </label>
              <input
                id="reg-legalFullName"
                type="text"
                autoComplete="name"
                maxLength={160}
                className={`form-input${errors.legalFullName ? ' form-input--error' : ''}`}
                {...register('legalFullName')}
              />
              {errors.legalFullName && <p className="form-error" role="alert">{errors.legalFullName.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-countryCode">
                {t('profile.countryCode')} <span className="form-label__required" aria-hidden="true">*</span>
              </label>
              <input
                id="reg-countryCode"
                type="text"
                autoComplete="country"
                placeholder="ET"
                maxLength={2}
                className={`form-input form-input--short${errors.countryCode ? ' form-input--error' : ''}`}
                {...register('countryCode')}
              />
              <p className="form-hint">{t('profile.countryCodeHint')}</p>
              {errors.countryCode && <p className="form-error" role="alert">{errors.countryCode.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-organizationName">
                {t('profile.organizationName')}{' '}
                <span className="form-label__optional">({t('common.optional')})</span>
              </label>
              <input
                id="reg-organizationName"
                type="text"
                autoComplete="organization"
                maxLength={160}
                className={`form-input${errors.organizationName ? ' form-input--error' : ''}`}
                {...register('organizationName')}
              />
              {errors.organizationName && <p className="form-error" role="alert">{errors.organizationName.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-phoneNumber">
                {t('profile.phoneNumber')}{' '}
                <span className="form-label__optional">({t('common.optional')})</span>
              </label>
              <input
                id="reg-phoneNumber"
                type="tel"
                autoComplete="tel"
                maxLength={40}
                className={`form-input${errors.phoneNumber ? ' form-input--error' : ''}`}
                {...register('phoneNumber')}
              />
              {errors.phoneNumber && <p className="form-error" role="alert">{errors.phoneNumber.message}</p>}
            </div>

            {errors.root && (
              <p className="form-error form-error--global" role="alert">{errors.root.message}</p>
            )}

            <button type="submit" className="btn btn--primary btn--full" disabled={isSubmitting}>
              {isSubmitting ? t('auth.registering') : t('auth.createAccount')}
            </button>
          </form>

          <p className="form-hint">
            {t('auth.haveAccount')}{' '}
            <Link to="/login">{t('nav.login')}</Link>
          </p>
        </div>
      </div>
    </>
  );
}
