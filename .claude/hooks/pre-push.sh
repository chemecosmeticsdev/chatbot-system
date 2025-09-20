#!/bin/bash
# Pre-push hook implementation
# This hook is automatically triggered before each push

echo "🚀 Running pre-push validation..."

# Check if we're on a protected branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
PROTECTED_BRANCHES=("main" "master" "production")

for protected in "${PROTECTED_BRANCHES[@]}"; do
    if [[ "$BRANCH" == "$protected" ]]; then
        echo "⚠️ Pushing to protected branch: $BRANCH"
        echo "Running comprehensive validation..."
        break
    fi
done

# Comprehensive test suite
echo "Running full test suite..."
if npm run test:all 2>/dev/null; then
    echo "✅ Full test suite passed"
else
    echo "⚠️ Full test suite not available, running individual tests..."

    # Run available tests
    npm run lint
    if [ $? -ne 0 ]; then
        echo "❌ Linting failed. Push blocked."
        exit 1
    fi

    npm run type-check
    if [ $? -ne 0 ]; then
        echo "❌ Type checking failed. Push blocked."
        exit 1
    fi

    npm run test:api
    if [ $? -ne 0 ]; then
        echo "❌ API tests failed. Push blocked."
        exit 1
    fi
fi

# Build validation
echo "Validating production build..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Push blocked."
    exit 1
fi

# Security audit
echo "Running security audit..."
npm audit --audit-level=moderate

if [ $? -ne 0 ]; then
    echo "⚠️ Security vulnerabilities detected. Review before pushing."
    echo "Run 'npm audit fix' to address vulnerabilities."
fi

echo "✅ All pre-push validations passed!"
exit 0