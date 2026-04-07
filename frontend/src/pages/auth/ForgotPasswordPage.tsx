import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

const schema = z.object({
  email: z.string().email(),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [deliveryHint, setDeliveryHint] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await authApi.requestPasswordReset(data.email);
      setDeliveryHint(response.emailDelivery ?? null);
      setSubmitted(true);
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
      <Helmet><title>{t('auth.forgotPassword')} — Fonthabesha</title></Helmet>
      <div className="auth-shell">
        <div className="auth-card">
          <Link to="/" className="auth-card__brand" aria-label="Fonthabesha home">
            <span className="auth-card__logo" aria-hidden="true">ፍ</span>
          </Link>
          <h1 className="auth-card__title">{t('auth.forgotPassword')}</h1>
          <p className="auth-card__subtitle">{t('auth.forgotPasswordHelp')}</p>

          {submitted ? (
            <div>
              <p className="form-hint">{t('auth.resetEmailSent')}</p>
              {deliveryHint && <p className="form-hint">{t('auth.deliveryMethod')}: {deliveryHint}</p>}
              <Link to="/login" className="btn btn--secondary btn--full">{t('nav.login')}</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="email">{t('auth.email')}</label>
                <input id="email" type="email" autoComplete="email" className={`form-input${errors.email ? ' form-input--error' : ''}`} {...register('email')} />
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>

              {errors.root && <p className="form-error form-error--global">{errors.root.message}</p>}

              <button type="submit" className="btn btn--primary btn--full" disabled={isSubmitting}>
                {isSubmitting ? t('common.loading') : t('auth.sendResetLink')}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
