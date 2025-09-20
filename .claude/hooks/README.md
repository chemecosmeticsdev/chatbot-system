# Claude Code Hooks Implementation

This directory contains properly implemented Claude Code hooks following the official JSON configuration format.

## Hook Architecture

The hooks are configured in `.claude/settings.local.json` using the official Claude Code hooks format:

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolPattern",
        "hooks": [
          {
            "type": "command",
            "command": "script-path"
          }
        ]
      }
    ]
  }
}
```

## Implemented Hooks

### 1. PreToolUse Hooks

#### Security Monitor (`security-monitor.sh`)
- **Triggers**: All `Bash`, `Write`, `Edit` tool usage
- **Purpose**: Security validation and threat detection
- **Features**:
  - Blocks dangerous commands (rm -rf, credential exposure)
  - Monitors sensitive file modifications
  - Scans for API keys in git commits
  - Logs security events

#### Pre-tool Validation (`pre-tool-validation.sh`)
- **Triggers**: All `Bash` commands
- **Purpose**: General tool validation and safety checks
- **Features**:
  - Validates git operations
  - Checks for credential exposure
  - Runs pre-commit validation for git operations
  - Blocks dangerous file operations

#### Build Validation (`build-validation.sh`)
- **Triggers**: Build-related `Bash` commands
- **Purpose**: Ensures build quality and environment validation
- **Features**:
  - Pre-build TypeScript and ESLint validation
  - Production environment variable checks
  - Git state validation for production builds
  - Dependency verification

### 2. PostToolUse Hooks

#### Post-tool Logging (`post-tool-logging.sh`)
- **Triggers**: All tool usage
- **Purpose**: Comprehensive tool usage logging and monitoring
- **Features**:
  - Logs all tool executions with timestamps
  - Monitors for failed operations
  - Tracks git, npm, and file operations
  - Automatic log rotation (7-day retention)

### 3. UserPromptSubmit Hooks

#### User Prompt Validator (`user-prompt-validator.sh`)
- **Triggers**: All user prompts
- **Purpose**: Prompt validation and context enhancement
- **Features**:
  - Blocks prompts containing credentials
  - Adds relevant project context for development tasks
  - Provides git, package, and subagent information
  - Safe prompt logging for analytics

## Security Features

### Credential Protection
- Scans for API keys, passwords, tokens, secrets
- Blocks commands and prompts containing credentials
- Monitors sensitive file modifications
- Validates git commits for exposed secrets

### Command Safety
- Blocks dangerous system commands
- Validates file operations
- Monitors for suspicious patterns
- Logs security events for review

### Access Control
- Validates tool permissions
- Enforces security policies
- Provides audit trails
- Supports compliance requirements

## Logging and Monitoring

### Log Files
- `.claude/logs/tool-usage-YYYYMMDD.log` - Daily tool usage logs
- `.claude/logs/security.log` - Security events and alerts
- `.claude/logs/prompts.log` - Safe user prompt analytics

### Log Retention
- Tool usage logs: 7 days
- Security logs: 30 days
- Automatic cleanup prevents disk space issues

## Context Enhancement

The hooks automatically add relevant context for development tasks:

### Git Context
- Current branch and modified files
- Triggered by: git, commit, push, deploy keywords

### Package Context
- Package name and dependencies
- Triggered by: npm, install, dependency keywords

### Subagent Context
- Available subagents count
- Triggered by: subagent, delegate, specialist keywords

### Localization Context
- Available locales
- Triggered by: translate, i18n, thai, english keywords

### Database Context
- Database type and capabilities
- Triggered by: database, migration, vector keywords

## Usage Examples

### Normal Operation
The hooks run automatically - no user action required.

### Security Blocking
When a security issue is detected:
```bash
🚫 Security Block: Potential credential exposure in command
Command contains credential patterns - blocking execution
```

### Context Addition
For development prompts:
```bash
📋 Development task detected - adding project context
🔧 Git Context: Branch 'main', 3 modified files
📦 Package: chatbot-starter
🤖 Available subagents: 7
```

### Build Validation
For build commands:
```bash
🏗️ Build operation detected - running pre-build validation
🔍 Running pre-build validation...
✅ TypeScript validation passed
✅ ESLint validation passed
✅ Pre-build validation completed
```

## Configuration

The hooks are automatically configured in `.claude/settings.local.json`. To modify hook behavior:

1. Edit the hook scripts in `.claude/hooks/`
2. Update matchers and commands in `settings.local.json`
3. Ensure scripts are executable: `chmod +x .claude/hooks/*.sh`

## Troubleshooting

### Hook Not Triggering
- Verify script is executable
- Check matcher pattern in settings.json
- Ensure script path is correct

### Security Blocks
- Review the blocked command for credentials
- Use environment variables instead of hardcoded values
- Check `.claude/logs/security.log` for details

### Performance Issues
- Check log file sizes in `.claude/logs/`
- Verify automatic cleanup is working
- Consider adjusting log retention periods

## Integration with Development Workflow

These hooks integrate seamlessly with:
- Git workflows and commit validation
- CI/CD pipelines and build processes
- Security scanning and compliance
- Development team collaboration
- Project documentation and context

The hooks enhance the development experience while maintaining security and quality standards throughout the project lifecycle.