import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import es from './locales/es.json';
import eu from './locales/eu.json';

i18n
  .use(LanguageDetector) // detecta idioma guardado en localStorage o el del navegador
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      eu: { translation: eu },
    },
    fallbackLng: 'es',
    supportedLngs: ['es', 'eu'],
    interpolation: {
      escapeValue: false, // React ya escapa por defecto, no hace falta duplicarlo
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'brigada_lang',
    },
  });

export default i18n;
