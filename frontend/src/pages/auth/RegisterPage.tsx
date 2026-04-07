import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';

// ── Schema ────────────────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    email:           z.string().email('Enter a valid email address'),
    displayName:     z.string().min(2, 'At least 2 characters').max(80),
    legalFullName:   z.string().max(120).optional().or(z.literal('')),
    organizationName:z.string().max(120).optional().or(z.literal('')),
    countryCode:     z.string().length(2).toUpperCase().optional().or(z.literal('')),
    password:        z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: RegisterFormData) =>
      authApi.registerContributor({
        email:            data.email,
        password:         data.password,
        displayName:      data.displayName,
        legalFullName:    data.legalFullName || undefined,
        organizationName: data.organizationName || undefined,
        countryCode:      data.countryCode || undefined,
      }),
    onSuccess: (res) => {
      // Auto-login after registration
      if (res.refreshToken) {
        localStorage.setItem('fh_refresh', res.refreshToken);
      }
      setSession(res.accessToken, res.user);
      navigate('/contributor');
    },
  });

  const onSubmit = (data: RegisterFormData) => mutation.mutate(data);

  const serverError = mutation.isError
    ? (mutation.error as any)?.status === 409
      ? t('register.emailTaken')
      : t('common.error')
    : null;

  return (
    <>
      <Helmet>
        <title>{t('register.title')} — Fonthabesha</title>
      </Helmet>

      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-card__header">
            <Link to="/" className="auth-card__brand" aria-label="Fonthabesha home">
              <span className="auth-card__logo" aria-hidden="true">ፍ</span>
            </Link>
            <h1 className="auth-card__title">{t('register.title')}</h1>
            <p className="auth-card__sub">{t('register.subtitle')}</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Email */}
            <div className="form-field">
              <label className="form-label" htmlFor="reg-email">
                {t('auth.email')} <span aria-hidden="true">*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                className={`form-input${errors.email ? ' form-input--error' : ''}`}
                {...register('email')}
              />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            {/* Display name */}
            <div className="form-field">
              <label className="form-label" htmlFor="reg-displayName">
                {t('profile.displayName')} <span aria-hidden="true">*</span>
              </label>
              <input
                id="reg-displayName"
                type="text"
                autoComplete="name"
                className={`form-input${errors.displayName ? ' form-input--error' : ''}`}
                {...register('displayName')}
              />
              {errors.displayName && (
                <p className="form-error">{errors.displayName.message}</p>
              )}
            </div>

            {/* Legal full name */}
            <div className="form-field">
              <label className="form-label" htmlFor="reg-legalFullName">
                {t('profile.legalFullName')}
              </label>
              <input
                id="reg-legalFullName"
                type="text"
                autoComplete="name"
                className="form-input"
                {...register('legalFullName')}
              />
              <p className="form-hint">{t('profile.legalFullNameHint')}</p>
            </div>

            {/* Organization */}
            <div className="form-field">
              <label className="form-label" htmlFor="reg-org">
                {t('profile.organization')}
              </label>
              <input
                id="reg-org"
                type="text"
                autoComplete="organization"
                className="form-input"
                {...register('organizationName')}
              />
            </div>

            {/* Country */}
            <div className="form-field">
              <label className="form-label" htmlFor="reg-country">
                {t('profile.countryCode')}
              </label>
              <input
                id="reg-country"
                type="text"
                maxLength={2}
                placeholder="ET"
                autoComplete="country"
                className={`form-input form-input--short${errors.countryCode ? ' form-input--error' : ''}`}
                {...register('countryCode')}
              />
              {errors.countryCode && (
                <p className="form-error">{errors.countryCode.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="form-field">
              <label className="form-label" htmlFor="reg-password">
                {t('auth.password')} <span aria-hidden="true">*</span>
              </label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                className={`form-input${errors.password ? ' form-input--error' : ''}`}
                {...register('password')}
              />
              {errors.password && (
                <p className="form-error">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm password */}
            <div className="form-field">
              <label className="form-label" htmlFor="reg-confirm">
                {t('register.confirmPassword')} <span aria-hidden="true">*</span>
              </label>
              <input
                id="reg-confirm"
                type="password"
                autoComplete="new-password"
                className={`form-input${errors.confirmPassword ? ' form-input--error' : ''}`}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="form-error">{errors.confirmPassword.message}</p>
              )}
            </div>

            {serverError && (
              <p className="form-error form-error--server" role="alert">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              className="btn btn--primary btn--full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? t('register.submitting') : t('register.submit')}
            </button>
          </form>

          <p className="auth-card__footer">
            {t('register.haveAccount')}{' '}
            <Link to="/login" className="auth-card__link">
              {t('nav.login')}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
