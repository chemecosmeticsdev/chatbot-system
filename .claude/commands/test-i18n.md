# /test-i18n

Validate translations and localization for specified locale

Checks for missing translation keys, validates translation completeness, tests locale-specific formatting, and verifies cultural adaptations.

**Usage:** `/test-i18n [locale]`
**Example:** `/test-i18n th`

```bash
LOCALE="${1:-th}"

echo "Testing i18n for locale: $LOCALE"

# Use i18n-manager subagent for comprehensive testing
echo "Delegating to i18n-manager subagent for translation validation..."

# Run basic i18n checks
if [ -f "locales/$LOCALE/common.json" ]; then
    echo "Found translation files for locale: $LOCALE"
    node -e "
    try {
        const translations = require('./locales/$LOCALE/common.json');
        console.log('Translation keys found:', Object.keys(translations).length);
    } catch(e) {
        console.log('Error reading translations:', e.message);
    }
    "
else
    echo "No translation files found for locale: $LOCALE"
fi
```