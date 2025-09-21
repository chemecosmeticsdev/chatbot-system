// Thai/English Internationalization System - Main Export
// Comprehensive i18n solution for chatbot management platform

// Core configuration and setup
export { default as i18n, i18nConfig, thaiConfig } from './config';
export type { I18nConfig } from './config';

// TypeScript types
export type {
  TranslationResources,
  CommonTranslations,
  DashboardTranslations,
  ChatbotTranslations,
  ProductTranslations,
  DocumentTranslations,
  AuthTranslations,
  FormTranslations,
  ErrorTranslations,
  SuccessTranslations,
  NavigationTranslations,
  AdminTranslations,
  AnalyticsTranslations,
  SettingsTranslations
} from './types';

// React hooks for translations
export {
  useI18n,
  useFormTranslations,
  useStatusTranslations,
  useNavigationTranslations,
  useErrorTranslations,
  useSuccessTranslations
} from './hooks';

// Thai cultural utilities
export {
  ThaiDateFormatter,
  ThaiNumberFormatter,
  ThaiTextUtils,
  ThaiColorSystem,
  ThaiBuddhistCalendar,
  ThaiCulturalValidator,
  thaiCulturalDefaults
} from './thai-cultural';
export type { ThaiCulturalSettings } from './thai-cultural';

// Performance and caching
export {
  TranslationCacheManager,
  LazyTranslationLoader,
  translationCache,
  translationLoader,
  useI18nPerformance,
  usePrefetchTranslations,
  getBundleForRoute,
  defaultCacheConfig
} from './performance';
export type { CacheConfig } from './performance';

// Translation management
export {
  TranslationManager,
  TranslationCLI
} from './translation-manager';
export type {
  TranslationKey,
  TranslationReport,
  TranslationValidationRule
} from './translation-manager';

// Provider and context
export {
  I18nProvider,
  useI18nContext,
  RouteNamespaceLoader,
  LazyTranslation,
  I18nErrorBoundary,
  I18nDevTools
} from './provider';

// Re-export react-i18next for direct usage when needed
export { useTranslation, Trans } from 'react-i18next';

// Quick setup helper
export const setupI18n = async (locale = 'en') => {
  // Import i18n here to avoid circular dependencies
  const { default: i18n } = await import('./config');
  await i18n.changeLanguage(locale);

  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
    document.documentElement.dir = 'ltr';
  }

  return i18n;
};

// Version
export const version = '1.0.0';

// Import all exports for re-export in default
import { default as i18nInstance, i18nConfig } from './config';
import { useI18n } from './hooks';
import { ThaiDateFormatter, ThaiNumberFormatter, ThaiTextUtils } from './thai-cultural';
import { TranslationManager } from './translation-manager';
import { translationCache, translationLoader } from './performance';
import { I18nProvider } from './provider';

// Default export
export default {
  i18n: i18nInstance,
  i18nConfig,
  useI18n,
  ThaiDateFormatter,
  ThaiNumberFormatter,
  ThaiTextUtils,
  TranslationManager,
  translationCache,
  translationLoader,
  I18nProvider,
  setupI18n,
  version
};