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
    echo "Running basic linting and type checks..."
    npm run lint
    if [ $? -ne 0 ]; then
        echo "❌ ESLint checks failed. Commit blocked."
        exit 1
    fi

    npm run type-check
    if [ $? -ne 0 ]; then
        echo "❌ TypeScript checks failed. Commit blocked."
        exit 1
    fi
fi

echo "✅ All pre-commit checks passed!"
exit 0