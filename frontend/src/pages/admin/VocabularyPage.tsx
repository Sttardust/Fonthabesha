import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function VocabularyPage() {
  const { t } = useTranslation();

  const sections = [
    { label: t('admin.publishers'), path: '/admin/publishers', icon: '🏢' },
    { label: t('admin.designers'), path: '/admin/designers', icon: '✏️' },
    { label: t('admin.categories'), path: '/admin/categories', icon: '🗂️' },
    { label: t('admin.licenses'), path: '/admin/licenses', icon: '📄' },
  ];

  return (
    <>
      <Helmet><title>{t('admin.vocabulary.title')} — Fonthabesha</title></Helmet>
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('admin.vocabulary.title')}</h1>
      </div>
      <p className="portal-page-desc">{t('admin.vocabulary.desc')}</p>
      <div className="vocab-hub">
        {sections.map((s) => (
          <Link key={s.path} to={s.path} className="vocab-hub__card">
            <span className="vocab-hub__icon" aria-hidden="true">{s.icon}</span>
            <span className="vocab-hub__label">{s.label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
