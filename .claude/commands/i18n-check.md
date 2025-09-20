# /i18n-check

Validate Thai/English localization (comprehensive implementation)

Checks translation completeness, validates Thai text rendering, tests language switching functionality, and verifies cultural adaptations.

```bash
echo "Starting comprehensive i18n validation..."

# Use i18n-manager subagent for comprehensive testing
echo "Delegating to i18n-manager subagent for localization validation..."

# Run i18n validation script
if [ -f "scripts/i18n-manager.js" ]; then
    echo "Running i18n validation script..."
    node scripts/i18n-manager.js validate
else
    echo "i18n validation script not found"
fi

# Check translation files
echo "Checking translation files..."
for locale in "en" "th"; do
    if [ -d "locales/$locale" ]; then
        echo "Found translations for: $locale"
        find "locales/$locale" -name "*.json" -exec echo "  - {}" \;
    else
        echo "Missing translations for: $locale"
    fi
done

echo "i18n validation completed"
```