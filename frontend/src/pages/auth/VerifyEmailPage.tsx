import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

type Status = 'idle' | 'verifying' | 'success' | 'error';

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'error');
  const [message, setMessage] = useState<string | null>(token ? null : t('auth.invalidVerificationToken'));

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    authApi
      .confirmEmailVerification(token)
      .then(() => {
        if (!active) return;
        setStatus('success');
        setMessage(t('auth.emailVerified'));
      })
      .catch((err) => {
        if (!active) return;
        setStatus('error');
        if (err instanceof ApiError) {
          setMessage(err.message);
          return;
        }
        setMessage(t('auth.serverError'));
      });

    return () => {
      active = false;
    };
  }, [token, t]);

  return (
    <>
      <Helmet><title>{t('auth.verifyEmail')} — Fonthabesha</title></Helmet>
      <div className="auth-shell">
        <div className="auth-card">
          <Link to="/" className="auth-card__brand" aria-label="Fonthabesha home">
            <span className="auth-card__logo" aria-hidden="true">ፍ</span>
          </Link>
          <h1 className="auth-card__title">{t('auth.verifyEmail')}</h1>
          <p className="auth-card__subtitle">
            {status === 'verifying' ? t('auth.verifyingEmail') : message}
          </p>
          {status === 'success' && (
            <Link to="/login" className="btn btn--primary btn--full">{t('nav.login')}</Link>
          )}
          {status === 'error' && (
            <Link to="/login" className="btn btn--secondary btn--full">{t('auth.backToLogin')}</Link>
          )}
        </div>
      </div>
    </>
  );
}
