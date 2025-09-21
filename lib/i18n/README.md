# Thai/English Internationalization (i18n) System

A comprehensive internationalization system for the chatbot management platform supporting Thai and English markets with cultural adaptations and professional translation management.

## 🌟 Features

- **Thai/English Support**: Complete localization for both languages
- **Cultural Adaptations**: Thai Buddhist calendar, number formatting, politeness levels
- **Professional UI Components**: Language switcher, indicators, and toggles
- **Translation Management**: CLI tools for validation, extraction, and reporting
- **Performance Optimization**: Caching, lazy loading, and bundle splitting
- **Developer Experience**: TypeScript support, validation, and error handling

## 📁 Project Structure

```
lib/i18n/
├── config.ts                 # Main i18n configuration
├── types.ts                  # TypeScript definitions
├── thai-cultural.ts          # Thai cultural adaptations
├── hooks.ts                  # React hooks for translations
├── performance.ts            # Performance optimization
├── translation-manager.ts    # Translation management utilities
├── locales/
│   ├── en/                   # English translations
│   │   ├── common.json
│   │   ├── dashboard.json
│   │   ├── chatbot.json
│   │   ├── navigation.json
│   │   ├── auth.json
│   │   ├── form.json
│   │   ├── error.json
│   │   ├── success.json
│   │   ├── product.json
│   │   ├── document.json
│   │   ├── admin.json
│   │   ├── analytics.json
│   │   └── settings.json
│   └── th/                   # Thai translations
│       ├── common.json
│       ├── dashboard.json
│       ├── chatbot.json
│       ├── navigation.json
│       ├── auth.json
│       ├── form.json
│       ├── error.json
│       ├── success.json
│       ├── product.json
│       ├── document.json
│       ├── admin.json
│       ├── analytics.json
│       └── settings.json
└── README.md                 # This documentation

components/ui/
└── language-switcher.tsx     # Language switching components

scripts/
└── i18n-manager.js          # CLI management tool
```

## 🚀 Quick Start

### 1. Basic Setup

Import and initialize the i18n system in your app:

```typescript
// app/layout.tsx
import { i18nConfig } from '@/lib/i18n/config';

// Initialize i18n (already configured in the project)
```

### 2. Using Translations in Components

```typescript
import { useI18n } from '@/lib/i18n/hooks';

export function MyComponent() {
  const { t, formatDate, formatCurrency, isThaiLanguage } = useI18n('dashboard');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
      <span>{formatDate(new Date())}</span>
      <span>{formatCurrency(1500)}</span>
      {isThaiLanguage && <span>🇹🇭</span>}
    </div>
  );
}
```

### 3. Language Switching

```typescript
import { LanguageSwitcher } from '@/components/ui/language-switcher';

export function Header() {
  return (
    <header>
      <LanguageSwitcher variant="dropdown" showFlag showName />
    </header>
  );
}
```

## 🎯 Core Hooks

### `useI18n(namespace?)`

Main translation hook with cultural formatting:

```typescript
const {
  t,                    // Translation function
  currentLocale,        // Current language code
  isThaiLanguage,       // Boolean for Thai language
  isEnglishLanguage,    // Boolean for English language
  formatDate,           // Date formatting with cultural support
  formatNumber,         // Number formatting
  formatCurrency,       // Currency formatting
  formatFileSize,       // File size formatting
  formatRelativeTime,   // Relative time formatting
  addPoliteness,        // Add Thai politeness particles
  changeLanguage        // Language switching function
} = useI18n('namespace');
```

### Specialized Hooks

```typescript
// Form translations
const {
  required,
  email,
  password,
  getPlaceholder,
  getHelp
} = useFormTranslations();

// Status and actions
const {
  loading,
  saving,
  success,
  actions: { save, cancel, delete }
} = useStatusTranslations();

// Navigation
const {
  main: { dashboard, chatbots },
  breadcrumb: { home, dashboard }
} = useNavigationTranslations();

// Error handling
const {
  formatError,
  network,
  server,
  unauthorized
} = useErrorTranslations();

// Success messages
const {
  saved,
  created,
  updated,
  deleted
} = useSuccessTranslations();
```

## 🇹🇭 Thai Cultural Features

### Date Formatting

```typescript
import { ThaiDateFormatter } from '@/lib/i18n/thai-cultural';

// Buddhist calendar
const buddhistDate = ThaiDateFormatter.formatDate(new Date(), 'buddhist');
// "วันอังคาร ที่ 15 กันยายน 2567"

// Standard Thai format
const thaiDate = ThaiDateFormatter.formatDate(new Date(), 'long');
// "วันอังคาร ที่ 15 กันยายน 2024"
```

### Number and Currency Formatting

```typescript
import { ThaiNumberFormatter } from '@/lib/i18n/thai-cultural';

// Thai number formatting
const number = ThaiNumberFormatter.formatNumber(1234.56);
// "1,234.56"

// Thai currency
const price = ThaiNumberFormatter.formatCurrency(1500);
// "฿1,500.00"

// File sizes
const size = ThaiNumberFormatter.formatFileSize(1024000);
// "1.0 เมกะไบต์"
```

### Text Utilities

```typescript
import { ThaiTextUtils } from '@/lib/i18n/thai-cultural';

// Add politeness particles
const polite = ThaiTextUtils.addPoliteness('ขอบคุณ', 'female');
// "ขอบคุณค่ะ"

// Format Thai names
const name = ThaiTextUtils.formatThaiName('สมชาย', 'ใจดี', 'mr');
// "นายสมชาย ใจดี"

// Check if text is Thai
const isThai = ThaiTextUtils.isThaiText('สวัสดี');
// true
```

## 🎨 UI Components

### Language Switcher

Multiple variants for different use cases:

```typescript
// Dropdown (default)
<LanguageSwitcher variant="dropdown" showFlag showName />

// Compact
<LanguageSwitcher variant="compact" size="sm" />

// Icon only
<LanguageSwitcher variant="icon-only" />

// Inline buttons
<LanguageSwitcher variant="inline" />

// Floating button
<LanguageSwitcher variant="floating" />
```

### Language Toggle

Quick toggle between languages:

```typescript
<LanguageToggle size="md" showTooltip />
```

### Language Indicator

Read-only language display:

```typescript
<LanguageIndicator variant="badge" showFlag showLabel />
```

## ⚡ Performance Features

### Caching

Automatic translation caching with configurable options:

```typescript
import { translationCache } from '@/lib/i18n/performance';

// Cache is automatically managed
// Manual cache operations:
translationCache.clear();
translationCache.clearLocale('th');
const stats = translationCache.getStats();
```

### Lazy Loading

Route-based translation loading:

```typescript
import { usePrefetchTranslations } from '@/lib/i18n/performance';

// Prefetch translations for route
usePrefetchTranslations('/dashboard', 'th', ['common', 'dashboard']);
```

### Performance Monitoring

```typescript
import { useI18nPerformance } from '@/lib/i18n/performance';

const { metrics, measureLoadTime, clearCache } = useI18nPerformance();

// metrics: { loadTime, cacheHitRate, memoryUsage, totalTranslations }
```

## 🛠️ CLI Management Tools

### Available Commands

```bash
# Initialize i18n structure
npm run i18n:init

# Validate translations
npm run i18n:validate [locale] [--strict] [--detailed]

# Generate report
npm run i18n:report [--detailed]

# Extract keys from code
npm run i18n:extract

# Backup translations
npm run i18n:backup

# Check translation coverage
npm run i18n:check
```

### Examples

```bash
# Validate Thai translations with detailed output
npm run i18n:validate th --detailed

# Generate detailed report
npm run i18n:report --detailed

# Validate all translations strictly (CI/CD)
npm run i18n:validate --strict

# Create backup before major changes
npm run i18n:backup
```

## 📝 Translation File Structure

### Hierarchical Organization

```json
{
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "status": {
    "loading": "Loading...",
    "success": "Success"
  },
  "time": {
    "now": "Now",
    "today": "Today"
  }
}
```

### Thai Translations

```json
{
  "actions": {
    "save": "บันทึก",
    "cancel": "ยกเลิก",
    "delete": "ลบ"
  },
  "status": {
    "loading": "กำลังโหลด...",
    "success": "สำเร็จ"
  },
  "time": {
    "now": "ตอนนี้",
    "today": "วันนี้"
  }
}
```

### Interpolation

```json
{
  "welcome": "Welcome, {{name}}!",
  "fileSize": "File size: {{size}} {{unit}}",
  "timeAgo": "{{count}} {{unit}} ago"
}
```

## 🎨 Cultural Guidelines

### Thai Language Best Practices

1. **Politeness Levels**
   - Use กรุณา (please) for requests
   - Add ครับ/ค่ะ for politeness
   - Formal tone for professional contexts

2. **Number Formatting**
   - Use Thai numerals when appropriate
   - Buddhist calendar for Thai contexts
   - Proper currency symbol placement (฿)

3. **Date and Time**
   - Support both Buddhist and Gregorian calendars
   - Thai day/month names
   - Appropriate time format (24-hour)

4. **Cultural Sensitivity**
   - Respect for royalty and religion
   - Appropriate color choices
   - Cultural calendar awareness

## ✅ Validation Rules

### Automatic Checks

1. **Completeness**: All keys have translations
2. **Consistency**: Interpolation placeholders match
3. **Thai Formatting**: Appropriate politeness levels
4. **No HTML**: Text translations don't contain HTML
5. **Empty Values**: No empty translation strings

### Custom Validation

```typescript
import { TranslationManager } from '@/lib/i18n/translation-manager';

const manager = new TranslationManager();
const issues = manager.validateTranslations('th');

// issues: Array of validation problems with severity levels
```

## 🚀 Adding New Translations

### 1. Add to Translation Files

Add the key to all relevant locale files:

```json
// locales/en/dashboard.json
{
  "newFeature": {
    "title": "New Feature",
    "description": "This is a new feature"
  }
}

// locales/th/dashboard.json
{
  "newFeature": {
    "title": "ฟีเจอร์ใหม่",
    "description": "นี่คือฟีเจอร์ใหม่"
  }
}
```

### 2. Use in Components

```typescript
const { t } = useI18n('dashboard');

return (
  <div>
    <h2>{t('newFeature.title')}</h2>
    <p>{t('newFeature.description')}</p>
  </div>
);
```

### 3. Validate

```bash
npm run i18n:validate
```

## 🔧 Advanced Configuration

### Custom Cache Configuration

```typescript
import { TranslationCacheManager } from '@/lib/i18n/performance';

const customCache = new TranslationCacheManager({
  maxAge: 12 * 60 * 60 * 1000, // 12 hours
  maxSize: 100, // 100 entries
  compressionEnabled: true,
  persistToStorage: true
});
```

### Custom Validation Rules

```typescript
import { TranslationManager } from '@/lib/i18n/translation-manager';

const manager = new TranslationManager();

// Add custom validation rule
manager.addValidationRule({
  name: 'custom_rule',
  description: 'Custom validation',
  severity: 'warning',
  validate: (key, value, locale) => {
    // Custom validation logic
    return true;
  }
});
```

## 🐛 Debugging

### Common Issues

1. **Missing Translations**
   ```bash
   npm run i18n:validate th --detailed
   ```

2. **Performance Issues**
   ```typescript
   const { metrics } = useI18nPerformance();
   console.log('i18n Performance:', metrics);
   ```

3. **Cache Problems**
   ```typescript
   import { translationCache } from '@/lib/i18n/performance';
   translationCache.clear(); // Clear all cache
   ```

### Debug Mode

Enable detailed logging in development:

```typescript
// Set debug mode in i18n config
i18n.init({
  debug: process.env.NODE_ENV === 'development'
});
```

## 📊 Monitoring and Analytics

### Translation Coverage

```bash
npm run i18n:report --detailed
```

### Performance Metrics

```typescript
const { metrics, updateCacheStats } = useI18nPerformance();

// Monitor cache hit rate, memory usage, load times
```

### Usage Analytics

Track which translations are used most frequently for optimization.

## 🤝 Contributing

### Adding New Languages

1. Add locale to config
2. Create translation files
3. Add cultural adaptations if needed
4. Update validation rules
5. Test thoroughly

### Translation Workflow

1. Extract new keys: `npm run i18n:extract`
2. Add English translations
3. Add Thai translations with cultural adaptations
4. Validate: `npm run i18n:validate --strict`
5. Test in UI components

## 📚 Resources

- [Thai Typography Guidelines](https://www.typography.com/fonts/sarabun/overview)
- [Buddhist Calendar Reference](https://en.wikipedia.org/wiki/Thai_solar_calendar)
- [Thai Language Standards](https://www.royin.go.th/)
- [React i18next Documentation](https://react.i18next.com/)

## 🎯 Best Practices

1. **Always use the translation hooks** instead of direct i18n calls
2. **Validate translations** before deploying
3. **Use semantic keys** (dashboard.welcome.title vs welcome_title)
4. **Consider cultural context** for Thai translations
5. **Monitor performance** and cache effectiveness
6. **Keep translations up to date** with UI changes
7. **Use lazy loading** for large translation sets
8. **Test with both languages** during development

---

This i18n system provides comprehensive Thai/English localization with cultural sensitivity, professional translation management, and optimized performance for the chatbot management platform.