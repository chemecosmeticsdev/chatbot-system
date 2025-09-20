# AWS Amplify Environment Variables Configuration Guide

## Problem Summary

When deploying Next.js SSR applications to AWS Amplify, environment variables set in the Amplify Console are only available during **build time**, not at **runtime**. This causes APIs and server-side code to fail with missing environment variable errors, even though the build succeeds.

## Root Cause

AWS Amplify deploys Next.js API routes as Lambda Edge functions that cannot access Amplify Console environment variables by default. The variables exist during the build process but are not carried through to the runtime environment.

## Solution: amplify.yml Configuration

### ✅ Correct Configuration (Working)

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
        - echo "Environment variables check:"
        - echo "DATABASE_URL exists:" $([[ -n "$DATABASE_URL" ]] && echo "true" || echo "false")
        - echo "STACK_SECRET_SERVER_KEY exists:" $([[ -n "$STACK_SECRET_SERVER_KEY" ]] && echo "true" || echo "false")
        - node scripts/setup-env.js
    build:
      commands:
        # Write environment variables to .env.production for Next.js runtime access
        - echo "Writing environment variables to .env.production..."
        - env | grep -e NEXT_PUBLIC_STACK_PROJECT_ID -e NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY -e STACK_SECRET_SERVER_KEY -e DATABASE_URL -e BAWS_ACCESS_KEY_ID -e BAWS_SECRET_ACCESS_KEY -e DEFAULT_REGION -e BEDROCK_REGION -e MISTRAL_API_KEY -e LLAMAINDEX_API_KEY >> .env.production
        - echo "Environment variables written to .env.production:"
        - cat .env.production
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

### ❌ Incorrect Approaches (Don't Work)

1. **Individual echo commands** (unreliable):
```yaml
- echo "VAR_NAME=$VAR_NAME" >> .env.production
```

2. **No environment variable configuration** (fails at runtime):
```yaml
build:
  commands:
    - npm run build  # Missing env var setup
```

3. **Relying only on Amplify Console** (build-time only):
```yaml
# Environment variables set in Amplify Console are not automatically available at runtime
```

## Key Requirements

### 1. Amplify Console Configuration
- Set ALL environment variables in Amplify Console under App Settings > Environment Variables
- Include both `NEXT_PUBLIC_*` and private variables
- Ensure no typos in variable names

### 2. amplify.yml Build Configuration
- Use `env | grep -e VAR1 -e VAR2` method for reliable variable injection
- Write variables to `.env.production` during build phase
- Add debug output with `cat .env.production` to verify

### 3. Application Code Requirements
- Use graceful degradation for missing environment variables
- Implement proper error handling for undefined variables
- Test locally with missing variables to ensure robustness

## Environment Variable Types

### Public Variables (Client-side)
- Prefix: `NEXT_PUBLIC_*`
- Available in browser and server
- Automatically bundled by Next.js
- Example: `NEXT_PUBLIC_STACK_PROJECT_ID`

### Private Variables (Server-side only)
- No prefix required
- Only available on server/API routes
- Must be explicitly injected via amplify.yml
- Example: `DATABASE_URL`, `STACK_SECRET_SERVER_KEY`

## Troubleshooting Steps

### 1. Verify Amplify Console Variables
```bash
# Check all required variables are set in Amplify Console
# App Settings > Environment Variables
```

### 2. Test Build Locally
```bash
npm run build
# Should complete without environment variable errors
```

### 3. Debug Production Deployment
```bash
# Check build logs in Amplify Console for:
# - "Writing environment variables to .env.production..."
# - Output of cat .env.production showing all variables
```

### 4. Test API Endpoints
```bash
# Test health endpoint to verify variables are accessible
curl https://your-app.amplifyapp.com/api/health
```

## Common Error Patterns

### Build Succeeds, Runtime Fails
```json
{
  "environment": {
    "variables": {
      "DATABASE_URL": false,
      "STACK_SECRET_SERVER_KEY": false
    }
  }
}
```
**Solution**: Add environment variable injection to amplify.yml

### Missing Variables in Amplify Console
```bash
Error: Environment validation failed
Missing: NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
```
**Solution**: Add missing variables to Amplify Console

### Build Fails with Variable Injection
```bash
env: can't execute 'grep': No such file or directory
```
**Solution**: Verify grep syntax and variable names in amplify.yml

## Best Practices

### 1. Variable Naming
- Use descriptive names
- Follow NEXT_PUBLIC_ convention for client-side variables
- Use UPPERCASE for environment variables

### 2. Security
- Never commit `.env` files to git
- Use AWS Secrets Manager for highly sensitive data
- Rotate API keys regularly

### 3. Testing
- Test both build and runtime scenarios
- Implement health checks for environment variables
- Use graceful degradation for missing variables

### 4. Documentation
- Document all required environment variables
- Include setup instructions for new developers
- Maintain this guide for future deployments

## Quick Setup Checklist for New Projects

1. ✅ Set all environment variables in Amplify Console
2. ✅ Configure amplify.yml with env grep injection
3. ✅ Add debug output to verify variable injection
4. ✅ Test build locally
5. ✅ Deploy and verify runtime access
6. ✅ Test API endpoints to confirm functionality

## Example Environment Variables List

```bash
# Public (Client + Server)
NEXT_PUBLIC_STACK_PROJECT_ID=your_project_id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_client_key

# Private (Server only)
STACK_SECRET_SERVER_KEY=your_secret_key
DATABASE_URL=postgresql://...
BAWS_ACCESS_KEY_ID=your_aws_key
BAWS_SECRET_ACCESS_KEY=your_aws_secret
DEFAULT_REGION=ap-southeast-1
BEDROCK_REGION=us-east-1
MISTRAL_API_KEY=your_mistral_key
LLAMAINDEX_API_KEY=your_llamaindex_key
```

## Related AWS Documentation

- [Making environment variables accessible to server-side runtimes](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html)
- [Using environment variables in an Amplify application](https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html)
- [Accessing environment variables at build time](https://docs.aws.amazon.com/amplify/latest/userguide/access-env-vars.html)

---

**Last Updated**: September 2024
**Status**: ✅ Verified Working Solution