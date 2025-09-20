#!/bin/bash
# Build validation hook for Claude Code
# Validates build commands and ensures quality

TOOL_NAME="$1"
TOOL_ARGS="$2"

# Only trigger for build-related commands
if [[ "$TOOL_NAME" == "Bash" ]] && echo "$TOOL_ARGS" | grep -E "(npm run build|build|compile)" > /dev/null; then
    echo "🏗️ Build operation detected - running pre-build validation"

    # Check if we're in a clean git state for production builds
    if echo "$TOOL_ARGS" | grep -E "(production|prod|build)" > /dev/null; then
        if [ -d ".git" ]; then
            if ! git diff-index --quiet HEAD 2>/dev/null; then
                echo "⚠️ Uncommitted changes detected during production build"
                echo "Consider committing changes before production build"
            fi
        fi
    fi

    # Validate package.json exists
    if [ ! -f "package.json" ]; then
        echo "🚫 package.json not found - build will likely fail"
        exit 2
    fi

    # Check for node_modules
    if [ ! -d "node_modules" ]; then
        echo "⚠️ node_modules not found - running npm install"
        npm install
    fi

    # Run quick pre-build checks
    echo "🔍 Running pre-build validation..."

    # TypeScript check if available
    if npm run type-check 2>/dev/null; then
        echo "✅ TypeScript validation passed"
    else
        echo "⚠️ TypeScript validation not available or failed"
    fi

    # ESLint check if available
    if npm run lint 2>/dev/null; then
        echo "✅ ESLint validation passed"
    else
        echo "⚠️ ESLint validation not available or failed"
    fi

    # Check environment variables for production builds
    if echo "$TOOL_ARGS" | grep -E "(production|prod)" > /dev/null; then
        echo "🔧 Validating production environment..."

        REQUIRED_VARS=(
            "NEXT_PUBLIC_STACK_PROJECT_ID"
            "DATABASE_URL"
            "BAWS_ACCESS_KEY_ID"
        )

        for var in "${REQUIRED_VARS[@]}"; do
            if [ -z "${!var}" ]; then
                echo "⚠️ Required environment variable not set: $var"
            fi
        done
    fi

    echo "✅ Pre-build validation completed"
fi

exit 0