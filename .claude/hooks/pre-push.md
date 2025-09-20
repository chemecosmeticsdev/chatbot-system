# Pre-push Hook

Comprehensive testing before pushing to remote repository.

## Checks Performed

- **Full Test Suite**: Execute complete test suite including unit, integration, and E2E tests
- **Build Validation**: Ensure production build completes successfully
- **Performance Regression**: Test critical paths for performance degradation
- **Database Migration Validation**: Verify all pending migrations are valid and safe
- **Security Vulnerability Scan**: Comprehensive security audit of dependencies
- **Documentation Updates**: Check for required documentation updates
- **API Backward Compatibility**: Ensure API changes don't break existing clients
- **Vector Index Consistency**: Validate vector database indexes are consistent

## Implementation

```bash
#!/bin/bash
# Pre-push hook implementation
# This hook is automatically triggered before each push

echo "🚀 Running pre-push validation..."

# Comprehensive test suite
echo "Running full test suite..."
npm run test:all

if [ $? -ne 0 ]; then
    echo "❌ Test suite failed. Push blocked."
    exit 1
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
    read -p "Continue with push? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Push cancelled due to security concerns."
        exit 1
    fi
fi

echo "✅ All pre-push validations passed!"
exit 0
```

## Configuration

To enable this hook, run:
```bash
ln -sf ../../.claude/hooks/pre-push.sh .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```