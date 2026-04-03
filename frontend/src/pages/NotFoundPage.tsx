import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <>
      <Helmet><title>404 — {t('notFound.title')} — Fonthabesha</title></Helmet>
      <div className="not-found" role="main" aria-labelledby="not-found-title">
        <div className="not-found__glyph" aria-hidden="true">ፍ</div>
        <p className="eyebrow">404</p>
        <h1 id="not-found-title" className="not-found__title">{t('notFound.title')}</h1>
        <p className="not-found__desc">{t('notFound.description')}</p>
        <div className="not-found__actions">
          <Link to="/" className="btn btn--primary">{t('notFound.backHome')}</Link>
          <Link to="/fonts" className="btn btn--secondary">{t('notFound.browseFonts')}</Link>
        </div>
      </div>
    </>
  );
}
