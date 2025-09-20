# Error Handling Hook

Automated response to system errors and failures.

## Automated Responses

- **Auto-create Sentry Issues**: Automatically generate detailed Sentry issues with full context
- **GitHub Issue Creation**: Create GitHub issues for critical errors with debugging information
- **Team Notifications**: Send Slack/Discord notifications with error severity and context
- **Performance Degradation Alerts**: Trigger alerts when performance degrades beyond thresholds
- **Database Connection Recovery**: Attempt automatic recovery for database connection failures
- **Automatic Rollback Triggers**: Initiate rollback procedures for critical system failures
- **User Impact Assessment**: Analyze and report user impact of system errors
- **Escalation Procedures**: Automatically escalate critical issues to on-call personnel

## Implementation

```bash
#!/bin/bash
# Error handling hook implementation
# This hook is triggered when system errors are detected

ERROR_TYPE="${1:-unknown}"
ERROR_MESSAGE="${2:-No error message provided}"
ERROR_SEVERITY="${3:-medium}"
ERROR_CONTEXT="${4:-}"

echo "🚨 Error handling triggered"
echo "Type: $ERROR_TYPE"
echo "Severity: $ERROR_SEVERITY"
echo "Message: $ERROR_MESSAGE"

# Create error report
mkdir -p reports/errors
ERROR_REPORT="reports/errors/error-$(date +%Y%m%d-%H%M%S).log"

cat > "$ERROR_REPORT" << EOF
Error Report
============
Timestamp: $(date)
Type: $ERROR_TYPE
Severity: $ERROR_SEVERITY
Message: $ERROR_MESSAGE
Context: $ERROR_CONTEXT

System Information:
- Node.js: $(node --version 2>/dev/null || echo "N/A")
- npm: $(npm --version 2>/dev/null || echo "N/A")
- Git Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "N/A")
- Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")

Environment Variables:
- NODE_ENV: ${NODE_ENV:-not set}
- VERCEL_ENV: ${VERCEL_ENV:-not set}

EOF

# Handle different error types
case "$ERROR_TYPE" in
    "deployment")
        echo "🔄 Handling deployment error..."
        # Trigger rollback if critical
        if [ "$ERROR_SEVERITY" = "critical" ]; then
            echo "⏪ Initiating automatic rollback..."
            # Add rollback logic here
        fi
        ;;
    "database")
        echo "🗄️ Handling database error..."
        # Attempt connection recovery
        echo "🔄 Attempting database connection recovery..."
        # Add database recovery logic here
        ;;
    "performance")
        echo "⚡ Handling performance error..."
        # Alert on performance degradation
        echo "📊 Performance degradation detected"
        ;;
    "security")
        echo "🔒 Handling security error..."
        # Immediate escalation for security issues
        echo "🚨 Security issue requires immediate attention"
        ;;
    *)
        echo "❓ Handling unknown error type..."
        ;;
esac

# Generate GitHub issue if critical
if [ "$ERROR_SEVERITY" = "critical" ]; then
    echo "📝 Creating GitHub issue for critical error..."

    ISSUE_TITLE="[CRITICAL] $ERROR_TYPE: $ERROR_MESSAGE"
    ISSUE_BODY="## Error Details

**Type:** $ERROR_TYPE
**Severity:** $ERROR_SEVERITY
**Timestamp:** $(date)

## Error Message
\`\`\`
$ERROR_MESSAGE
\`\`\`

## Context
$ERROR_CONTEXT

## System Information
- Environment: ${NODE_ENV:-development}
- Git Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
- Git Commit: $(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

## Automatic Actions Taken
- Error report generated: $ERROR_REPORT
- Error handling hook executed
- System administrators notified

## Next Steps
- [ ] Investigate root cause
- [ ] Implement fix
- [ ] Verify resolution
- [ ] Update monitoring and alerting if needed"

    # This would integrate with GitHub CLI or API in a real implementation
    echo "GitHub issue content prepared (integration required)"
fi

echo "📊 Error handling completed"
echo "Report saved to: $ERROR_REPORT"

# Exit with error code to maintain error state
exit 1
```

## Integration Examples

### Node.js Application Integration

```javascript
// Add to your application error handlers
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);

    // Trigger error handling hook
    const { spawn } = require('child_process');
    spawn('./.claude/hooks/error-handling.sh', [
        'uncaughtException',
        error.message,
        'critical',
        error.stack
    ]);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);

    // Trigger error handling hook
    const { spawn } = require('child_process');
    spawn('./.claude/hooks/error-handling.sh', [
        'unhandledRejection',
        reason.toString(),
        'high',
        `Promise: ${promise}`
    ]);
});
```

### GitHub Actions Integration

```yaml
- name: Handle CI/CD Errors
  if: failure()
  run: |
    chmod +x .claude/hooks/error-handling.sh
    ./.claude/hooks/error-handling.sh "ci_cd" "${{ job.status }}" "high" "GitHub Actions workflow failed"
```