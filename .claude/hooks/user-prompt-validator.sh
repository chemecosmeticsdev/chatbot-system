#!/bin/bash
# User prompt validation hook for Claude Code
# Validates user prompts and adds context

USER_PROMPT="$1"

# Check for potentially sensitive information in prompts
if echo "$USER_PROMPT" | grep -E "(password|secret|token|key).*[:=]" > /dev/null; then
    echo "🚫 Potential credential detected in prompt - blocking for security"
    exit 2  # Block the prompt
fi

# Add project context for development-related prompts
if echo "$USER_PROMPT" | grep -iE "(implement|create|fix|debug|test|deploy)" > /dev/null; then
    echo "📋 Development task detected - adding project context"

    CONTEXT_INFO=""

    # Add current git status if relevant
    if echo "$USER_PROMPT" | grep -iE "(commit|push|git|deploy)" > /dev/null; then
        if [ -d ".git" ]; then
            BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
            STATUS=$(git status --porcelain 2>/dev/null | wc -l || echo "0")
            CONTEXT_INFO+="\n🔧 Git Context: Branch '$BRANCH', $STATUS modified files"
        fi
    fi

    # Add package.json info for npm-related tasks
    if echo "$USER_PROMPT" | grep -iE "(npm|install|dependency|package)" > /dev/null; then
        if [ -f "package.json" ]; then
            PKG_NAME=$(node -e "console.log(require('./package.json').name)" 2>/dev/null || echo "unknown")
            CONTEXT_INFO+="\n📦 Package: $PKG_NAME"
        fi
    fi

    # Add available subagents context
    if echo "$USER_PROMPT" | grep -iE "(subagent|delegate|specialist)" > /dev/null; then
        if [ -d ".claude/agents" ]; then
            AGENTS=$(ls .claude/agents 2>/dev/null | wc -l || echo "0")
            CONTEXT_INFO+="\n🤖 Available subagents: $AGENTS"
        fi
    fi

    # Add i18n context for translation tasks
    if echo "$USER_PROMPT" | grep -iE "(translate|i18n|thai|english|locale)" > /dev/null; then
        if [ -d "locales" ]; then
            LOCALES=$(ls locales 2>/dev/null | tr '\n' ', ' | sed 's/,$//')
            CONTEXT_INFO+="\n🌍 Available locales: $LOCALES"
        fi
    fi

    # Add database context for database tasks
    if echo "$USER_PROMPT" | grep -iE "(database|migration|vector|neon)" > /dev/null; then
        CONTEXT_INFO+="\n🗄️ Database: Neon PostgreSQL with pgvector extension"
    fi

    # Output context if any was gathered
    if [ -n "$CONTEXT_INFO" ]; then
        echo -e "$CONTEXT_INFO"
    fi
fi

# Log the prompt for analytics (without sensitive content)
mkdir -p .claude/logs
SAFE_PROMPT=$(echo "$USER_PROMPT" | head -c 100 | tr '\n' ' ')
echo "$(date --iso-8601=seconds) | PROMPT | $SAFE_PROMPT..." >> .claude/logs/prompts.log

echo "✅ Prompt validation passed"
exit 0