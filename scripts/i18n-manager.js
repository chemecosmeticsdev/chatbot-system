#!/usr/bin/env node

/**
 * i18n Manager CLI Tool
 * Command-line interface for managing Thai/English translations
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Command definitions
const commands = {
  init: initI18n,
  validate: validateTranslations,
  extract: extractKeys,
  report: generateReport,
  'add-key': addTranslationKey,
  sync: syncTranslations,
  backup: backupTranslations,
  restore: restoreTranslations,
  help: showHelp
};

// Configuration
const config = {
  localesDir: path.join(process.cwd(), 'locales'),
  supportedLocales: ['en', 'th'],
  defaultLocale: 'en',
  backupDir: path.join(process.cwd(), '.i18n-backups')
};

/**
 * Main CLI entry point
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help') {
    showHelp();
    return;
  }

  if (!commands[command]) {
    console.error(`❌ Unknown command: ${command}`);
    console.log('Run "npx i18n-manager help" for available commands');
    process.exit(1);
  }

  try {
    commands[command](args.slice(1));
  } catch (error) {
    console.error(`❌ Error executing command "${command}":`, error.message);
    process.exit(1);
  }
}

/**
 * Initialize i18n setup
 */
function initI18n(args) {
  console.log('🚀 Initializing i18n setup...');

  // Check if already initialized
  if (fs.existsSync(config.localesDir)) {
    console.log('✅ i18n is already initialized');
    return;
  }

  // Create directory structure
  createDirectoryStructure();

  // Install dependencies
  installDependencies();

  console.log('✅ i18n initialization completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Configure your Next.js app for i18n routing');
  console.log('2. Add translation keys using: npx i18n-manager add-key');
  console.log('3. Validate translations: npx i18n-manager validate');
}

/**
 * Create locales directory structure
 */
function createDirectoryStructure() {
  console.log('📁 Creating directory structure...');

  // Create main directories
  const directories = [
    config.localesDir,
    path.join(config.localesDir, 'en'),
    path.join(config.localesDir, 'th'),
    path.join(config.localesDir, 'config'),
    config.backupDir
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  ✓ Created ${dir}`);
    }
  });

  // Create initial translation files if they don't exist
  const namespaces = ['common', 'navigation', 'auth', 'dashboard'];

  namespaces.forEach(namespace => {
    config.supportedLocales.forEach(locale => {
      const filePath = path.join(config.localesDir, locale, `${namespace}.json`);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '{}', 'utf8');
        console.log(`  ✓ Created ${filePath}`);
      }
    });
  });
}

/**
 * Install required dependencies
 */
function installDependencies() {
  console.log('📦 Checking dependencies...');

  const packageJsonPath = path.join(process.cwd(), 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    console.log('  ⚠️  No package.json found, skipping dependency installation');
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = packageJson.dependencies || {};

  const requiredDeps = ['next-intl', 'react-intl'];
  const missingDeps = requiredDeps.filter(dep => !dependencies[dep]);

  if (missingDeps.length > 0) {
    console.log(`  📦 Installing missing dependencies: ${missingDeps.join(', ')}`);
    console.log('  Run: npm install next-intl react-intl');
  } else {
    console.log('  ✅ All required dependencies are present');
  }
}

/**
 * Validate all translations
 */
function validateTranslations(args) {
  const options = parseValidationOptions(args);

  console.log('🔍 Validating translations...');

  const results = {};
  let hasErrors = false;

  const locales = options.locale === 'all' ? config.supportedLocales : [options.locale];

  locales.forEach(locale => {
    console.log(`\n📋 Validating locale: ${locale}`);

    const namespaces = getNamespaces(locale);
    results[locale] = {};

    namespaces.forEach(namespace => {
      const validation = validateNamespace(locale, namespace);
      results[locale][namespace] = validation;

      if (!validation.isValid) {
        hasErrors = true;
        console.log(`  ❌ ${namespace}: ${validation.errors.length} errors`);
        if (options.detailed) {
          validation.errors.forEach(error => console.log(`    • ${error}`));
        }
      } else {
        console.log(`  ✅ ${namespace}: Valid (${validation.coverage.toFixed(1)}% coverage)`);
      }

      if (validation.warnings.length > 0 && options.detailed) {
        console.log(`  ⚠️  ${namespace}: ${validation.warnings.length} warnings`);
        validation.warnings.forEach(warning => console.log(`    • ${warning}`));
      }
    });
  });

  // Generate report if requested
  if (options.report) {
    generateValidationReport(results, options.report);
  }

  if (hasErrors && options.strict) {
    console.log('\n❌ Validation failed with errors');
    process.exit(1);
  } else {
    console.log('\n✅ Validation completed');
  }
}

/**
 * Parse validation command options
 */
function parseValidationOptions(args) {
  const options = {
    locale: 'all',
    detailed: false,
    strict: false,
    report: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--locale':
        options.locale = args[++i];
        break;
      case '--detailed':
        options.detailed = true;
        break;
      case '--strict':
        options.strict = true;
        break;
      case '--report':
        options.report = args[++i];
        break;
    }
  }

  return options;
}

/**
 * Get available namespaces for a locale
 */
function getNamespaces(locale) {
  const localeDir = path.join(config.localesDir, locale);

  if (!fs.existsSync(localeDir)) {
    return [];
  }

  return fs.readdirSync(localeDir)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''));
}

/**
 * Validate a specific namespace
 */
function validateNamespace(locale, namespace) {
  const filePath = path.join(config.localesDir, locale, `${namespace}.json`);

  if (!fs.existsSync(filePath)) {
    return {
      isValid: false,
      errors: [`Translation file not found: ${filePath}`],
      warnings: [],
      coverage: 0,
      missingKeys: []
    };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const translations = JSON.parse(content);

    const errors = [];
    const warnings = [];

    // Check for empty values
    const emptyKeys = findEmptyKeys(translations);
    if (emptyKeys.length > 0) {
      errors.push(`Empty values found: ${emptyKeys.join(', ')}`);
    }

    // Check against reference locale (English)
    let coverage = 100;
    let missingKeys = [];

    if (locale !== 'en') {
      const englishFilePath = path.join(config.localesDir, 'en', `${namespace}.json`);
      if (fs.existsSync(englishFilePath)) {
        const englishContent = JSON.parse(fs.readFileSync(englishFilePath, 'utf8'));
        const englishKeys = extractKeysFromObject(englishContent);
        const localeKeys = extractKeysFromObject(translations);

        missingKeys = englishKeys.filter(key => !localeKeys.includes(key));
        coverage = ((localeKeys.length - missingKeys.length) / englishKeys.length) * 100;

        if (missingKeys.length > 0) {
          warnings.push(`Missing keys: ${missingKeys.join(', ')}`);
        }
      }
    }

    // Thai-specific validations
    if (locale === 'th') {
      const thaiWarnings = validateThaiContent(translations);
      warnings.push(...thaiWarnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      coverage: Math.max(0, coverage),
      missingKeys
    };

  } catch (error) {
    return {
      isValid: false,
      errors: [`Failed to parse JSON: ${error.message}`],
      warnings: [],
      coverage: 0,
      missingKeys: []
    };
  }
}

/**
 * Find empty translation values
 */
function findEmptyKeys(obj, prefix = '') {
  const emptyKeys = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      if (!value.trim()) {
        emptyKeys.push(fullKey);
      }
    } else if (typeof value === 'object' && value !== null) {
      emptyKeys.push(...findEmptyKeys(value, fullKey));
    }
  }

  return emptyKeys;
}

/**
 * Extract all keys from translation object
 */
function extractKeysFromObject(obj, prefix = '') {
  const keys = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      keys.push(fullKey);
    } else if (typeof value === 'object' && value !== null) {
      keys.push(...extractKeysFromObject(value, fullKey));
    }
  }

  return keys;
}

/**
 * Validate Thai content for cultural appropriateness
 */
function validateThaiContent(translations) {
  const warnings = [];
  const keys = extractKeysFromObject(translations);

  keys.forEach(key => {
    const value = getNestedValue(translations, key);

    if (typeof value === 'string') {
      // Check for Thai characters
      if (!/[\u0E00-\u0E7F]/.test(value) && value.length > 10) {
        warnings.push(`Key "${key}" may need Thai translation`);
      }

      // Check for double spaces
      if (value.includes('  ')) {
        warnings.push(`Key "${key}" has double spaces`);
      }

      // Check for English text in Thai translation
      if (/[a-zA-Z]{5,}/.test(value)) {
        warnings.push(`Key "${key}" contains English text that may need translation`);
      }
    }
  });

  return warnings;
}

/**
 * Get nested value from object
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Extract keys from source code
 */
function extractKeys(args) {
  console.log('🔍 Extracting translation keys from source code...');

  const options = parseExtractOptions(args);
  const sourceDir = options.source || 'app';

  // Find all TypeScript/JavaScript files
  const files = findSourceFiles(sourceDir);
  const extractedKeys = new Set();

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');

    // Extract t('key') patterns
    const tPatterns = content.match(/t\(['"`]([^'"`]+)['"`]\)/g);
    if (tPatterns) {
      tPatterns.forEach(pattern => {
        const key = pattern.match(/t\(['"`]([^'"`]+)['"`]\)/)[1];
        extractedKeys.add(key);
      });
    }

    // Extract useTranslations('namespace') patterns
    const namespacePatterns = content.match(/useTranslations\(['"`]([^'"`]+)['"`]\)/g);
    if (namespacePatterns) {
      // This would require more sophisticated parsing to extract actual keys
    }
  });

  console.log(`📝 Found ${extractedKeys.size} translation keys`);

  // Save to output file
  const outputFile = options.output || 'extracted-keys.json';
  const extractedData = {
    timestamp: new Date().toISOString(),
    totalKeys: extractedKeys.size,
    keys: Array.from(extractedKeys).sort()
  };

  fs.writeFileSync(outputFile, JSON.stringify(extractedData, null, 2));
  console.log(`💾 Saved extracted keys to ${outputFile}`);
}

/**
 * Parse extract command options
 */
function parseExtractOptions(args) {
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--source':
        options.source = args[++i];
        break;
      case '--output':
        options.output = args[++i];
        break;
    }
  }

  return options;
}

/**
 * Find source files for key extraction
 */
function findSourceFiles(dir) {
  const files = [];

  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);

    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scan(fullPath);
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
        files.push(fullPath);
      }
    });
  }

  scan(dir);
  return files;
}

/**
 * Generate translation coverage report
 */
function generateReport(args) {
  console.log('📊 Generating translation report...');

  const options = parseReportOptions(args);
  const report = {
    timestamp: new Date().toISOString(),
    locales: {},
    summary: {
      totalNamespaces: 0,
      totalKeys: 0,
      averageCoverage: 0
    }
  };

  config.supportedLocales.forEach(locale => {
    const namespaces = getNamespaces(locale);
    report.locales[locale] = {
      namespaces: {},
      totalKeys: 0,
      coverage: 0
    };

    let localeKeyCount = 0;
    let localeCoverage = 0;

    namespaces.forEach(namespace => {
      const validation = validateNamespace(locale, namespace);
      report.locales[locale].namespaces[namespace] = {
        keys: extractKeysFromObject(loadTranslation(locale, namespace)).length,
        coverage: validation.coverage,
        errors: validation.errors.length,
        warnings: validation.warnings.length,
        missingKeys: validation.missingKeys
      };

      localeKeyCount += report.locales[locale].namespaces[namespace].keys;
      localeCoverage += validation.coverage;
    });

    report.locales[locale].totalKeys = localeKeyCount;
    report.locales[locale].coverage = namespaces.length > 0 ? localeCoverage / namespaces.length : 0;
  });

  // Generate summary
  const totalNamespaces = Object.values(report.locales).reduce((sum, locale) =>
    sum + Object.keys(locale.namespaces).length, 0);
  const averageCoverage = Object.values(report.locales).reduce((sum, locale) =>
    sum + locale.coverage, 0) / config.supportedLocales.length;

  report.summary = {
    totalNamespaces,
    totalKeys: Math.max(...Object.values(report.locales).map(l => l.totalKeys)),
    averageCoverage
  };

  // Save report
  const outputFile = options.output || `i18n-report-${Date.now()}.json`;
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));

  // Display summary
  console.log('\n📈 Translation Report Summary:');
  console.log(`   Total Namespaces: ${report.summary.totalNamespaces}`);
  console.log(`   Total Keys: ${report.summary.totalKeys}`);
  console.log(`   Average Coverage: ${report.summary.averageCoverage.toFixed(1)}%\n`);

  config.supportedLocales.forEach(locale => {
    const localeData = report.locales[locale];
    console.log(`🌐 ${locale.toUpperCase()}: ${localeData.totalKeys} keys, ${localeData.coverage.toFixed(1)}% coverage`);
  });

  console.log(`\n💾 Full report saved to: ${outputFile}`);
}

/**
 * Parse report command options
 */
function parseReportOptions(args) {
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--output':
        options.output = args[++i];
        break;
      case '--format':
        options.format = args[++i];
        break;
    }
  }

  return options;
}

/**
 * Load translation file
 */
function loadTranslation(locale, namespace) {
  const filePath = path.join(config.localesDir, locale, `${namespace}.json`);
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

/**
 * Add new translation key
 */
function addTranslationKey(args) {
  if (args.length < 3) {
    console.error('❌ Usage: add-key --key="namespace.key" --en="English text" --th="Thai text"');
    return;
  }

  const options = parseAddKeyOptions(args);

  if (!options.key) {
    console.error('❌ Missing --key parameter');
    return;
  }

  console.log(`➕ Adding translation key: ${options.key}`);

  // Determine namespace and key path
  const keyParts = options.key.split('.');
  const namespace = keyParts[0];
  const keyPath = keyParts.slice(1).join('.');

  // Add to each locale
  config.supportedLocales.forEach(locale => {
    const value = options[locale];

    if (!value) {
      console.log(`  ⚠️  No value provided for locale: ${locale}`);
      return;
    }

    try {
      const filePath = path.join(config.localesDir, locale, `${namespace}.json`);
      let translations = {};

      if (fs.existsSync(filePath)) {
        translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }

      // Set nested value
      setNestedValue(translations, keyPath, value);

      // Save file
      fs.writeFileSync(filePath, JSON.stringify(translations, null, 2), 'utf8');
      console.log(`  ✅ Added to ${locale}: ${value}`);

    } catch (error) {
      console.error(`  ❌ Failed to add to ${locale}:`, error.message);
    }
  });
}

/**
 * Parse add-key command options
 */
function parseAddKeyOptions(args) {
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const value = args[++i];
      options[key] = value;
    }
  }

  return options;
}

/**
 * Set nested value in object
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();

  const target = keys.reduce((current, key) => {
    if (!(key in current)) {
      current[key] = {};
    }
    return current[key];
  }, obj);

  target[lastKey] = value;
}

/**
 * Sync translations with external service
 */
function syncTranslations(args) {
  console.log('🔄 Syncing translations...');
  console.log('⚠️  Sync functionality not implemented yet');
  console.log('    This would integrate with translation services like:');
  console.log('    - Google Translate API');
  console.log('    - DeepL API');
  console.log('    - Professional translation services');
}

/**
 * Backup translations
 */
function backupTranslations(args) {
  console.log('💾 Creating translation backup...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `backup-${timestamp}`;
  const backupPath = path.join(config.backupDir, backupName);

  // Create backup directory
  fs.mkdirSync(backupPath, { recursive: true });

  // Copy all translation files
  const totalFiles = copyDirectory(config.localesDir, backupPath);

  // Create metadata
  const metadata = {
    timestamp: new Date().toISOString(),
    totalFiles,
    locales: config.supportedLocales,
    backupId: backupName
  };

  fs.writeFileSync(
    path.join(backupPath, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  console.log(`✅ Backup created: ${backupName}`);
  console.log(`📁 Location: ${backupPath}`);
  console.log(`📄 Files backed up: ${totalFiles}`);
}

/**
 * Copy directory recursively
 */
function copyDirectory(source, destination) {
  let fileCount = 0;

  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const items = fs.readdirSync(source);

  items.forEach(item => {
    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);
    const stat = fs.statSync(sourcePath);

    if (stat.isDirectory()) {
      fileCount += copyDirectory(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
      fileCount++;
    }
  });

  return fileCount;
}

/**
 * Restore translations from backup
 */
function restoreTranslations(args) {
  if (args.length === 0) {
    console.log('📋 Available backups:');
    listBackups();
    return;
  }

  const backupId = args[0];
  const backupPath = path.join(config.backupDir, backupId);

  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup not found: ${backupId}`);
    console.log('\n📋 Available backups:');
    listBackups();
    return;
  }

  console.log(`🔄 Restoring from backup: ${backupId}`);

  // Load metadata
  const metadataPath = path.join(backupPath, 'metadata.json');
  if (fs.existsSync(metadataPath)) {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    console.log(`   Created: ${metadata.timestamp}`);
    console.log(`   Files: ${metadata.totalFiles}`);
  }

  // Restore files
  const restoredFiles = copyDirectory(backupPath, config.localesDir);

  console.log(`✅ Restored ${restoredFiles} files from backup`);
}

/**
 * List available backups
 */
function listBackups() {
  if (!fs.existsSync(config.backupDir)) {
    console.log('   No backups found');
    return;
  }

  const backups = fs.readdirSync(config.backupDir)
    .filter(item => fs.statSync(path.join(config.backupDir, item)).isDirectory())
    .sort()
    .reverse();

  if (backups.length === 0) {
    console.log('   No backups found');
    return;
  }

  backups.forEach(backup => {
    const metadataPath = path.join(config.backupDir, backup, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      console.log(`   ${backup} (${metadata.timestamp})`);
    } else {
      console.log(`   ${backup}`);
    }
  });
}

/**
 * Generate validation report
 */
function generateValidationReport(results, format) {
  const timestamp = new Date().toISOString();
  const reportPath = `validation-report-${timestamp.split('T')[0]}.${format}`;

  if (format === 'json') {
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  } else if (format === 'md') {
    const markdown = generateMarkdownReport(results);
    fs.writeFileSync(reportPath, markdown);
  }

  console.log(`📄 Validation report saved to: ${reportPath}`);
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(results) {
  let markdown = '# Translation Validation Report\n\n';
  markdown += `**Generated:** ${new Date().toISOString()}\n\n`;

  Object.entries(results).forEach(([locale, namespaces]) => {
    markdown += `## Locale: ${locale.toUpperCase()}\n\n`;

    Object.entries(namespaces).forEach(([namespace, validation]) => {
      const status = validation.isValid ? '✅' : '❌';
      markdown += `### ${status} ${namespace}\n\n`;
      markdown += `- **Coverage:** ${validation.coverage.toFixed(1)}%\n`;
      markdown += `- **Errors:** ${validation.errors.length}\n`;
      markdown += `- **Warnings:** ${validation.warnings.length}\n`;

      if (validation.errors.length > 0) {
        markdown += '\n**Errors:**\n';
        validation.errors.forEach(error => {
          markdown += `- ${error}\n`;
        });
      }

      if (validation.warnings.length > 0) {
        markdown += '\n**Warnings:**\n';
        validation.warnings.forEach(warning => {
          markdown += `- ${warning}\n`;
        });
      }

      markdown += '\n';
    });
  });

  return markdown;
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
🌐 i18n Manager CLI Tool

USAGE:
  npx i18n-manager <command> [options]

COMMANDS:
  init                     Initialize i18n setup
  validate                 Validate all translations
    --locale <locale>      Validate specific locale (default: all)
    --detailed             Show detailed error/warning messages
    --strict               Exit with error if validation fails
    --report <format>      Generate report (json|md)

  extract                  Extract translation keys from source code
    --source <dir>         Source directory to scan (default: app)
    --output <file>        Output file for extracted keys

  add-key                  Add new translation key
    --key <key>            Translation key (namespace.key.subkey)
    --en <text>            English translation
    --th <text>            Thai translation

  report                   Generate translation coverage report
    --output <file>        Output file for report
    --format <format>      Report format (json|md)

  sync                     Sync with translation services
  backup                   Create backup of all translations
  restore <backup-id>      Restore from backup
  help                     Show this help message

EXAMPLES:
  npx i18n-manager init
  npx i18n-manager validate --detailed --strict
  npx i18n-manager add-key --key="dashboard.welcome.title" --en="Welcome" --th="ยินดีต้อนรับ"
  npx i18n-manager extract --source=app --output=keys.json
  npx i18n-manager report --format=md --output=report.md
  npx i18n-manager backup
  npx i18n-manager restore backup-2024-01-15

For more information, visit: https://github.com/your-repo/chatbot
  `);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  commands,
  config,
  validateNamespace,
  extractKeysFromObject,
  findEmptyKeys
};