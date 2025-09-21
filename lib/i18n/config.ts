import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

// Import type definitions
export interface I18nConfig {
  supportedLocales: string[];
  defaultLocale: string;
  fallbackLocale: string;
  namespaces: string[];
  defaultNamespace: string;
}

// Configuration
export const i18nConfig: I18nConfig = {
  supportedLocales: ['en', 'th'],
  defaultLocale: 'en',
  fallbackLocale: 'en',
  namespaces: [
    'common',
    'dashboard',
    'chatbot',
    'product',
    'document',
    'auth',
    'form',
    'error',
    'success',
    'navigation',
    'admin',
    'analytics',
    'settings'
  ],
  defaultNamespace: 'common'
};

// Thai language configuration
export const thaiConfig = {
  calendar: {
    buddhist: true,
    gregorian: true
  },
  numbers: {
    format: 'th-TH',
    currency: 'THB'
  },
  date: {
    format: 'dd/MM/yyyy',
    longFormat: 'วันdddd ที่ dd MMMM yyyy'
  },
  formality: {
    level: 'polite', // formal, polite, casual
    honorifics: true
  }
};

// Language detection options
const languageDetectorOptions = {
  // Order of detection methods
  order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],

  // Cache user language
  caches: ['localStorage'],

  // Exclude certain detection methods
  excludeCacheFor: ['cimode'],

  // Optional htmlTag with lang attribute
  htmlTag: document?.documentElement,

  // Cookie options (if using cookies)
  cookieMinutes: 10080, // 7 days
  cookieDomain: typeof window !== 'undefined' ? window.location.hostname : undefined,

  // Convert country code to language code
  convertDetectedLanguage: (lng: string) => {
    // Map country codes to supported locales
    const languageMap: Record<string, string> = {
      'th-TH': 'th',
      'en-US': 'en',
      'en-GB': 'en',
      'en-AU': 'en'
    };

    return languageMap[lng] || lng.split('-')[0];
  }
};

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .use(
    resourcesToBackend((language: string, namespace: string) =>
      import(`./locales/${language}/${namespace}.json`)
    )
  )
  .init({
    lng: i18nConfig.defaultLocale,
    fallbackLng: i18nConfig.fallbackLocale,

    // Default namespace
    defaultNS: i18nConfig.defaultNamespace,
    ns: i18nConfig.namespaces,

    // Language detection
    detection: languageDetectorOptions,

    // Interpolation options
    interpolation: {
      escapeValue: false, // React already escapes values
      formatSeparator: ',',
      format: (value: any, format?: string, lng?: string) => {
        // Custom formatting for dates, numbers, etc.
        if (format === 'currency' && lng === 'th') {
          return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB'
          }).format(value);
        }

        if (format === 'date' && lng === 'th') {
          return new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }).format(new Date(value));
        }

        if (format === 'number' && lng === 'th') {
          return new Intl.NumberFormat('th-TH').format(value);
        }

        return value;
      }
    },

    // React i18next options
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em', 'span']
    },

    // Development options
    debug: process.env.NODE_ENV === 'development',

    // Backend options for dynamic loading
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      addPath: '/locales/{{lng}}/{{ns}}.missing.json'
    },

    // Pluralization rules (Thai doesn't use plurals)
    pluralSeparator: '_',
    contextSeparator: '_',

    // Missing keys
    saveMissing: process.env.NODE_ENV === 'development',
    saveMissingTo: 'current',
    missingKeyHandler: (lng: string[], ns: string, key: string) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Missing translation key: ${ns}:${key} for language: ${lng.join(', ')}`);
      }
    }
  });

export default i18n;