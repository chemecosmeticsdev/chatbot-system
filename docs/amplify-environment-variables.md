# AWS Amplify Environment Variables Configuration

## Required Environment Variables for Deployment

Copy and paste these environment variables into your AWS Amplify console:

### 🔐 Authentication & Database
```
NEXT_PUBLIC_STACK_PROJECT_ID=your_stack_project_id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_stack_publishable_key
STACK_SECRET_SERVER_KEY=your_stack_secret_key
DATABASE_URL=your_neon_postgresql_connection_string
```

### ☁️ AWS Services (BAWS prefix required for Amplify)
```
BAWS_ACCESS_KEY_ID=your_aws_access_key_id
BAWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
DEFAULT_REGION=ap-southeast-1
BEDROCK_REGION=us-east-1
```

### 🤖 Third-party APIs
```
MISTRAL_API_KEY=your_mistral_api_key
LLAMAINDEX_API_KEY=your_llamaindex_api_key
```

### 🐛 Error Tracking (Update with real Sentry DSN)
```
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn-here@sentry.io/project-id
```

## Step-by-Step Amplify Setup

### 1. Connect Repository
1. Go to AWS Amplify Console
2. Click "Create new app" → "Host web app"
3. Connect to GitHub repository: `chemecosmeticsdev/chatbot-system`
4. Select branch: `main`

### 2. Build Settings
- **Build command**: Use default (configured in `amplify.yml`)
- **Output directory**: `.next`
- **Node.js version**: 18.x or later

### 3. Environment Variables
1. Go to "Environment variables" in Amplify console
2. Add each variable from the sections above
3. ⚠️ **Important**: Use the exact variable names with BAWS prefix for AWS

### 4. Deploy
1. Click "Save and deploy"
2. Monitor build process
3. Test deployment URL after build completes

## Build Configuration Details

The project includes an `amplify.yml` file with optimized build settings:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
        - node scripts/setup-env.js
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

## Post-Deployment Validation

After successful deployment:

1. **Visit the deployed URL**
2. **Run API tests**: Click "Run All Tests" on the main dashboard
3. **Check individual services**: Test each service individually
4. **Verify authentication**: Go to `/admin` and test sign-in flow
5. **Test demo page**: Visit `/demo` for comprehensive testing

## Expected Results

### ✅ Should Work
- **Neon PostgreSQL**: Database connection and operations
- **Neon Auth**: Authentication system
- **AWS Bedrock**: Embeddings generation
- **Mistral OCR**: Document processing
- **Main Dashboard**: All UI components

### ⚠️ Known Issues (Expected)
- **S3 Storage**: Will fail (bucket needs to be created)
- **LlamaIndex**: May fail (DNS/network issue)

### 📊 Success Criteria
- **Build**: Completes without errors
- **UI**: Dashboard loads correctly
- **APIs**: At least 4/6 services operational
- **Auth**: Sign-in/sign-up flows work

## Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check in Amplify build logs:
- Node.js version (should be 18+)
- NPM install success
- TypeScript compilation
- Environment variable availability
```

#### 2. Runtime Errors
```bash
# Check in browser console:
- Environment variable loading
- API endpoint accessibility
- Authentication configuration
```

#### 3. API Connection Issues
```bash
# Verify in network tab:
- CORS configuration
- Environment variable values
- API endpoint responses
```

### Support Resources
- **Build Logs**: Available in Amplify console
- **Application Logs**: CloudWatch logs
- **Test Dashboard**: Real-time API status at `/`
- **Demo Page**: Comprehensive testing at `/demo`

## Security Notes

⚠️ **Important Security Considerations**:

1. **Never commit credentials to Git**: All sensitive data is in environment variables
2. **BAWS prefix**: Required for AWS variables in Amplify
3. **Environment-specific values**: Update Sentry DSN for production
4. **Access control**: Limit AWS IAM permissions to required services only

## Next Steps After Deployment

1. **Create S3 bucket** for document storage
2. **Set up real Sentry project** for error tracking
3. **Test authentication flow** with real users
4. **Configure DNS** if using custom domain
5. **Set up monitoring** and alerts
6. **Plan feature development** roadmap

---

*Last Updated: ${new Date().toISOString()}*
*Repository: chemecosmeticsdev/chatbot-system*