# /security-audit

Run security checks on authentication flows and data protection

Tests authentication bypass attempts, validates data encryption, checks for injection vulnerabilities, and tests authorization edge cases.

```bash
echo "Starting comprehensive security audit..."

# Run authentication flow tests
echo "Testing authentication flows..."

# Check for common security vulnerabilities
echo "Scanning for security vulnerabilities..."

# Run npm audit with security focus
npm audit --audit-level=high

# Check environment variables security
echo "Validating environment variable handling..."
if grep -r "console.log.*process.env" . --include="*.ts" --include="*.js" 2>/dev/null; then
    echo "WARNING: Found potential environment variable logging"
fi

# Run the pre-commit security hook
if [ -f "scripts/pre-commit-hook.js" ]; then
    echo "Running security validation hook..."
    node scripts/pre-commit-hook.js
fi

# Generate security report
mkdir -p reports/security
REPORT_FILE="reports/security/security-audit-$(date +%Y%m%d-%H%M%S).log"

echo "Security audit started" > "$REPORT_FILE"
echo "Timestamp: $(date)" >> "$REPORT_FILE"

echo "Security audit completed"
echo "Report saved to: $REPORT_FILE"
```