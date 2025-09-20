#!/bin/bash
# Hook installer script
# Sets up all development hooks for the project

echo "🔧 Installing Claude Code development hooks..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not in a git repository. Please run this script from the project root."
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Make hook scripts executable
chmod +x .claude/hooks/*.sh

# Install pre-commit hook
if [ -f ".claude/hooks/pre-commit.sh" ]; then
    ln -sf ../../.claude/hooks/pre-commit.sh .git/hooks/pre-commit
    echo "✅ Pre-commit hook installed"
else
    echo "⚠️ Pre-commit hook script not found"
fi

# Install pre-push hook
if [ -f ".claude/hooks/pre-push.sh" ]; then
    ln -sf ../../.claude/hooks/pre-push.sh .git/hooks/pre-push
    echo "✅ Pre-push hook installed"
else
    echo "⚠️ Pre-push hook script not found"
fi

# Create reports directories
mkdir -p reports/{errors,deployments,performance,security,benchmarks}
echo "✅ Report directories created"

# Verify hook installation
echo ""
echo "🔍 Verifying hook installation..."

if [ -x ".git/hooks/pre-commit" ]; then
    echo "✅ Pre-commit hook is executable"
else
    echo "❌ Pre-commit hook installation failed"
fi

if [ -x ".git/hooks/pre-push" ]; then
    echo "✅ Pre-push hook is executable"
else
    echo "❌ Pre-push hook installation failed"
fi

echo ""
echo "🎉 Hook installation completed!"
echo ""
echo "Available hooks:"
echo "  • Pre-commit: Runs quality checks before commits"
echo "  • Pre-push: Runs comprehensive tests before pushes"
echo "  • Post-deploy: Verifies deployment health (manual trigger)"
echo "  • Error-handling: Automated error response (integration required)"
echo ""
echo "To test the hooks:"
echo "  git add . && git commit -m 'Test commit'"
echo ""
echo "To temporarily bypass hooks (use sparingly):"
echo "  git commit --no-verify"
echo "  git push --no-verify"