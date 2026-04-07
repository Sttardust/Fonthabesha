import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

const schema = z.object({
  newPassword: z.string().min(8).max(200),
  confirmPassword: z.string().min(8).max(200),
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [completed, setCompleted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      setError('root', { message: t('auth.invalidResetToken') });
      return;
    }
    if (data.newPassword !== data.confirmPassword) {
      setError('confirmPassword', { message: t('auth.passwordsDoNotMatch') });
      return;
    }
    try {
      await authApi.confirmPasswordReset(token, data.newPassword);
      setCompleted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError('root', { message: err.message });
        return;
      }
      setError('root', { message: t('auth.serverError') });
    }
  };

  return (
    <>
      <Helmet><title>{t('auth.resetPassword')} — Fonthabesha</title></Helmet>
      <div className="auth-shell">
        <div className="auth-card">
          <Link to="/" className="auth-card__brand" aria-label="Fonthabesha home">
            <span className="auth-card__logo" aria-hidden="true">ፍ</span>
          </Link>
          <h1 className="auth-card__title">{t('auth.resetPassword')}</h1>
          <p className="auth-card__subtitle">{t('auth.resetPasswordHelp')}</p>

          {completed ? (
            <div>
              <p className="form-hint">{t('auth.passwordResetSuccess')}</p>
              <Link to="/login" className="btn btn--primary btn--full">{t('nav.login')}</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="newPassword">{t('auth.newPassword')}</label>
                <input id="newPassword" type="password" autoComplete="new-password" className={`form-input${errors.newPassword ? ' form-input--error' : ''}`} {...register('newPassword')} />
                {errors.newPassword && <p className="form-error">{errors.newPassword.message}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
                <input id="confirmPassword" type="password" autoComplete="new-password" className={`form-input${errors.confirmPassword ? ' form-input--error' : ''}`} {...register('confirmPassword')} />
                {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
              </div>

              {errors.root && <p className="form-error form-error--global">{errors.root.message}</p>}

              <button type="submit" className="btn btn--primary btn--full" disabled={isSubmitting}>
                {isSubmitting ? t('common.loading') : t('auth.resetPassword')}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
