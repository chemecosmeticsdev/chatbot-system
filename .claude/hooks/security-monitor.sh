#!/bin/bash
# Security monitoring hook for Claude Code
# Monitors for security issues and potential vulnerabilities

TOOL_NAME="$1"
TOOL_ARGS="$2"

# Security monitoring for file operations
case "$TOOL_NAME" in
    "Write"|"Edit")
        FILE_PATH=$(echo "$TOOL_ARGS" | grep -o '"[^"]*"' | sed 's/"//g' | head -1)

        # Check for sensitive file modifications
        if echo "$FILE_PATH" | grep -E "\.(env|secret|key|pem|p12|pfx|crt)$" > /dev/null; then
            echo "🔒 Security Alert: Modifying sensitive file type"
            echo "File: $FILE_PATH"
            echo "Ensure no credentials are being exposed"

            # Log security event
            mkdir -p .claude/logs
            echo "$(date --iso-8601=seconds) | SECURITY | Sensitive file modified: $FILE_PATH" >> .claude/logs/security.log
        fi

        # Check for credential patterns in file paths
        if echo "$FILE_PATH" | grep -iE "(password|secret|token|key|credential)" > /dev/null; then
            echo "🚨 Security Warning: File path contains credential keywords"
            echo "Path: $FILE_PATH"
        fi
        ;;

    "Bash")
        # Monitor for potentially dangerous commands
        DANGEROUS_PATTERNS=(
            "curl.*|.*sh"
            "wget.*|.*sh"
            "chmod 777"
            "sudo.*rm"
            "rm -rf /"
        )

        for pattern in "${DANGEROUS_PATTERNS[@]}"; do
            if echo "$TOOL_ARGS" | grep -E "$pattern" > /dev/null; then
                echo "🚨 Security Alert: Potentially dangerous command detected"
                echo "Pattern: $pattern"
                echo "Command: $TOOL_ARGS"

                # Log security event
                mkdir -p .claude/logs
                echo "$(date --iso-8601=seconds) | SECURITY | Dangerous command: $TOOL_ARGS" >> .claude/logs/security.log
                break
            fi
        done

        # Monitor for credential exposure in commands
        if echo "$TOOL_ARGS" | grep -E "(password|secret|token|key).*[:=]" > /dev/null; then
            echo "🚫 Security Block: Potential credential exposure in command"
            echo "Command contains credential patterns - blocking execution"
            exit 2  # Block the command
        fi

        # Monitor git operations for security
        if echo "$TOOL_ARGS" | grep -E "git (push|commit)" > /dev/null; then
            echo "🔍 Security Check: Git operation detected"

            # Check for potential secrets in git
            if command -v git &> /dev/null && [ -d ".git" ]; then
                # Check staged files for potential secrets
                STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || echo "")

                for file in $STAGED_FILES; do
                    if [ -f "$file" ]; then
                        if grep -E "(sk-[a-zA-Z0-9]{48}|xoxb-|ghp_|AKIA)" "$file" > /dev/null 2>&1; then
                            echo "🚫 Security Block: Potential API key found in staged file: $file"
                            echo "Please remove credentials before committing"
                            exit 2
                        fi
                    fi
                done
            fi
        fi
        ;;
esac

# Cleanup old security logs (keep last 30 days)
find .claude/logs -name "security.log" -mtime +30 -delete 2>/dev/null || true

exit 0