# /deploy-chatbot

Deploy chatbot to specified environment with validation

Validates chatbot configuration, tests model connectivity, deploys to target environment, and runs post-deployment health checks.

**Usage:** `/deploy-chatbot [name] [environment]`
**Example:** `/deploy-chatbot customer-support production`

```bash
CHATBOT_NAME="$1"
ENVIRONMENT="${2:-staging}"

echo "Deploying chatbot '$CHATBOT_NAME' to '$ENVIRONMENT' environment..."

# Validate configuration
npm run setup-env

# Use chatbot-trainer subagent for deployment
echo "Delegating to chatbot-trainer subagent for deployment validation and execution..."

# Basic health check
echo "Running post-deployment health checks..."
```