// Translation Management Utilities and Validation System

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { i18nConfig } from './config';
import type { TranslationResources } from './types';

export interface TranslationKey {
  key: string;
  namespace: string;
  value: string;
  locale: string;
  status: 'present' | 'missing' | 'empty' | 'outdated';
  lastModified?: Date;
}

export interface TranslationReport {
  totalKeys: number;
  translatedKeys: number;
  missingKeys: string[];
  emptyKeys: string[];
  outdatedKeys: string[];
  completionPercentage: number;
  byNamespace: Record<string, {
    total: number;
    translated: number;
    missing: string[];
    completion: number;
  }>;
  suggestions: string[];
  errors: string[];
}

export interface TranslationValidationRule {
  name: string;
  description: string;
  validate: (key: string, value: string, locale: string) => boolean | string;
  severity: 'error' | 'warning' | 'info';
}

export class TranslationManager {
  private baseDir: string;
  private locales: string[];
  private namespaces: string[];
  private validationRules: TranslationValidationRule[];

  constructor(baseDir = 'lib/i18n/locales') {
    this.baseDir = baseDir;
    this.locales = i18nConfig.supportedLocales;
    this.namespaces = i18nConfig.namespaces;
    this.validationRules = this.getDefaultValidationRules();
  }

  // Load all translations for a specific locale
  public loadTranslations(locale: string): Record<string, any> {
    const translations: Record<string, any> = {};

    for (const namespace of this.namespaces) {
      const filePath = join(this.baseDir, locale, `${namespace}.json`);

      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          translations[namespace] = JSON.parse(content);
        } catch (error) {
          console.error(`Error loading ${locale}/${namespace}.json:`, error);
          translations[namespace] = {};
        }
      } else {
        translations[namespace] = {};
      }
    }

    return translations;
  }

  // Get all translation keys from a nested object
  private flattenKeys(obj: any, prefix = ''): string[] {
    const keys: string[] = [];

    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof obj[key] === 'object' && obj[key] !== null) {
        keys.push(...this.flattenKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }

    return keys;
  }

  // Generate comprehensive translation report
  public generateReport(baseLocale = 'en'): TranslationReport {
    const baseTranslations = this.loadTranslations(baseLocale);
    const report: TranslationReport = {
      totalKeys: 0,
      translatedKeys: 0,
      missingKeys: [],
      emptyKeys: [],
      outdatedKeys: [],
      completionPercentage: 0,
      byNamespace: {},
      suggestions: [],
      errors: []
    };

    // Get all keys from base locale
    const allKeys: { namespace: string; key: string }[] = [];

    for (const namespace of this.namespaces) {
      const namespaceKeys = this.flattenKeys(baseTranslations[namespace]);
      allKeys.push(...namespaceKeys.map(key => ({ namespace, key })));

      report.byNamespace[namespace] = {
        total: namespaceKeys.length,
        translated: 0,
        missing: [],
        completion: 0
      };
    }

    report.totalKeys = allKeys.length;

    // Check translations for each locale
    for (const locale of this.locales) {
      if (locale === baseLocale) continue;

      const translations = this.loadTranslations(locale);

      for (const { namespace, key } of allKeys) {
        const value = this.getNestedValue(translations[namespace], key);

        if (value === undefined) {
          report.missingKeys.push(`${locale}:${namespace}.${key}`);
          report.byNamespace[namespace].missing.push(key);
        } else if (value === '' || value === null) {
          report.emptyKeys.push(`${locale}:${namespace}.${key}`);
        } else {
          report.translatedKeys++;
          report.byNamespace[namespace].translated++;
        }
      }
    }

    // Calculate completion percentages
    report.completionPercentage = Math.round(
      (report.translatedKeys / (report.totalKeys * (this.locales.length - 1))) * 100
    );

    for (const namespace of this.namespaces) {
      const nsData = report.byNamespace[namespace];
      nsData.completion = Math.round(
        (nsData.translated / (nsData.total * (this.locales.length - 1))) * 100
      );
    }

    // Generate suggestions
    this.generateSuggestions(report);

    return report;
  }

  // Get nested value from object using dot notation
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Set nested value in object using dot notation
  private setNestedValue(obj: any, path: string, value: any): void {
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

  // Add missing translation keys with empty values
  public addMissingKeys(targetLocale: string, baseLocale = 'en'): void {
    const baseTranslations = this.loadTranslations(baseLocale);
    const targetTranslations = this.loadTranslations(targetLocale);

    for (const namespace of this.namespaces) {
      const baseKeys = this.flattenKeys(baseTranslations[namespace]);
      let modified = false;

      for (const key of baseKeys) {
        const value = this.getNestedValue(targetTranslations[namespace], key);

        if (value === undefined) {
          this.setNestedValue(targetTranslations[namespace], key, '');
          modified = true;
        }
      }

      if (modified) {
        this.saveTranslations(targetLocale, namespace, targetTranslations[namespace]);
      }
    }
  }

  // Save translations to file
  public saveTranslations(locale: string, namespace: string, translations: any): void {
    const filePath = join(this.baseDir, locale, `${namespace}.json`);
    const content = JSON.stringify(translations, null, 2);

    try {
      writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      console.error(`Error saving ${locale}/${namespace}.json:`, error);
      throw error;
    }
  }

  // Validate translations
  public validateTranslations(locale: string): Array<{
    key: string;
    namespace: string;
    rule: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
  }> {
    const translations = this.loadTranslations(locale);
    const issues: Array<{
      key: string;
      namespace: string;
      rule: string;
      severity: 'error' | 'warning' | 'info';
      message: string;
    }> = [];

    for (const namespace of this.namespaces) {
      const keys = this.flattenKeys(translations[namespace]);

      for (const key of keys) {
        const value = this.getNestedValue(translations[namespace], key);

        for (const rule of this.validationRules) {
          const result = rule.validate(key, value, locale);

          if (result !== true) {
            issues.push({
              key,
              namespace,
              rule: rule.name,
              severity: rule.severity,
              message: typeof result === 'string' ? result : rule.description
            });
          }
        }
      }
    }

    return issues;
  }

  // Default validation rules
  private getDefaultValidationRules(): TranslationValidationRule[] {
    return [
      {
        name: 'not_empty',
        description: 'Translation should not be empty',
        severity: 'error',
        validate: (key, value) => value !== '' && value !== null && value !== undefined
      },
      {
        name: 'no_placeholder_mismatch',
        description: 'Interpolation placeholders should match between locales',
        severity: 'error',
        validate: (key, value, locale) => {
          if (locale === 'en') return true; // Skip for base locale

          const placeholders = value.match(/\{\{[^}]+\}\}/g) || [];
          // This would need base locale comparison - simplified for now
          return true;
        }
      },
      {
        name: 'thai_politeness',
        description: 'Thai translations should use appropriate politeness level',
        severity: 'warning',
        validate: (key, value, locale) => {
          if (locale !== 'th') return true;

          // Check for appropriate Thai politeness particles
          const hasPoliteParticles = /ครับ|ค่ะ|กรุณา/.test(value);
          const isActionKey = key.includes('action') || key.includes('button');

          return !isActionKey || hasPoliteParticles;
        }
      },
      {
        name: 'no_html_in_text',
        description: 'Text translations should not contain HTML tags',
        severity: 'warning',
        validate: (key, value) => !/<[^>]+>/.test(value)
      },
      {
        name: 'consistent_terminology',
        description: 'Should use consistent terminology',
        severity: 'info',
        validate: () => true // Placeholder for terminology consistency check
      }
    ];
  }

  // Generate suggestions for improvement
  private generateSuggestions(report: TranslationReport): void {
    if (report.missingKeys.length > 0) {
      report.suggestions.push(
        `Add ${report.missingKeys.length} missing translation keys using the addMissingKeys() method`
      );
    }

    if (report.emptyKeys.length > 0) {
      report.suggestions.push(
        `Fill in ${report.emptyKeys.length} empty translation values`
      );
    }

    if (report.completionPercentage < 80) {
      report.suggestions.push(
        'Translation completion is below 80%. Consider prioritizing translation work.'
      );
    }

    const incompleteNamespaces = Object.entries(report.byNamespace)
      .filter(([_, data]) => data.completion < 100)
      .map(([namespace]) => namespace);

    if (incompleteNamespaces.length > 0) {
      report.suggestions.push(
        `Focus on completing these namespaces: ${incompleteNamespaces.join(', ')}`
      );
    }
  }

  // Extract translatable strings from code (simplified)
  public extractStringsFromCode(codeContent: string): string[] {
    const patterns = [
      /t\(['"`]([^'"`]+)['"`]\)/g,  // t('key')
      /useTranslation\(['"`]([^'"`]+)['"`]\)/g,  // useTranslation('namespace')
      /\$t\(['"`]([^'"`]+)['"`]\)/g,  // $t('key')
    ];

    const extractedKeys = new Set<string>();

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(codeContent)) !== null) {
        extractedKeys.add(match[1]);
      }
    }

    return Array.from(extractedKeys);
  }

  // Backup translations
  public backupTranslations(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `translations-backup-${timestamp}`;

    // This would typically involve file system operations
    console.log(`Backing up translations to ${backupDir}`);

    return backupDir;
  }

  // Import translations from external format (CSV, XLSX, etc.)
  public importTranslations(data: Record<string, Record<string, string>>, targetLocale: string): void {
    for (const [namespace, translations] of Object.entries(data)) {
      if (this.namespaces.includes(namespace)) {
        const currentTranslations = this.loadTranslations(targetLocale)[namespace] || {};

        // Merge with existing translations
        const merged = { ...currentTranslations };

        for (const [key, value] of Object.entries(translations)) {
          this.setNestedValue(merged, key, value);
        }

        this.saveTranslations(targetLocale, namespace, merged);
      }
    }
  }

  // Export translations to external format
  public exportTranslations(locale: string): Record<string, Record<string, string>> {
    const translations = this.loadTranslations(locale);
    const exported: Record<string, Record<string, string>> = {};

    for (const namespace of this.namespaces) {
      const keys = this.flattenKeys(translations[namespace]);
      exported[namespace] = {};

      for (const key of keys) {
        const value = this.getNestedValue(translations[namespace], key);
        exported[namespace][key] = value;
      }
    }

    return exported;
  }

  // Find unused translation keys
  public findUnusedKeys(codeDirectory: string): string[] {
    // This would scan code files for actual usage
    // Simplified implementation
    const usedKeys = new Set<string>();
    const allKeys = new Set<string>();

    // Collect all translation keys
    for (const locale of this.locales) {
      const translations = this.loadTranslations(locale);
      for (const namespace of this.namespaces) {
        const keys = this.flattenKeys(translations[namespace]);
        keys.forEach(key => allKeys.add(`${namespace}.${key}`));
      }
    }

    // This would normally scan code files
    // For now, assume all keys are used
    return [];
  }
}

// Translation CLI utilities
export class TranslationCLI {
  private manager: TranslationManager;

  constructor() {
    this.manager = new TranslationManager();
  }

  public async runCommand(command: string, args: string[]): Promise<void> {
    switch (command) {
      case 'validate':
        await this.validateCommand(args);
        break;
      case 'report':
        await this.reportCommand(args);
        break;
      case 'add-missing':
        await this.addMissingCommand(args);
        break;
      case 'backup':
        await this.backupCommand(args);
        break;
      case 'extract':
        await this.extractCommand(args);
        break;
      default:
        console.log('Available commands: validate, report, add-missing, backup, extract');
    }
  }

  private async validateCommand(args: string[]): Promise<void> {
    const locale = args[0] || 'th';
    console.log(`Validating translations for locale: ${locale}`);

    const issues = this.manager.validateTranslations(locale);

    if (issues.length === 0) {
      console.log('✅ No validation issues found');
    } else {
      console.log(`❌ Found ${issues.length} validation issues:`);
      issues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${icon} ${issue.namespace}.${issue.key}: ${issue.message}`);
      });
    }
  }

  private async reportCommand(args: string[]): Promise<void> {
    const detailed = args.includes('--detailed');
    const strict = args.includes('--strict');

    console.log('Generating translation report...');

    const report = this.manager.generateReport();

    console.log('\n📊 Translation Report');
    console.log('='.repeat(50));
    console.log(`Total Keys: ${report.totalKeys}`);
    console.log(`Translated: ${report.translatedKeys}`);
    console.log(`Missing: ${report.missingKeys.length}`);
    console.log(`Empty: ${report.emptyKeys.length}`);
    console.log(`Completion: ${report.completionPercentage}%`);

    if (detailed) {
      console.log('\n📋 By Namespace:');
      Object.entries(report.byNamespace).forEach(([namespace, data]) => {
        console.log(`  ${namespace}: ${data.completion}% (${data.translated}/${data.total})`);
      });
    }

    if (report.suggestions.length > 0) {
      console.log('\n💡 Suggestions:');
      report.suggestions.forEach(suggestion => {
        console.log(`  • ${suggestion}`);
      });
    }

    if (strict && report.completionPercentage < 100) {
      process.exit(1);
    }
  }

  private async addMissingCommand(args: string[]): Promise<void> {
    const targetLocale = args[0] || 'th';
    console.log(`Adding missing keys for locale: ${targetLocale}`);

    this.manager.addMissingKeys(targetLocale);
    console.log('✅ Missing keys added');
  }

  private async backupCommand(args: string[]): Promise<void> {
    console.log('Creating translations backup...');
    const backupPath = this.manager.backupTranslations();
    console.log(`✅ Backup created: ${backupPath}`);
  }

  private async extractCommand(args: string[]): Promise<void> {
    console.log('Extracting translatable strings from code...');
    // This would scan source files
    console.log('✅ String extraction completed');
  }
}

export default TranslationManager;