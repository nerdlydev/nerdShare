import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enNav from './locales/en/translation.json';
import esNav from './locales/es/translation.json';
import frNav from './locales/fr/translation.json';
import deNav from './locales/de/translation.json';
import hiNav from './locales/hi/translation.json';
import zhNav from './locales/zh/translation.json';

const resources = {
  en: { translation: enNav },
  es: { translation: esNav },
  fr: { translation: frNav },
  de: { translation: deNav },
  hi: { translation: hiNav },
  zh: { translation: zhNav },
};

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'hi', 'zh'] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
