# Pre-commit Hook

Automated quality checks before code commits to ensure code quality and prevent issues.

## Checks Performed

- **TypeScript Compilation**: Verify all TypeScript files compile without errors
- **ESLint Validation**: Enforce code quality standards and catch potential bugs
- **Prettier Formatting**: Ensure consistent code formatting across the project
- **API Integration Tests**: Run subset of critical API tests for core functionality
- **i18n Key Validation**: Check for missing translation keys and validate structure
- **Vector Database Schema**: Validate database schema changes and migrations
- **Sentry Configuration**: Verify error tracking configuration is valid
- **Security Scan**: Basic security vulnerability checks on changed files

## Implementation

```bash
#!/bin/bash
# Pre-commit hook implementation
# This hook is automatically triggered before each commit

echo "🔍 Running pre-commit checks..."

# Run the pre-commit hook script
if [ -f "scripts/pre-commit-hook.js" ]; then
    node scripts/pre-commit-hook.js
    if [ $? -ne 0 ]; then
        echo "❌ Pre-commit checks failed. Commit blocked."
        exit 1
    fi
else
    echo "⚠️ Pre-commit hook script not found at scripts/pre-commit-hook.js"

    # Run basic checks
    npm run lint
    npm run type-check

    if [ $? -ne 0 ]; then
        echo "❌ Basic checks failed. Commit blocked."
        exit 1
    fi
fi

echo "✅ All pre-commit checks passed!"
exit 0
```

## Configuration

To enable this hook, run:
```bash
ln -sf ../../.claude/hooks/pre-commit.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```