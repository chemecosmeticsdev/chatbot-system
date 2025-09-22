# Build & Deployment Guide for AWS Amplify

This guide documents common build errors encountered during AWS Amplify deployment and provides solutions to prevent them in future development.

## 🚨 Common Build Errors & Solutions

### 1. Missing AWS SDK Dependencies

#### **Error**
```
Cannot find module '@aws-sdk/s3-request-presigner' or its corresponding type declarations
```

#### **Root Cause**
Using AWS SDK modules without installing the specific packages. The AWS SDK v3 is modular - each service requires its own package.

#### **Solution**
```bash
npm install @aws-sdk/s3-request-presigner
npm install @aws-sdk/client-bedrock-runtime
npm install @aws-sdk/client-s3
```

#### **Prevention**
- Always check package.json when adding new AWS SDK imports
- Use the AWS SDK v3 documentation to identify required packages
- Test imports locally before committing

### 2. Dynamic Import Issues in Production

#### **Error**
```
Build fails with dynamic import of AWS SDK modules
```

#### **Root Cause**
Dynamic imports (`await import()`) can cause issues in Next.js production builds, especially with AWS SDK modules.

#### **Solution**
Replace dynamic imports with top-level imports:

**❌ Problematic:**
```typescript
const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
const { PutObjectCommand } = await import('@aws-sdk/client-s3');
```

**✅ Correct:**
```typescript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
```

#### **Prevention**
- Prefer top-level imports for AWS SDK modules
- Only use dynamic imports for code splitting, not for external dependencies
- Test production builds locally with `npm run build`

### 3. TypeScript Type Errors

#### **Error**
```
Property 'document_title' does not exist on type 'DocumentChunk'
```

#### **Root Cause**
Missing type definitions when extending interfaces or returning enriched data from database queries.

#### **Solution**
Properly type function returns with extended interfaces:

**❌ Problematic:**
```typescript
async searchSimilarChunks(): Promise<Array<DocumentChunk & { similarity: number }>>
```

**✅ Correct:**
```typescript
async searchSimilarChunks(): Promise<Array<DocumentChunk & {
  similarity: number;
  document_title?: string;
  filename?: string;
}>>
```

#### **Prevention**
- Always type database query results that include JOINed data
- Use TypeScript strict mode to catch missing properties early
- Run `npm run type-check` before committing

### 4. ESLint Code Quality Issues

#### **Common Warnings**
```
Warning: 'attachments' is never reassigned. Use 'const' instead. prefer-const
Warning: Assign object to a variable before exporting as module default
```

#### **Solutions**

**Variable Declaration:**
```typescript
// ❌ Problematic
let attachments: any[] = [];

// ✅ Correct
const attachments: any[] = [];
```

**Default Exports:**
```typescript
// ❌ Problematic
export default {
  key: 'value'
};

// ✅ Correct
const config = {
  key: 'value'
};
export default config;
```

#### **Prevention**
- Use ESLint auto-fix: `npx eslint --fix .`
- Configure VS Code to show ESLint warnings
- Run `npm run lint` before committing

## 🔧 Pre-Deployment Checklist

### Before Committing Code

```bash
# 1. Install dependencies
npm ci

# 2. Type checking
npm run type-check

# 3. Linting
npm run lint

# 4. Build test
npm run build

# 5. Run tests
npm run test:api
```

### AWS Amplify Specific Checks

1. **Environment Variables**
   - Verify all required environment variables are set in Amplify Console
   - Use BAWS_ prefix for AWS credentials (Amplify requirement)

2. **Build Settings**
   - Ensure `amplify.yml` has correct Node.js version
   - Verify build commands match package.json scripts

3. **Dependencies**
   - Check for missing dependencies in package.json
   - Ensure all AWS SDK modules are properly installed
   - Verify peer dependencies are satisfied

## 🚀 AWS Amplify Build Configuration

### Recommended amplify.yml
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
        - npm run type-check
    build:
      commands:
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

### Environment Variables Required
```bash
# Stack Auth
NEXT_PUBLIC_STACK_PROJECT_ID=
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=
STACK_SECRET_SERVER_KEY=

# Database
DATABASE_URL=

# AWS (use BAWS prefix for Amplify)
BAWS_ACCESS_KEY_ID=
BAWS_SECRET_ACCESS_KEY=
DEFAULT_REGION=ap-southeast-1
BEDROCK_REGION=us-east-1
S3_BUCKET_NAME=

# OCR Services
MISTRAL_API_KEY=
LLAMAINDEX_API_KEY=
```

## 🐛 Debugging Build Failures

### 1. Local Reproduction
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Test build locally
npm run build
```

### 2. Amplify Console Logs
- Check "Build details" in Amplify Console
- Look for the specific error in the build logs
- Check if it's in preBuild, build, or postBuild phase

### 3. Common Fix Patterns
- **Missing dependencies**: Add to package.json and reinstall
- **Environment variables**: Verify in Amplify Console settings
- **Import errors**: Check file paths and module names
- **Type errors**: Run type-check locally and fix all issues

## 📝 Development Best Practices

### 1. Always Test Builds Locally
```bash
# Before pushing to any branch
npm run ci:local
```

### 2. Use Proper Import Patterns
- Top-level imports for dependencies
- Dynamic imports only for code splitting
- Absolute imports with @ alias for internal modules

### 3. Type Safety First
- Enable TypeScript strict mode
- Type all function parameters and returns
- Use proper interfaces for database models

### 4. Commit Hygiene
- Run linting and type checking before commits
- Use meaningful commit messages
- Test builds before pushing to main branches

## 🔗 Related Documentation

- [AWS Amplify Hosting Guide](https://docs.aws.amazon.com/amplify/latest/userguide/getting-started.html)
- [Next.js Build Configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js)
- [AWS SDK v3 Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [TypeScript Configuration](https://www.typescriptlang.org/docs/)

---

**Last Updated**: 2025-09-22
**Maintainer**: Claude Code Assistant