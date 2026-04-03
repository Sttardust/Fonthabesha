import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

/**
 * Licenses page — static informational page about font licenses.
 * In V2 this will pull live license data from GET /fonts/filters.
 */

const LICENSES = [
  {
    code: 'OFL-1.1',
    name: 'SIL Open Font License 1.1',
    permissions: {
      redistribute: true,
      commercial: true,
      modify: true,
      attribution: false,
      embedding: true,
    },
    summary: {
      am: 'ይህ ፈቃድ ፊደሎቹን በነፃ መጠቀም፣ ማሻሻልና ማሰራጨት ያስፈቅዳል። ስም ብቻ መቀየር አይፈቀድም።',
      en: 'Allows use, modification, and redistribution of fonts freely. Cannot be sold standalone.',
    },
    url: 'https://scripts.sil.org/OFL',
  },
  {
    code: 'Apache-2.0',
    name: 'Apache License 2.0',
    permissions: {
      redistribute: true,
      commercial: true,
      modify: true,
      attribution: true,
      embedding: true,
    },
    summary: {
      am: 'ሰፊ ፈቃድ — ለንግድ ጭምር መጠቀም ይቻላል። የደራሲውን ስም ማስቀመጥ ያስፈልጋል።',
      en: 'Broad permissive license. Commercial use allowed. Attribution required.',
    },
    url: 'https://www.apache.org/licenses/LICENSE-2.0',
  },
  {
    code: 'MIT',
    name: 'MIT License',
    permissions: {
      redistribute: true,
      commercial: true,
      modify: true,
      attribution: true,
      embedding: true,
    },
    summary: {
      am: 'በጣም ቀላልና ሰፊ ፈቃድ። ሁሉም ዓይነት አጠቃቀም ይፈቀዳል።',
      en: 'Simple and permissive. Allows all uses including commercial.',
    },
    url: 'https://opensource.org/licenses/MIT',
  },
];

function Check({ ok }: { ok: boolean }) {
  return (
    <span
      className={ok ? 'license-check license-check--yes' : 'license-check license-check--no'}
      aria-label={ok ? 'Yes' : 'No'}
    >
      {ok ? '✓' : '✗'}
    </span>
  );
}

export default function LicensesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'am' ? 'am' : 'en';

  return (
    <>
      <Helmet>
        <title>{t('nav.licenses')} — Fonthabesha</title>
        <meta name="description" content="All fonts on Fonthabesha are open-source. A plain-language guide to OFL, Apache, MIT, and CC licenses used on this platform." />
        <meta property="og:title"       content={`${t('nav.licenses')} — Fonthabesha`} />
        <meta property="og:description" content="All fonts on Fonthabesha are open-source. A plain-language guide to OFL, Apache, MIT, and CC licenses used on this platform." />
        <meta property="og:type"        content="website" />
      </Helmet>

      <div className="page-container page-container--narrow">
        <h1 className="page-title">{t('nav.licenses')}</h1>
        <p className="licenses-intro">
          {t('licenses.intro')}
        </p>

        <div className="licenses-list">
          {LICENSES.map((lic) => (
            <div key={lic.code} className="license-card">
              <div className="license-card__header">
                <h2 className="license-card__title">{lic.name}</h2>
                <span className="badge license-card__badge">{lic.code}</span>
              </div>

              <p className="license-card__summary">{lic.summary[lang]}</p>

              <table className="license-card__table">
                <tbody>
                  <tr>
                    <td>{t('licenses.permissions.redistribute')}</td>
                    <td><Check ok={lic.permissions.redistribute} /></td>
                  </tr>
                  <tr>
                    <td>{t('licenses.permissions.commercial')}</td>
                    <td><Check ok={lic.permissions.commercial} /></td>
                  </tr>
                  <tr>
                    <td>{t('licenses.permissions.modify')}</td>
                    <td><Check ok={lic.permissions.modify} /></td>
                  </tr>
                  <tr>
                    <td>{t('licenses.permissions.embed')}</td>
                    <td><Check ok={lic.permissions.embedding} /></td>
                  </tr>
                  <tr>
                    <td>{t('licenses.permissions.attribution')}</td>
                    <td><Check ok={lic.permissions.attribution} /></td>
                  </tr>
                </tbody>
              </table>

              <a
                href={lic.url}
                target="_blank"
                rel="noopener noreferrer"
                className="license-card__link"
                aria-label={`Read full ${lic.name} license (opens in new tab)`}
              >
                {lang === 'am' ? 'ሙሉ ፈቃዱን ያንብቡ →' : 'Read full license →'}
              </a>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
