#!/bin/bash
# Pre-tool validation hook for Claude Code
# Validates tool usage and enforces quality checks

TOOL_NAME="$1"
TOOL_ARGS="$2"

# Security validation for dangerous commands
case "$TOOL_NAME" in
    "Bash")
        # Check for potentially dangerous bash commands
        if echo "$TOOL_ARGS" | grep -E "(rm -rf|dd |mkfs|format|fdisk)" > /dev/null; then
            echo "🚫 Dangerous command detected and blocked"
            echo "Command: $TOOL_ARGS"
            exit 2  # Exit code 2 blocks the tool execution
        fi

        # Check for credential exposure
        if echo "$TOOL_ARGS" | grep -E "(password|secret|key|token)" > /dev/null; then
            echo "⚠️ Potential credential exposure detected"
            echo "Please ensure no sensitive information is being logged"
        fi

        # Validate git operations
        if echo "$TOOL_ARGS" | grep -E "git (push|commit)" > /dev/null; then
            echo "🔍 Git operation detected - running pre-commit checks"

            # Run quick validation
            if [ -f "scripts/pre-commit-hook.js" ]; then
                if ! node scripts/pre-commit-hook.js --quick 2>/dev/null; then
                    echo "⚠️ Pre-commit validation warnings detected"
                fi
            fi
        fi
        ;;

    "Write"|"Edit")
        # Validate file modifications
        if echo "$TOOL_ARGS" | grep -E "\.(env|secret|key)" > /dev/null; then
            echo "🔒 Modifying sensitive file - ensure no credentials are exposed"
        fi
        ;;
esac

echo "✅ Tool validation passed: $TOOL_NAME"
exit 0