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
        echo "🔄 Handling deployment error..." >> "$ERROR_REPORT"
        if [ "$ERROR_SEVERITY" = "critical" ]; then
            echo "⏪ Critical deployment error - rollback may be required" >> "$ERROR_REPORT"
        fi
        ;;
    "database")
        echo "🗄️ Handling database error..." >> "$ERROR_REPORT"
        echo "🔄 Database connection issues detected" >> "$ERROR_REPORT"
        ;;
    "performance")
        echo "⚡ Handling performance error..." >> "$ERROR_REPORT"
        echo "📊 Performance degradation detected" >> "$ERROR_REPORT"
        ;;
    "security")
        echo "🔒 Handling security error..." >> "$ERROR_REPORT"
        echo "🚨 Security issue requires immediate attention" >> "$ERROR_REPORT"
        ;;
    *)
        echo "❓ Handling unknown error type..." >> "$ERROR_REPORT"
        ;;
esac

# Log the error handling completion
echo "Error handling completed at: $(date)" >> "$ERROR_REPORT"
echo "📊 Error handling completed"
echo "Report saved to: $ERROR_REPORT"

# For critical errors, suggest immediate action
if [ "$ERROR_SEVERITY" = "critical" ]; then
    echo ""
    echo "🚨 CRITICAL ERROR DETECTED 🚨"
    echo "Immediate action required:"
    echo "1. Review error report: $ERROR_REPORT"
    echo "2. Check system status and logs"
    echo "3. Consider rollback if deployment-related"
    echo "4. Escalate to on-call personnel if needed"
fi

# Exit with error code to maintain error state
exit 1