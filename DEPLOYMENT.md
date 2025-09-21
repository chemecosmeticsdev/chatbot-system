# Deployment Guide - Chatbot Management System

## Overview

This guide provides comprehensive instructions for deploying the chatbot management system to various environments. The system includes advanced deployment validation, environment configuration, health monitoring, and automated deployment processes.

## Table of Contents

1. [Pre-Deployment Requirements](#pre-deployment-requirements)
2. [Environment Configuration](#environment-configuration)
3. [Deployment Validation](#deployment-validation)
4. [AWS Amplify Deployment](#aws-amplify-deployment)
5. [Manual Deployment](#manual-deployment)
6. [Health Monitoring](#health-monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Security Considerations](#security-considerations)
9. [Performance Optimization](#performance-optimization)

## Pre-Deployment Requirements

### Required Services

1. **Neon PostgreSQL Database**
   - PostgreSQL 15+ with pgvector extension
   - Connection string with pooling enabled
   - Database schema deployed

2. **Stack Auth Project**
   - Project created and configured
   - API keys generated
   - Proper redirect URLs configured

3. **AWS Account Setup**
   - IAM user with appropriate permissions
   - Bedrock access enabled (us-east-1)
   - S3 buckets for document storage
   - Access keys configured

4. **Sentry Project**
   - Error monitoring project created
   - DSN configured
   - Organization set up

5. **Optional Integrations**
   - OpenAI API key (if using OpenAI models)
   - Anthropic API key (if using Anthropic models)
   - Line OA credentials (if using Line integration)

### System Requirements

- Node.js 18+
- npm 9+
- Internet connectivity for external API calls
- Minimum 512MB RAM for build process
- 2GB+ storage for dependencies and builds

## Environment Configuration

### Step 1: Copy Environment Template

```bash
cp .env.example .env.local
```

### Step 2: Configure Core Variables

**Required Variables (Must be configured):**

```bash
# Stack Auth Configuration
NEXT_PUBLIC_STACK_PROJECT_ID=your_stack_project_id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_your_publishable_key
STACK_SECRET_SERVER_KEY=ssk_your_secret_server_key

# Database Configuration
DATABASE_URL=postgresql://username:password@hostname/database_name?sslmode=require

# AWS Configuration (BAWS prefix for Amplify)
BAWS_ACCESS_KEY_ID=your_aws_access_key_id
BAWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
DEFAULT_REGION=ap-southeast-1
BEDROCK_REGION=us-east-1

# OCR Services
MISTRAL_API_KEY=your_mistral_api_key
LLAMAINDEX_API_KEY=llx_your_llamaindex_api_key
```

**Production Security Variables:**

```bash
# Security Configuration
SESSION_SECRET=your_32_character_session_secret
API_KEY_ENCRYPTION_SECRET=your_32_character_encryption_secret
CORS_ALLOWED_ORIGINS=https://your-domain.com
API_RATE_LIMIT_REQUESTS=1000

# Production URLs
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NEXT_PUBLIC_API_URL=https://your-production-domain.com/api
```

**Optional Advanced Variables:**

```bash
# LLM Providers (Optional)
OPENAI_API_KEY=sk-your_openai_api_key
ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key

# Line Integration (Optional)
LINE_CHANNEL_ACCESS_TOKEN=your_line_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

# Sentry Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://your_sentry_dsn
SENTRY_ORG=chemecosmetics
SENTRY_PROJECT=chatbot-management

# Feature Flags
ENABLE_CHATBOT_MANAGEMENT=true
ENABLE_DOCUMENT_PROCESSING=true
ENABLE_VECTOR_SEARCH=true
ENABLE_LINE_INTEGRATION=false
ENABLE_REAL_TIME_CHAT=true
ENABLE_ANALYTICS_DASHBOARD=true
ENABLE_MULTI_LANGUAGE=true
```

### Step 3: Validate Environment

```bash
npm run validate:environment
```

This command will check all required environment variables and provide detailed feedback.

## Deployment Validation

### Quick Health Check

```bash
npm run health-check
```

### Comprehensive Validation

```bash
npm run validate:deployment
```

This runs a complete system validation including:
- Environment variables
- Database connectivity and schema
- AWS services (Bedrock, S3)
- Vector database operations
- LLM provider connectivity
- External integrations
- Security configuration
- Performance baselines

### Component-Specific Validation

```bash
# Validate specific components
npm run validate:database
npm run validate:aws
npm run validate:environment
```

### API Validation Endpoints

The system provides HTTP endpoints for validation:

- `GET /api/health` - Basic health check
- `GET /api/health?type=quick` - Quick system validation
- `GET /api/health?type=comprehensive&details=true` - Full validation with details
- `GET /api/validate` - Deployment validation endpoint
- `POST /api/validate` - Custom validation with specific components

## AWS Amplify Deployment

### Step 1: Connect Repository

1. Log into AWS Amplify Console
2. Click "New app" → "Host web app"
3. Connect your Git repository
4. Select main branch

### Step 2: Configure Environment Variables

In Amplify Console → App Settings → Environment Variables, add:

**Core Variables:**
- `NEXT_PUBLIC_STACK_PROJECT_ID`
- `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`
- `STACK_SECRET_SERVER_KEY`
- `DATABASE_URL`
- `BAWS_ACCESS_KEY_ID`
- `BAWS_SECRET_ACCESS_KEY`
- `DEFAULT_REGION`
- `BEDROCK_REGION`
- `MISTRAL_API_KEY`
- `LLAMAINDEX_API_KEY`

**Production Variables:**
- `NEXT_PUBLIC_APP_URL` (e.g., `https://main.d1234567890123.amplifyapp.com`)
- `NEXT_PUBLIC_API_URL` (e.g., `https://main.d1234567890123.amplifyapp.com/api`)
- `SESSION_SECRET`
- `API_KEY_ENCRYPTION_SECRET`
- `CORS_ALLOWED_ORIGINS`

**Optional Variables:**
Add any optional variables as needed for your configuration.

### Step 3: Configure Build Settings

The `amplify.yml` file is pre-configured with:
- Environment validation
- Comprehensive build process
- Post-build health checks
- Deployment verification

### Step 4: Deploy

1. Click "Save and deploy"
2. Monitor build logs for any issues
3. Access deployment URL once complete

### Step 5: Post-Deployment Verification

```bash
# Test deployed application
curl https://your-app-url.amplifyapp.com/api/health?type=comprehensive
```

## Manual Deployment

### Step 1: Install Dependencies

```bash
npm ci
```

### Step 2: Validate Environment

```bash
npm run setup-env
npm run validate:deployment
```

### Step 3: Build Application

```bash
npm run build
```

### Step 4: Start Production Server

```bash
npm run start
```

### Step 5: Verify Deployment

```bash
# Check health
curl http://localhost:3000/api/health

# Run comprehensive validation
curl http://localhost:3000/api/validate
```

## Health Monitoring

### Health Check Endpoints

**Basic Health Check:**
```bash
curl https://your-domain.com/api/health
```

**Quick Validation:**
```bash
curl https://your-domain.com/api/health?type=quick
```

**Comprehensive Health Check:**
```bash
curl https://your-domain.com/api/health?type=comprehensive&details=true
```

### Monitoring Integration

The system automatically integrates with:

1. **Sentry Error Tracking**
   - Real-time error monitoring
   - Performance tracking
   - Custom deployment validation alerts

2. **Health Check Logging**
   - Automated health check execution
   - Performance baseline tracking
   - Issue detection and alerting

3. **Deployment Validation Reports**
   - Comprehensive validation scoring
   - Critical issue identification
   - Performance recommendations

### Setting Up Monitoring Alerts

1. **Sentry Alerts:**
   - Configure alert rules for critical errors
   - Set up deployment validation notifications
   - Monitor performance degradation

2. **Health Check Automation:**
   - Set up external monitoring (Pingdom, Datadog, etc.)
   - Configure alerts for health check failures
   - Monitor response times and availability

## Troubleshooting

### Common Deployment Issues

**Environment Variable Missing:**
```bash
# Check specific variable
npm run validate:environment

# Check all variables
cat .env.production | grep -v "^#" | sort
```

**Database Connection Issues:**
```bash
# Test database connectivity
npm run validate:database

# Check database configuration
node -e "console.log(require('./lib/config').getConfig().DATABASE_URL.substring(0, 50) + '...')"
```

**AWS Services Connectivity:**
```bash
# Test AWS services
npm run validate:aws

# Check AWS configuration
aws configure list  # If AWS CLI is installed
```

**Build Failures:**
```bash
# Check TypeScript errors
npm run type-check

# Check linting issues
npm run lint

# Validate build process
npm run validate:build
```

### Error Investigation

1. **Check Sentry for Detailed Errors:**
   - Visit Sentry dashboard
   - Check deployment validation errors
   - Review stack traces and context

2. **Use Health Check Endpoints:**
   ```bash
   # Get detailed health information
   curl https://your-domain.com/api/health?type=comprehensive&details=true | jq '.'
   ```

3. **Review Application Logs:**
   - Check Amplify build logs
   - Review server-side logs
   - Monitor real-time application logs

### Performance Issues

1. **Database Performance:**
   ```bash
   # Check database query performance
   npm run validate:database
   ```

2. **AWS Services Latency:**
   ```bash
   # Check AWS service response times
   npm run validate:aws
   ```

3. **Overall System Performance:**
   ```bash
   # Run performance validation
   curl https://your-domain.com/api/validate?format=summary
   ```

## Security Considerations

### Production Security Checklist

- [ ] All environment variables are properly secured
- [ ] HTTPS is enforced (`FORCE_HTTPS=true`)
- [ ] Secure cookies are enabled (`COOKIE_SECURE=true`)
- [ ] CORS is properly configured
- [ ] API rate limiting is enabled
- [ ] Session secrets are strong (32+ characters)
- [ ] API keys are encrypted
- [ ] Database connections use SSL
- [ ] Sentry is configured for error tracking

### Security Validation

```bash
# Check security configuration
curl https://your-domain.com/api/validate | jq '.security'
```

### Regular Security Tasks

1. **Rotate API Keys Regularly:**
   - Update AWS credentials
   - Rotate session secrets
   - Update third-party API keys

2. **Monitor Security Alerts:**
   - Check Sentry for security issues
   - Monitor failed authentication attempts
   - Review access logs

3. **Update Dependencies:**
   ```bash
   npm audit
   npm update
   ```

## Performance Optimization

### Build Optimization

1. **Enable Production Optimizations:**
   ```bash
   NODE_ENV=production
   NEXT_TELEMETRY_DISABLED=1
   ANALYZE_BUNDLE=false
   ```

2. **Database Optimization:**
   - Use connection pooling
   - Optimize vector search indexes
   - Monitor query performance

3. **CDN Configuration:**
   - Enable Amplify CDN
   - Configure caching headers
   - Optimize static asset delivery

### Performance Monitoring

```bash
# Check performance metrics
curl https://your-domain.com/api/health?type=comprehensive | jq '.performance'
```

### Scaling Considerations

1. **Database Scaling:**
   - Monitor connection pool usage
   - Consider read replicas for heavy read workloads
   - Optimize vector database performance

2. **Application Scaling:**
   - Monitor memory usage
   - Configure auto-scaling in Amplify
   - Optimize resource allocation

3. **Cost Optimization:**
   - Monitor LLM API usage
   - Optimize model selection
   - Configure cost alerts

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Environment validation passes
- [ ] Database schema is up to date
- [ ] AWS services are configured
- [ ] Security settings are production-ready
- [ ] Performance baselines established

### During Deployment

- [ ] Build process completes successfully
- [ ] Health checks pass
- [ ] All services are accessible
- [ ] Error monitoring is active
- [ ] Performance metrics are collected

### Post-Deployment

- [ ] Comprehensive validation passes
- [ ] All features are functional
- [ ] Monitoring alerts are configured
- [ ] Performance is within expected ranges
- [ ] Documentation is updated
- [ ] Team is notified of deployment

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly:**
   - Check health metrics
   - Review error reports
   - Monitor performance trends

2. **Monthly:**
   - Update dependencies
   - Review security configurations
   - Optimize performance

3. **Quarterly:**
   - Rotate API keys
   - Review and update documentation
   - Conduct security audits

### Getting Help

- Check the troubleshooting section above
- Review Sentry error reports
- Consult the comprehensive health check endpoints
- Review deployment validation reports

For additional support, ensure all diagnostic information is available:
- Health check results
- Sentry error reports
- Environment configuration (with sensitive data masked)
- Deployment validation reports