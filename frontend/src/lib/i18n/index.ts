import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import amTranslations from './am.json';
import enTranslations from './en.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      am: { translation: amTranslations },
      en: { translation: enTranslations },
    },
    // Default to Amharic; fall back to English when a key is missing
    lng: 'am',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    // Prevent missing-key warnings from polluting console in prod
    missingKeyHandler: import.meta.env.DEV
      ? (lngs, ns, key) => console.warn(`[i18n] Missing key: ${ns}:${key} for ${lngs}`)
      : undefined,
  });

export default i18n;
