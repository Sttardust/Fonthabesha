import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

export default function AboutPage() {
  const { t } = useTranslation();
  return (
    <>
      <Helmet><title>{t('nav.about')} — Fonthabesha</title></Helmet>
      <div className="page-container page-container--narrow">
        <h1 className="page-title">{t('nav.about')}</h1>
        <p>
          Fonthabesha is an open platform for discovering, reviewing, and downloading
          high-quality Ethiopic and Amharic typefaces.
        </p>
        <p>
          Our mission is to make Ethiopic typography accessible to designers, developers,
          and communities worldwide — for free.
        </p>
      </div>
    </>
  );
}
