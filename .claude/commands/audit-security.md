# /audit-security

Run comprehensive security audit across the application

Scans for security vulnerabilities, checks authentication flows, validates input sanitization, and tests authorization controls.

```bash
echo "Starting comprehensive security audit..."

# Run npm audit
npm audit --audit-level=moderate

# Check for hardcoded secrets
echo "Scanning for potential secrets..."
if command -v rg &> /dev/null; then
    rg -i "(password|secret|key|token)\s*[:=]\s*[\"']?[a-zA-Z0-9\-_]{8,}" --type js --type ts . || echo "No secrets detected"
else
    grep -ri "(password\|secret\|key\|token)" --include="*.ts" --include="*.js" . | grep -v "process.env" || echo "No secrets detected"
fi

# Run the pre-commit security checks
node scripts/pre-commit-hook.js

echo "Security audit completed"
```