# i18n Manager Documentation

This directory contains the internationalization (i18n) setup for the Thai/English chatbot management system. The i18n-manager subagent provides comprehensive tools for managing translations and localization workflows.

## Directory Structure

```
locales/
├── en/                     # English translations
│   ├── common.json         # Shared translations (actions, status, time, etc.)
│   ├── navigation.json     # Navigation elements
│   ├── auth.json          # Authentication flow
│   ├── dashboard.json     # Dashboard specific
│   └── forms.json         # Form labels and validation
├── th/                     # Thai translations
│   ├── common.json         # Shared translations (actions, status, time, etc.)
│   ├── navigation.json     # Navigation elements
│   ├── auth.json          # Authentication flow
│   ├── dashboard.json     # Dashboard specific
│   └── forms.json         # Form labels and validation
├── config/                 # Configuration files
│   ├── formats.json        # Date/number/currency formats
│   └── locales.json        # Locale configurations
└── README.md              # This documentation
```

## Using the i18n-Manager Subagent

### Basic Commands

```bash
# Initialize i18n setup
npm run i18n:init

# Validate all translations
npm run i18n:validate

# Extract translation keys from source code
npm run i18n:extract

# Generate coverage report
npm run i18n:report

# Create backup
npm run i18n:backup

# Strict validation (for CI/CD)
npm run i18n:check
```

### Subagent Activation

Use these patterns to trigger the i18n-manager subagent:

```
"Use i18n-manager subagent to add translations for [feature] in Thai and English"
"Translate [component/feature] with cultural adaptation"
"Validate translations for [module] in both languages"
"Fix missing translation keys in [section]"
"Setup i18n for new [feature/component]"
```

### Adding New Translation Keys

#### Method 1: CLI Tool
```bash
# Add a new translation key
node scripts/i18n-manager.js add-key \
  --key="dashboard.metrics.new_metric" \
  --en="New Metric" \
  --th="ตัวชี้วัดใหม่"
```

#### Method 2: Direct File Editing
1. Edit the appropriate namespace file (e.g., `dashboard.json`)
2. Add the key in both English and Thai versions
3. Run validation: `npm run i18n:validate`

#### Method 3: Through Subagent
```
Use i18n-manager subagent to add translation key "dashboard.welcome.subtitle"
with English text "Monitor your chatbot performance"
and Thai text "ติดตามประสิทธิภาพแชทบอทของคุณ"
```

## Translation Key Naming Convention

Use hierarchical dot notation:
```
namespace.section.element.property
```

Examples:
```javascript
// Good
"auth.login.form.email.label"
"dashboard.metrics.total_conversations"
"navigation.header.user_menu"

// Avoid
"email"
"conversations"
"menu"
```

## Thai Language Guidelines

### Cultural Considerations
- Use appropriate formality level (formal for business contexts)
- Consider hierarchical respect in language
- Use Buddhist Era (B.E.) for official dates
- Be mindful of color symbolism and cultural meanings

### Typography
- Font family: `Noto Sans Thai, Sarabun, Prompt, system-ui, sans-serif`
- Line height: 1.7 (vs 1.5 for English)
- Letter spacing: 0.025em
- Avoid excessive bold or light font weights

### Number and Date Formatting
```javascript
// Currency
"฿1,234.56" // Thai Baht format

// Dates
"1 ธันวาคม 2567" // Buddhist Era (+543 years)
"1/12/2567" // Short format

// Numbers
"1,234.56" // Standard decimal format
"๑,๒๓๔.๕๖" // Thai numerals (optional)
```

## English Language Guidelines

### Best Practices
- Use clear, concise language
- Maintain consistent terminology
- Follow accessibility guidelines (simple language, descriptive links)
- Use active voice when possible
- Be inclusive and culturally sensitive

### UI Text Standards
- Button text: Title Case ("Sign In", "Save Changes")
- Form labels: Sentence case ("Email address", "Password")
- Error messages: Helpful and specific
- Success messages: Encouraging and clear

## Validation Rules

### Automatic Validations
1. **Key Consistency**: All keys exist in both locales
2. **Empty Values**: No empty translation values
3. **Interpolation**: Valid variable syntax `{{variable}}`
4. **Cultural Appropriateness**: Thai tone and context validation
5. **Typography**: Proper spacing and character usage

### Manual Review Required
- Cultural sensitivity and appropriateness
- Professional tone consistency
- Technical term accuracy
- Context-specific translations

## Integration with Components

### Using Translations in Components
```typescript
import { useTranslations } from 'next-intl';

function WelcomeComponent() {
  const t = useTranslations('dashboard.welcome');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
    </div>
  );
}
```

### With Interpolation
```typescript
const t = useTranslations('common.time');

// Usage: "Updated 5 minutes ago"
const timeText = t('ago', { time: '5 minutes' });
```

### Namespace Loading
```typescript
// For specific pages
import { useTranslations } from 'next-intl';

// This loads the 'auth' namespace
const t = useTranslations('auth.login');
```

## Performance Optimization

### Lazy Loading
- Translations are loaded per namespace
- Critical namespaces (`common`, `navigation`) are preloaded
- Non-critical namespaces load on demand

### Caching
- Translations are cached for 24 hours
- Development mode shows real-time updates
- Production builds include static generation

### Bundle Splitting
```javascript
// Route-based namespace loading
const routeNamespaces = {
  '/dashboard': ['dashboard', 'common'],
  '/auth': ['auth', 'forms', 'common'],
  '/admin': ['admin', 'common'],
};
```

## Quality Assurance

### Automated Testing
```bash
# Run translation validation
npm run i18n:validate --detailed --strict

# Extract and check for missing keys
npm run i18n:extract
```

### Manual QA Checklist
- [ ] All user-facing text has translations
- [ ] Thai text uses appropriate formality
- [ ] Cultural context is appropriate
- [ ] Typography renders correctly
- [ ] Date/number formats are locale-appropriate
- [ ] Form validation messages are clear
- [ ] Error messages are helpful
- [ ] Success messages are encouraging

## Common Issues and Solutions

### Missing Translation Keys
```bash
# Find missing keys
npm run i18n:validate --detailed

# Extract keys from source code
npm run i18n:extract --source=app --output=missing-keys.json
```

### Cultural Adaptation Issues
- Review Thai translations for appropriate tone
- Check business context formality
- Validate religious and cultural sensitivity
- Ensure hierarchical respect in language

### Typography Problems
- Verify Thai font rendering
- Check line height and spacing
- Test text overflow scenarios
- Validate responsive design with longer Thai text

## Development Workflow

### 1. Adding New Features
1. Develop feature with English text
2. Extract translation keys: `npm run i18n:extract`
3. Add Thai translations
4. Validate: `npm run i18n:validate`
5. Test both locales visually

### 2. Translation Updates
1. Edit translation files directly
2. Validate changes: `npm run i18n:validate`
3. Test in development environment
4. Create backup before production deployment

### 3. Quality Assurance
1. Run automated validation
2. Manual cultural review
3. Visual testing in both locales
4. Performance testing with realistic data

## Advanced Features

### Translation Service Integration
The i18n-manager supports integration with:
- Google Translate API
- DeepL API
- Professional translation services

### Analytics and Monitoring
- Track translation usage
- Monitor missing translations
- Measure locale switching patterns
- Performance metrics per locale

### Backup and Versioning
```bash
# Create backup
npm run i18n:backup

# List backups
node scripts/i18n-manager.js restore

# Restore specific backup
node scripts/i18n-manager.js restore backup-2024-01-15
```

## Contributing

When adding new translations:
1. Follow the naming conventions
2. Consider cultural context
3. Test both locales
4. Run validation before committing
5. Document any cultural adaptations

For questions or issues with the i18n-manager subagent, use the activation patterns to get help with specific translation tasks.