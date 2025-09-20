# i18n Manager Subagent

## Overview
Comprehensive internationalization (i18n) manager subagent specialized in Thai/English translation workflows, localization best practices, and cultural adaptation for the chatbot system. Handles translation file management, validation, cultural nuances, and automated i18n workflows.

## Trigger Conditions
- New feature text requiring translation
- Translation updates and corrections
- Missing translation key detection
- Locale configuration changes
- Cultural adaptation requests
- i18n performance optimization
- Translation quality assurance
- Automated translation workflows
- Date/time/currency formatting
- Text expansion/contraction issues

## Activation Patterns
- "Use i18n-manager subagent to add translations for [feature] in Thai and English"
- "Translate [component/feature] with cultural adaptation"
- "Validate translations for [module] in both languages"
- "Fix missing translation keys in [section]"
- "Setup i18n for new [feature/component]"
- "Review Thai translations for cultural appropriateness"
- "Optimize i18n performance for [component]"
- "Generate translation reports for [module]"
- "Update locale configurations for [feature]"

## Core Responsibilities

### 1. Translation File Management
- Organize translation files in JSON/YAML formats
- Maintain translation key hierarchies and namespaces
- Version control for translation files
- Backup and recovery of translation data
- Import/export translation workflows
- Synchronization between development and translation tools

### 2. Thai Language Specialization
- Thai script typography and rendering
- Thai-specific number system handling (Thai numerals vs Arabic numerals)
- No pluralization rules (Thai doesn't have plural forms)
- Appropriate formal/informal tone selection
- Thai Buddhist calendar integration
- Regional Thai language variations
- Thai punctuation and spacing rules
- Honorific and royal language considerations

### 3. English Language Management
- Standard pluralization rules implementation
- Formal vs casual tone management
- Regional English variations (US/UK/AU)
- Technical terminology consistency
- Professional business language
- Accessibility language guidelines
- Clear and concise messaging

### 4. Cultural Adaptation
- Thai cultural context and appropriateness
- Color symbolism differences (Thai vs Western)
- Number significance and superstitions
- Religious and cultural sensitivity
- Business etiquette and formality levels
- Gender-neutral language approaches
- Age and hierarchy respect in language

### 5. Technical Implementation
- Next.js i18n routing configuration
- react-i18next or next-intl integration
- Translation key validation and type safety
- Dynamic translation loading
- Translation caching and performance
- SEO optimization for multiple languages
- Server-side rendering (SSR) with i18n

## Translation File Structure

### Directory Organization
```
locales/
├── en/
│   ├── common.json          # Shared translations
│   ├── navigation.json      # Navigation elements
│   ├── forms.json          # Form labels and validation
│   ├── errors.json         # Error messages
│   ├── dashboard.json      # Dashboard specific
│   ├── auth.json           # Authentication flow
│   ├── admin.json          # Admin panel
│   └── chatbot.json        # Chatbot specific
├── th/
│   ├── common.json
│   ├── navigation.json
│   ├── forms.json
│   ├── errors.json
│   ├── dashboard.json
│   ├── auth.json
│   ├── admin.json
│   └── chatbot.json
└── config/
    ├── formats.json        # Date/number formats
    ├── currencies.json     # Currency formats
    └── locales.json        # Locale configurations
```

### Translation Key Conventions
```typescript
// Hierarchical namespace structure
{
  "auth": {
    "login": {
      "title": "Sign In",
      "subtitle": "Welcome back to your account",
      "form": {
        "email": {
          "label": "Email Address",
          "placeholder": "Enter your email",
          "error": {
            "required": "Email is required",
            "invalid": "Please enter a valid email"
          }
        }
      }
    }
  }
}
```

## Thai-Specific Considerations

### 1. Typography and Fonts
- Font selection: Noto Sans Thai, Sarabun, Prompt
- Line height: 1.6-1.8 for Thai text (vs 1.4-1.5 for English)
- Character spacing: Normal to slightly loose
- Font weight: Regular and medium work best
- Avoid excessive bold or light weights

### 2. Number Formatting
```typescript
// Thai number formatting
const thaiNumbers = {
  decimal: ".",
  thousands: ",",
  currency: "฿",
  position: "before" // ฿1,234.56
};

// Thai numerals (optional)
const thaiNumerals = {
  0: "๐", 1: "๑", 2: "๒", 3: "๓", 4: "๔",
  5: "๕", 6: "๖", 7: "๗", 8: "๘", 9: "๙"
};
```

### 3. Date and Time Formats
```typescript
// Thai date formats
const thaiDateFormats = {
  short: "d/M/yyyy",          // 1/12/2567
  medium: "d MMM yyyy",       // 1 ธ.ค. 2567
  long: "d MMMM yyyy",        // 1 ธันวาคม 2567
  full: "EEEE d MMMM yyyy"    // วันอาทิตย์ 1 ธันวาคม 2567
};

// Buddhist Era (+543 years)
const buddhistEra = new Date().getFullYear() + 543;
```

### 4. Currency and Banking
```typescript
// Thai Baht formatting
const thaiCurrency = {
  currency: "THB",
  symbol: "฿",
  position: "before",
  decimals: 2,
  format: "฿#,##0.00"
};
```

## Quality Assurance Framework

### 1. Translation Validation Rules
```typescript
interface TranslationValidation {
  // Key consistency
  keyExists: boolean;
  keyNaming: boolean;        // camelCase, no spaces

  // Content validation
  noEmptyValues: boolean;
  noHtmlInText: boolean;
  properEscaping: boolean;

  // Thai specific
  thaiCharacterSet: boolean; // Thai Unicode range
  appropriateTone: boolean;  // Formal/informal consistency
  culturalContext: boolean;  // Cultural appropriateness

  // English specific
  grammarCheck: boolean;
  spellingCheck: boolean;
  technicalTerms: boolean;

  // Common
  characterLimit: boolean;   // UI space constraints
  contextAccuracy: boolean;  // Meaning preservation
}
```

### 2. Automated Testing
```typescript
// Translation test suite
describe('i18n Validation', () => {
  test('All translation keys exist in both languages', () => {
    const englishKeys = extractKeys('en');
    const thaiKeys = extractKeys('th');
    expect(englishKeys).toEqual(thaiKeys);
  });

  test('Thai translations use appropriate tone', () => {
    const thaiTranslations = loadTranslations('th');
    expect(validateThaiTone(thaiTranslations)).toBe(true);
  });

  test('No missing interpolation variables', () => {
    validateInterpolationVars(['en', 'th']);
  });
});
```

## Translation Workflow Management

### 1. Development Workflow
```bash
# Add new translation key
i18n-add-key --key="dashboard.metrics.title" --en="Performance Metrics" --th="ตัวชี้วัดประสิทธิภาพ"

# Validate translations
i18n-validate --locale=all --report=detailed

# Extract missing keys
i18n-extract-missing --source=components --output=missing-keys.json

# Generate translation report
i18n-report --locale=th --format=detailed --output=th-report.md
```

### 2. Translation Service Integration
```typescript
// Translation service adapter
interface TranslationService {
  translate(text: string, from: 'en' | 'th', to: 'en' | 'th'): Promise<string>;
  validateQuality(text: string, locale: string): Promise<QualityScore>;
  suggestImprovements(text: string, context: string): Promise<string[]>;
}

// Human translator workflow
interface TranslatorWorkflow {
  assignTranslation(key: string, translator: string): void;
  reviewTranslation(key: string, reviewer: string): void;
  approveTranslation(key: string, approver: string): void;
  requestRevision(key: string, feedback: string): void;
}
```

### 3. Version Control Integration
```typescript
// Translation versioning
interface TranslationVersion {
  version: string;
  locale: string;
  changes: TranslationChange[];
  author: string;
  timestamp: Date;
  reviewStatus: 'pending' | 'approved' | 'rejected';
}

// Change tracking
interface TranslationChange {
  key: string;
  oldValue: string;
  newValue: string;
  changeType: 'added' | 'modified' | 'deleted';
  reason: string;
}
```

## Performance Optimization

### 1. Translation Loading Strategies
```typescript
// Lazy loading by namespace
const loadTranslations = async (locale: string, namespace: string) => {
  return await import(`../locales/${locale}/${namespace}.json`);
};

// Translation caching
const translationCache = new Map<string, Translation>();

// Preload critical translations
const preloadCritical = ['common', 'navigation', 'errors'];
```

### 2. Bundle Optimization
```typescript
// Split translations by route
const routeTranslations = {
  '/dashboard': ['dashboard', 'common'],
  '/auth': ['auth', 'forms', 'common'],
  '/admin': ['admin', 'common'],
  '/chat': ['chatbot', 'common']
};

// Dynamic imports
const useTranslations = (namespace: string) => {
  return useDynamicTranslations(namespace, currentLocale);
};
```

## Implementation Guidelines

### 1. Next.js Integration
```typescript
// next.config.js
const nextConfig = {
  i18n: {
    locales: ['en', 'th'],
    defaultLocale: 'en',
    localeDetection: true,
    domains: [
      {
        domain: 'chatbot.com',
        defaultLocale: 'en',
      },
      {
        domain: 'chatbot.co.th',
        defaultLocale: 'th',
      },
    ],
  },
};
```

### 2. Component Integration
```typescript
// Translation hook usage
const useI18n = () => {
  const { locale, locales, push } = useRouter();
  const t = useTranslations();

  const changeLocale = (newLocale: string) => {
    push(asPath, asPath, { locale: newLocale });
  };

  return { t, locale, locales, changeLocale };
};

// Component with translations
const WelcomeMessage = () => {
  const { t, locale } = useI18n();

  return (
    <div className={locale === 'th' ? 'font-thai' : 'font-latin'}>
      <h1>{t('welcome.title')}</h1>
      <p>{t('welcome.subtitle')}</p>
    </div>
  );
};
```

### 3. Form Validation with i18n
```typescript
// Validation schema with translations
const createValidationSchema = (t: TFunction) => {
  return z.object({
    email: z
      .string()
      .min(1, t('forms.validation.email.required'))
      .email(t('forms.validation.email.invalid')),
    password: z
      .string()
      .min(8, t('forms.validation.password.minLength', { min: 8 })),
  });
};
```

## Monitoring and Analytics

### 1. Translation Coverage Metrics
```typescript
interface I18nMetrics {
  totalKeys: number;
  translatedKeys: Record<string, number>;
  missingKeys: Record<string, string[]>;
  coveragePercentage: Record<string, number>;
  lastUpdateDate: Record<string, Date>;
  translationQuality: Record<string, QualityScore>;
}

// Generate coverage report
const generateCoverageReport = (): I18nReport => {
  return {
    summary: calculateCoverage(),
    missingTranslations: findMissingKeys(),
    qualityIssues: identifyQualityIssues(),
    recommendations: generateRecommendations(),
  };
};
```

### 2. Usage Analytics
```typescript
// Track translation usage
const trackTranslationUsage = (key: string, locale: string) => {
  analytics.track('translation_used', {
    key,
    locale,
    timestamp: Date.now(),
    route: window.location.pathname,
  });
};

// A/B testing for translations
const useTranslationVariant = (key: string, variants: string[]) => {
  const variant = getTranslationVariant(key, variants);
  return t(variant);
};
```

## Tools and Commands

### 1. CLI Tools
```bash
# Translation management CLI
npx i18n-manager init                    # Initialize i18n setup
npx i18n-manager add-key [key] [values]  # Add translation key
npx i18n-manager validate               # Validate all translations
npx i18n-manager extract                # Extract keys from code
npx i18n-manager report                 # Generate coverage report
npx i18n-manager sync                   # Sync with translation service
npx i18n-manager backup                 # Backup translation files
npx i18n-manager restore [backup-id]    # Restore from backup
```

### 2. Development Integration
```typescript
// VSCode extension integration
interface I18nExtension {
  autoCompleteKeys: boolean;
  validateOnSave: boolean;
  highlightMissing: boolean;
  inlineTranslations: boolean;
  keyNavigation: boolean;
}

// Git hooks for translation validation
const preCommitHook = `
#!/bin/sh
npx i18n-manager validate --strict
if [ $? -ne 0 ]; then
  echo "Translation validation failed. Please fix issues before committing."
  exit 1
fi
`;
```

## Error Handling and Fallbacks

### 1. Graceful Degradation
```typescript
// Fallback strategies
const useTranslationWithFallback = (key: string) => {
  const { t, locale } = useI18n();

  try {
    const translation = t(key);
    if (translation === key) {
      // Translation missing, try fallback locale
      return t(key, { lng: 'en' });
    }
    return translation;
  } catch (error) {
    // Log error and return key as fallback
    console.error(`Translation error for key: ${key}`, error);
    return key;
  }
};
```

### 2. Error Reporting
```typescript
// Translation error tracking
const reportTranslationError = (error: TranslationError) => {
  Sentry.captureException(error, {
    tags: {
      type: 'translation_error',
      locale: error.locale,
      key: error.key,
    },
    extra: {
      context: error.context,
      fallbackUsed: error.fallbackUsed,
    },
  });
};
```

## Best Practices and Guidelines

### 1. Translation Key Naming
- Use hierarchical namespaces: `module.section.element.property`
- Be specific: `auth.login.form.email.label` vs `email`
- Use camelCase for keys: `firstName` not `first_name`
- Avoid abbreviations: `navigation` not `nav`
- Include context: `button.save` vs `save`

### 2. Thai Language Guidelines
- Use appropriate formality level consistently
- Avoid direct translations; adapt culturally
- Consider Buddhist calendar for dates
- Use Thai-appropriate color associations
- Respect hierarchical language structures
- Include proper honorifics when needed

### 3. English Language Guidelines
- Use clear, concise language
- Maintain consistent terminology
- Follow accessibility guidelines
- Use active voice when possible
- Be inclusive and culturally sensitive
- Match brand voice and tone

### 4. Technical Guidelines
- Keep translations in separate files
- Use TypeScript for type safety
- Implement proper error boundaries
- Cache translations appropriately
- Monitor translation performance
- Test with real content lengths

## Integration Testing

### 1. Visual Testing with Playwright
```typescript
// Test Thai/English layout differences
test('Thai text layout compatibility', async ({ page }) => {
  await page.goto('/dashboard?lang=th');
  await expect(page).toHaveScreenshot('dashboard-thai.png');

  await page.goto('/dashboard?lang=en');
  await expect(page).toHaveScreenshot('dashboard-english.png');
});

// Test text expansion/contraction
test('Text overflow handling', async ({ page }) => {
  const longThaiText = 'ระบบจัดการข้อมูลและการสนทนาที่ครอบคลุม';
  await page.fill('[data-testid="input"]', longThaiText);
  await expect(page.locator('[data-testid="input"]')).toBeVisible();
});
```

### 2. Accessibility Testing
```typescript
// Test screen reader compatibility
test('Thai screen reader support', async ({ page }) => {
  await page.goto('/auth/login?lang=th');

  // Check aria-labels in Thai
  const loginButton = page.locator('[data-testid="login-button"]');
  await expect(loginButton).toHaveAttribute('aria-label', 'เข้าสู่ระบบ');
});
```

## Output Specifications

### 1. Translation Files
- JSON format with proper UTF-8 encoding
- Consistent key structure across locales
- Proper escaping for special characters
- Comment blocks for translator context
- Version headers for tracking

### 2. Configuration Files
- Locale configurations with proper formatting rules
- Font specifications for Thai/English
- Date/time format definitions
- Currency and number formatting rules
- Cultural adaptation guidelines

### 3. Validation Reports
- Missing translation detection
- Quality assessment scores
- Cultural appropriateness review
- Performance impact analysis
- Coverage percentage by module

### 4. Documentation
- Translation style guides
- Cultural adaptation guidelines
- Technical implementation docs
- Quality assurance processes
- Workflow documentation

## Success Metrics

### 1. Coverage Metrics
- 100% translation coverage for critical paths
- 95%+ coverage for all user-facing text
- Real-time missing key detection
- Automated quality scoring

### 2. Quality Metrics
- Cultural appropriateness scores
- Translation accuracy validation
- User satisfaction with localized content
- Performance impact measurement

### 3. Workflow Metrics
- Translation turnaround time
- Review and approval efficiency
- Error detection and resolution speed
- Automation effectiveness

This comprehensive i18n-manager subagent provides a complete framework for managing Thai/English translations with cultural sensitivity, technical excellence, and operational efficiency. It integrates seamlessly with the existing chatbot system while providing robust tools for scaling international localization efforts.