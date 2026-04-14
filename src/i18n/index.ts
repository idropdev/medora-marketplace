import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import es from './locales/es.json';

i18n
    .use(LanguageDetector)       // auto-detect browser language
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            es: { translation: es },
        },
        fallbackLng: 'en',
        supportedLngs: ['en', 'es'],
        // Detection order: localStorage → browser language
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'medora-language',
        },
        interpolation: {
            escapeValue: false, // React already escapes
        },
    });

export default i18n;
