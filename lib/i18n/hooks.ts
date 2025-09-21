'use client';

import { useTranslation } from 'react-i18next';
import { useCallback, useMemo } from 'react';
import { ThaiDateFormatter, ThaiNumberFormatter, ThaiTextUtils } from './thai-cultural';

// Enhanced translation hook with Thai cultural formatting
export function useI18n(namespace?: string) {
  const { t, i18n } = useTranslation(namespace);

  const currentLocale = i18n.language;
  const isThaiLanguage = currentLocale === 'th';
  const isEnglishLanguage = currentLocale === 'en';

  // Format dates based on locale
  const formatDate = useCallback((date: Date, format: 'short' | 'long' | 'buddhist' = 'short') => {
    if (isThaiLanguage) {
      return ThaiDateFormatter.formatDate(date, format);
    }
    return new Intl.DateTimeFormat(currentLocale).format(date);
  }, [currentLocale, isThaiLanguage]);

  // Format numbers based on locale
  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => {
    if (isThaiLanguage) {
      return ThaiNumberFormatter.formatNumber(value, options);
    }
    return new Intl.NumberFormat(currentLocale, options).format(value);
  }, [currentLocale, isThaiLanguage]);

  // Format currency based on locale
  const formatCurrency = useCallback((value: number, currency = isThaiLanguage ? 'THB' : 'USD') => {
    if (isThaiLanguage) {
      return ThaiNumberFormatter.formatCurrency(value, currency);
    }
    return new Intl.NumberFormat(currentLocale, {
      style: 'currency',
      currency
    }).format(value);
  }, [currentLocale, isThaiLanguage]);

  // Format file sizes
  const formatFileSize = useCallback((bytes: number) => {
    if (isThaiLanguage) {
      return ThaiNumberFormatter.formatFileSize(bytes);
    }

    const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }, [isThaiLanguage]);

  // Add politeness to Thai text
  const addPoliteness = useCallback((text: string, gender?: 'male' | 'female') => {
    if (isThaiLanguage) {
      return ThaiTextUtils.addPoliteness(text, gender);
    }
    return text;
  }, [isThaiLanguage]);

  // Translate with interpolation and formatting
  const translate = useCallback((key: string, options?: any) => {
    const translated = t(key, options);

    // Auto-add politeness for certain types of messages in Thai
    if (isThaiLanguage && key.includes('message') || key.includes('notification')) {
      return ThaiTextUtils.addPoliteness(translated);
    }

    return translated;
  }, [t, isThaiLanguage]);

  // Format relative time
  const formatRelativeTime = useCallback((date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (isThaiLanguage) {
      if (diffInSeconds < 60) return 'เมื่อสักครู่';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`;
      return formatDate(date, 'short');
    }

    // English relative time
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return formatDate(date, 'short');
  }, [isThaiLanguage, formatDate]);

  return {
    t: translate,
    i18n,
    currentLocale,
    isThaiLanguage,
    isEnglishLanguage,
    formatDate,
    formatNumber,
    formatCurrency,
    formatFileSize,
    formatRelativeTime,
    addPoliteness,
    changeLanguage: i18n.changeLanguage
  };
}

// Hook for form field translations
export function useFormTranslations() {
  const { t } = useI18n('form');

  return {
    required: (field: string) => t('validation.required', { field }),
    minLength: (min: number) => t('validation.minLength', { min }),
    maxLength: (max: number) => t('validation.maxLength', { max }),
    email: () => t('validation.email'),
    password: () => t('validation.password'),
    confirmPassword: () => t('validation.confirmPassword'),
    getPlaceholder: (field: string) => t(`placeholders.${field}`, { defaultValue: field }),
    getHelp: (field: string) => t(`help.${field}`, { defaultValue: '' })
  };
}

// Hook for status and action translations
export function useStatusTranslations() {
  const { t } = useI18n('common');

  return {
    loading: () => t('status.loading'),
    saving: () => t('status.saving'),
    saved: () => t('status.saved'),
    error: () => t('status.error'),
    success: () => t('status.success'),
    active: () => t('status.active'),
    inactive: () => t('status.inactive'),
    actions: {
      save: () => t('actions.save'),
      cancel: () => t('actions.cancel'),
      delete: () => t('actions.delete'),
      edit: () => t('actions.edit'),
      create: () => t('actions.create'),
      submit: () => t('actions.submit')
    }
  };
}

// Hook for navigation translations
export function useNavigationTranslations() {
  const { t } = useI18n('navigation');

  return {
    main: {
      dashboard: () => t('main.dashboard'),
      chatbots: () => t('main.chatbots'),
      products: () => t('main.products'),
      documents: () => t('main.documents'),
      analytics: () => t('main.analytics'),
      settings: () => t('main.settings'),
      admin: () => t('main.admin')
    },
    breadcrumb: {
      home: () => t('breadcrumb.home'),
      dashboard: () => t('breadcrumb.dashboard'),
      chatbots: () => t('breadcrumb.chatbots'),
      products: () => t('breadcrumb.products'),
      documents: () => t('breadcrumb.documents'),
      settings: () => t('breadcrumb.settings')
    }
  };
}

// Hook for error handling with localized messages
export function useErrorTranslations() {
  const { t } = useI18n('error');

  const formatError = useCallback((error: any) => {
    if (typeof error === 'string') {
      return error;
    }

    if (error?.code) {
      const translatedError = t(`api.${error.code}`, { defaultValue: null });
      if (translatedError) return translatedError;
    }

    if (error?.message) {
      return error.message;
    }

    return t('general.title');
  }, [t]);

  return {
    formatError,
    network: () => t('api.network'),
    server: () => t('api.server'),
    unauthorized: () => t('api.unauthorized'),
    forbidden: () => t('api.forbidden'),
    notFound: () => t('api.notFound'),
    timeout: () => t('api.timeout'),
    general: () => t('general.title')
  };
}

// Hook for success messages
export function useSuccessTranslations() {
  const { t } = useI18n('success');

  return {
    saved: () => t('general.saved'),
    created: () => t('general.created'),
    updated: () => t('general.updated'),
    deleted: () => t('general.deleted'),
    uploaded: () => t('general.uploaded'),
    processed: () => t('general.processed')
  };
}

export default useI18n;