/**
 * i18n Utility Functions for Thai/English Localization
 * Used by the i18n-manager subagent for translation management
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface TranslationNamespace {
  [key: string]: string | TranslationNamespace;
}

export interface LocaleConfig {
  code: string;
  name: string;
  native_name: string;
  direction: 'ltr' | 'rtl';
  font_family: string;
  line_height: number;
  pluralization_rules: Record<string, boolean>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  coverage: number;
  missingKeys: string[];
}

export interface TranslationMetrics {
  totalKeys: number;
  translatedKeys: Record<string, number>;
  coveragePercentage: Record<string, number>;
  lastUpdated: Record<string, Date>;
}

/**
 * Load translation file for a specific locale and namespace
 */
export function loadTranslation(locale: string, namespace: string): TranslationNamespace {
  const filePath = join(process.cwd(), 'locales', locale, `${namespace}.json`);

  if (!existsSync(filePath)) {
    throw new Error(`Translation file not found: ${filePath}`);
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse translation file: ${filePath}`);
  }
}

/**
 * Save translation file for a specific locale and namespace
 */
export function saveTranslation(
  locale: string,
  namespace: string,
  translations: TranslationNamespace
): void {
  const filePath = join(process.cwd(), 'locales', locale, `${namespace}.json`);

  try {
    const content = JSON.stringify(translations, null, 2);
    writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save translation file: ${filePath}`);
  }
}

/**
 * Extract all translation keys from a namespace (flattened)
 */
export function extractKeys(translations: TranslationNamespace, prefix = ''): string[] {
  const keys: string[] = [];

  for (const [key, value] of Object.entries(translations)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      keys.push(fullKey);
    } else if (typeof value === 'object' && value !== null) {
      keys.push(...extractKeys(value, fullKey));
    }
  }

  return keys;
}

/**
 * Find missing translation keys between locales
 */
export function findMissingKeys(
  sourceLocale: string,
  targetLocale: string,
  namespace: string
): string[] {
  const sourceTranslations = loadTranslation(sourceLocale, namespace);
  const targetTranslations = loadTranslation(targetLocale, namespace);

  const sourceKeys = new Set(extractKeys(sourceTranslations));
  const targetKeys = new Set(extractKeys(targetTranslations));

  return Array.from(sourceKeys).filter(key => !targetKeys.has(key));
}

/**
 * Validate translation completeness and quality
 */
export function validateTranslations(locale: string, namespace: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const translations = loadTranslation(locale, namespace);
    const keys = extractKeys(translations);

    // Check for empty values
    const emptyKeys = keys.filter(key => {
      const value = getNestedValue(translations, key);
      return !value || value.trim() === '';
    });

    if (emptyKeys.length > 0) {
      errors.push(`Empty translation values found: ${emptyKeys.join(', ')}`);
    }

    // Thai-specific validations
    if (locale === 'th') {
      const thaiValidation = validateThaiTranslations(translations);
      errors.push(...thaiValidation.errors);
      warnings.push(...thaiValidation.warnings);
    }

    // English-specific validations
    if (locale === 'en') {
      const englishValidation = validateEnglishTranslations(translations);
      errors.push(...englishValidation.errors);
      warnings.push(...englishValidation.warnings);
    }

    // Check for interpolation consistency
    const interpolationErrors = validateInterpolationVars(translations);
    errors.push(...interpolationErrors);

    // Calculate coverage
    const referenceKeys = extractKeys(loadTranslation('en', namespace));
    const coverage = (keys.length / referenceKeys.length) * 100;
    const missingKeys = referenceKeys.filter(key => !keys.includes(key));

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      coverage,
      missingKeys
    };

  } catch (error) {
    return {
      isValid: false,
      errors: [`Failed to validate translations: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
      coverage: 0,
      missingKeys: []
    };
  }
}

/**
 * Thai-specific validation rules
 */
function validateThaiTranslations(translations: TranslationNamespace): { errors: string[], warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const keys = extractKeys(translations);

  keys.forEach(key => {
    const value = getNestedValue(translations, key);

    if (typeof value === 'string') {
      // Check for Thai character range (U+0E00–U+0E7F)
      const hasThaiChars = /[\u0E00-\u0E7F]/.test(value);
      const hasLatinChars = /[a-zA-Z]/.test(value);

      if (!hasThaiChars && hasLatinChars && value.length > 10) {
        warnings.push(`Key "${key}" may need Thai translation: "${value}"`);
      }

      // Check for inappropriate tone (very basic check)
      if (value.includes('คุณ') && (key.includes('error') || key.includes('warning'))) {
        warnings.push(`Key "${key}" may need more formal tone for error messages`);
      }

      // Check for proper Thai spacing
      if (value.includes('  ')) {
        warnings.push(`Key "${key}" has double spaces which may affect Thai typography`);
      }
    }
  });

  return { errors, warnings };
}

/**
 * English-specific validation rules
 */
function validateEnglishTranslations(translations: TranslationNamespace): { errors: string[], warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const keys = extractKeys(translations);

  keys.forEach(key => {
    const value = getNestedValue(translations, key);

    if (typeof value === 'string') {
      // Check for basic grammar issues
      if (value.endsWith(' .') || value.endsWith(' ,')) {
        warnings.push(`Key "${key}" has spacing before punctuation: "${value}"`);
      }

      // Check for consistent capitalization in buttons/actions
      if (key.includes('button') || key.includes('action')) {
        if (value !== value.charAt(0).toUpperCase() + value.slice(1)) {
          warnings.push(`Key "${key}" may need title case for UI element: "${value}"`);
        }
      }

      // Check for accessibility-friendly language
      if (value.toLowerCase().includes('click here') || value.toLowerCase().includes('read more')) {
        warnings.push(`Key "${key}" uses non-descriptive link text: "${value}"`);
      }
    }
  });

  return { errors, warnings };
}

/**
 * Validate interpolation variables consistency
 */
function validateInterpolationVars(translations: TranslationNamespace): string[] {
  const errors: string[] = [];
  const keys = extractKeys(translations);

  keys.forEach(key => {
    const value = getNestedValue(translations, key);

    if (typeof value === 'string') {
      // Check for interpolation variables like {{variable}}
      const interpolationVars = value.match(/\{\{([^}]+)\}\}/g);

      if (interpolationVars) {
        interpolationVars.forEach(variable => {
          const varName = variable.slice(2, -2).trim();

          // Check for valid variable names
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
            errors.push(`Invalid interpolation variable "${variable}" in key "${key}"`);
          }
        });
      }

      // Check for unmatched brackets
      const openBrackets = (value.match(/\{\{/g) || []).length;
      const closeBrackets = (value.match(/\}\}/g) || []).length;

      if (openBrackets !== closeBrackets) {
        errors.push(`Unmatched interpolation brackets in key "${key}": "${value}"`);
      }
    }
  });

  return errors;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Set nested value in object using dot notation
 */
export function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;

  const target = keys.reduce((current, key) => {
    if (!(key in current)) {
      current[key] = {};
    }
    return current[key];
  }, obj);

  target[lastKey] = value;
}

/**
 * Generate translation metrics report
 */
export function generateMetrics(locales: string[], namespaces: string[]): TranslationMetrics {
  const totalKeys = new Set<string>();
  const translatedKeys: Record<string, number> = {};
  const coveragePercentage: Record<string, number> = {};
  const lastUpdated: Record<string, Date> = {};

  // Collect all keys from English (reference locale)
  namespaces.forEach(namespace => {
    try {
      const englishTranslations = loadTranslation('en', namespace);
      const keys = extractKeys(englishTranslations);
      keys.forEach(key => totalKeys.add(`${namespace}.${key}`));
    } catch (error) {
      // Namespace doesn't exist, skip
    }
  });

  const totalKeyCount = totalKeys.size;

  locales.forEach(locale => {
    translatedKeys[locale] = 0;

    namespaces.forEach(namespace => {
      try {
        const translations = loadTranslation(locale, namespace);
        const keys = extractKeys(translations);
        translatedKeys[locale] += keys.length;

        // Get file modification time
        const filePath = join(process.cwd(), 'locales', locale, `${namespace}.json`);
        if (existsSync(filePath)) {
          const stats = require('fs').statSync(filePath);
          if (!lastUpdated[locale] || stats.mtime > lastUpdated[locale]) {
            lastUpdated[locale] = stats.mtime;
          }
        }
      } catch (error) {
        // Translation file doesn't exist
      }
    });

    coveragePercentage[locale] = totalKeyCount > 0 ?
      (translatedKeys[locale] / totalKeyCount) * 100 : 0;
  });

  return {
    totalKeys: totalKeyCount,
    translatedKeys,
    coveragePercentage,
    lastUpdated
  };
}

/**
 * Format Thai date with Buddhist Era
 */
export function formatThaiDate(date: Date, format: 'short' | 'medium' | 'long' | 'full' = 'medium'): string {
  const buddhistYear = date.getFullYear() + 543;
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];

  switch (format) {
    case 'short':
      return `${day}/${date.getMonth() + 1}/${buddhistYear}`;
    case 'medium':
      return `${day} ${month.slice(0, 3)}. ${buddhistYear}`;
    case 'long':
      return `${day} ${month} ${buddhistYear}`;
    case 'full':
      const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
      const dayName = thaiDays[date.getDay()];
      return `วัน${dayName} ${day} ${month} พ.ศ. ${buddhistYear}`;
    default:
      return `${day} ${month} ${buddhistYear}`;
  }
}

/**
 * Format Thai currency
 */
export function formatThaiCurrency(amount: number, showSymbol: boolean = true): string {
  const formatted = new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);

  return showSymbol ? `฿${formatted}` : formatted;
}

/**
 * Convert Arabic numerals to Thai numerals
 */
export function toThaiNumerals(text: string): string {
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return text.replace(/[0-9]/g, (digit) => thaiDigits[parseInt(digit)]);
}

/**
 * Check if text contains Thai characters
 */
export function hasThaiCharacters(text: string): boolean {
  return /[\u0E00-\u0E7F]/.test(text);
}

/**
 * Generate translation key suggestions based on existing patterns
 */
export function suggestTranslationKeys(namespace: string, context: string): string[] {
  const suggestions: string[] = [];

  try {
    const translations = loadTranslation('en', namespace);
    const existingKeys = extractKeys(translations);

    // Find similar keys based on context
    const contextWords = context.toLowerCase().split(/\s+/);

    existingKeys.forEach(key => {
      const keyWords = key.toLowerCase().split(/[._]/);
      const commonWords = contextWords.filter(word => keyWords.includes(word));

      if (commonWords.length > 0) {
        suggestions.push(key);
      }
    });

    // Generate new key suggestions
    const basePath = context.replace(/\s+/g, '_').toLowerCase();
    suggestions.push(
      `${namespace}.${basePath}`,
      `${namespace}.${basePath}.title`,
      `${namespace}.${basePath}.description`,
      `${namespace}.${basePath}.button`,
      `${namespace}.${basePath}.error`,
      `${namespace}.${basePath}.success`
    );

  } catch (error) {
    // Namespace doesn't exist, provide generic suggestions
    const basePath = context.replace(/\s+/g, '_').toLowerCase();
    suggestions.push(`${namespace}.${basePath}`);
  }

  return Array.from(new Set(suggestions)).slice(0, 10);
}

/**
 * Export translations for external translation services
 */
export function exportForTranslation(
  sourceLocale: string,
  targetLocale: string,
  namespaces: string[],
  format: 'json' | 'csv' | 'xlsx' = 'json'
): any {
  const exportData: any = {};

  namespaces.forEach(namespace => {
    try {
      const sourceTranslations = loadTranslation(sourceLocale, namespace);
      const sourceKeys = extractKeys(sourceTranslations);

      let targetTranslations: TranslationNamespace = {};
      try {
        targetTranslations = loadTranslation(targetLocale, namespace);
      } catch (error) {
        // Target locale doesn't exist yet
      }

      const namespaceData: Record<string, any> = {};

      sourceKeys.forEach(key => {
        const sourceValue = getNestedValue(sourceTranslations, key);
        const targetValue = getNestedValue(targetTranslations, key);

        namespaceData[key] = {
          source: sourceValue,
          target: targetValue || '',
          status: targetValue ? 'translated' : 'pending',
          context: getTranslationContext(key)
        };
      });

      exportData[namespace] = namespaceData;

    } catch (error) {
      console.warn(`Failed to export namespace ${namespace}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  });

  switch (format) {
    case 'csv':
      return convertToCSV(exportData);
    case 'xlsx':
      return convertToXLSX(exportData);
    default:
      return exportData;
  }
}

/**
 * Get translation context for better translator understanding
 */
function getTranslationContext(key: string): string {
  const keyParts = key.split('.');
  const contexts: Record<string, string> = {
    'title': 'Page or section title',
    'subtitle': 'Secondary heading',
    'label': 'Form field label',
    'placeholder': 'Input field placeholder text',
    'button': 'Button text',
    'error': 'Error message',
    'success': 'Success message',
    'warning': 'Warning message',
    'info': 'Informational message',
    'validation': 'Form validation message',
    'confirmation': 'Confirmation dialog text',
    'navigation': 'Navigation menu item',
    'footer': 'Footer content',
    'header': 'Header content'
  };

  for (const part of keyParts) {
    if (contexts[part]) {
      return contexts[part];
    }
  }

  return 'General text content';
}

/**
 * Convert export data to CSV format (simplified implementation)
 */
function convertToCSV(data: any): string {
  const rows: string[] = ['Namespace,Key,Source,Target,Status,Context'];

  Object.entries(data).forEach(([namespace, namespaceData]: [string, any]) => {
    Object.entries(namespaceData).forEach(([key, translation]: [string, any]) => {
      const row = [
        namespace,
        key,
        `"${translation.source.replace(/"/g, '""')}"`,
        `"${translation.target.replace(/"/g, '""')}"`,
        translation.status,
        translation.context
      ].join(',');
      rows.push(row);
    });
  });

  return rows.join('\n');
}

/**
 * Convert export data to XLSX format (placeholder implementation)
 */
function convertToXLSX(data: any): any {
  // This would require a library like 'xlsx' to implement properly
  throw new Error('XLSX export not implemented. Use JSON or CSV format.');
}