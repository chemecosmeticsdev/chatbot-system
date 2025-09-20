#!/bin/bash
# Post-tool logging hook for Claude Code
# Logs tool usage and monitors for issues

TOOL_NAME="$1"
TOOL_ARGS="$2"
TOOL_RESULT="$3"
EXIT_CODE="$4"

# Create logs directory
mkdir -p .claude/logs

# Log file with timestamp
LOG_FILE=".claude/logs/tool-usage-$(date +%Y%m%d).log"

# Log the tool usage
echo "$(date --iso-8601=seconds) | $TOOL_NAME | Exit: $EXIT_CODE" >> "$LOG_FILE"

# Monitor for specific events
case "$TOOL_NAME" in
    "Bash")
        if [ "$EXIT_CODE" != "0" ]; then
            echo "⚠️ Bash command failed: $TOOL_ARGS"
            echo "$(date --iso-8601=seconds) | ERROR | Bash failed: $TOOL_ARGS" >> "$LOG_FILE"
        fi

        # Log git operations
        if echo "$TOOL_ARGS" | grep -E "git (push|commit|pull)" > /dev/null; then
            echo "📝 Git operation logged: $(echo "$TOOL_ARGS" | cut -d' ' -f1-2)"
            echo "$(date --iso-8601=seconds) | GIT | $TOOL_ARGS" >> "$LOG_FILE"
        fi

        # Log npm operations
        if echo "$TOOL_ARGS" | grep -E "npm (install|run|build)" > /dev/null; then
            echo "📦 NPM operation logged: $(echo "$TOOL_ARGS" | cut -d' ' -f1-2)"
            echo "$(date --iso-8601=seconds) | NPM | $TOOL_ARGS" >> "$LOG_FILE"
        fi
        ;;

    "Write"|"Edit")
        echo "📝 File modification logged"
        echo "$(date --iso-8601=seconds) | FILE | Modified via $TOOL_NAME" >> "$LOG_FILE"
        ;;

    "mcp__neon__*")
        echo "🗄️ Database operation logged"
        echo "$(date --iso-8601=seconds) | DATABASE | $TOOL_NAME" >> "$LOG_FILE"
        ;;
esac

# Cleanup old logs (keep last 7 days)
find .claude/logs -name "tool-usage-*.log" -mtime +7 -delete 2>/dev/null || true

exit 0