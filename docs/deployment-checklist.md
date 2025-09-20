# Deployment Checklist

## Pre-Deployment Requirements

### ✅ Environment Variables
Ensure all required environment variables are set in AWS Amplify:

```
NEXT_PUBLIC_STACK_PROJECT_ID=your_stack_project_id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_stack_publishable_key
STACK_SECRET_SERVER_KEY=your_stack_secret_key
DATABASE_URL=your_neon_postgresql_connection_string
BAWS_ACCESS_KEY_ID=your_aws_access_key_id
BAWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
DEFAULT_REGION=ap-southeast-1
BEDROCK_REGION=us-east-1
MISTRAL_API_KEY=your_mistral_api_key
LLAMAINDEX_API_KEY=your_llamaindex_api_key
```

### ✅ Build Configuration
- `amplify.yml` configured for Node.js 18+
- Build commands properly set
- Cache paths optimized

### ✅ Repository Setup
- GitHub repository connected to Amplify
- Main branch configured for auto-deployment
- GitHub Actions configured with secrets

## Deployment Steps

### 1. GitHub Repository Setup
```bash
git init
git add .
git commit -m "Initial commit: Chatbot starter project"
git remote add origin https://github.com/chemecosmeticsdev/chatbot-system.git
git push -u origin main
```

### 2. AWS Amplify Configuration
1. Connect repository to Amplify
2. Select `main` branch for production
3. Configure environment variables
4. Set build settings to use `amplify.yml`
5. Deploy

### 3. Post-Deployment Verification
1. Visit deployed URL
2. Run API integration tests
3. Verify all services are connected
4. Check authentication flow
5. Test CI/CD pipeline

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version (use 18+)
   - Verify all dependencies are in package.json
   - Check for TypeScript errors

2. **Environment Variable Issues**
   - Ensure all variables are set in Amplify console
   - Check for typos in variable names
   - Verify BAWS prefix is used for AWS variables

3. **API Connection Failures**
   - Verify API keys are valid
   - Check AWS IAM permissions
   - Ensure database is accessible

### Success Criteria
- ✅ All API tests pass
- ✅ Authentication system works
- ✅ Build completes successfully
- ✅ No console errors
- ✅ CI/CD pipeline passes

## Next Steps After Deployment

1. **Test All APIs**: Run comprehensive test suite
2. **Create SuperAdmin**: Setup initial admin user
3. **Monitor Performance**: Check Amplify metrics
4. **Plan Features**: Begin development of core features
5. **Setup Monitoring**: Configure error tracking

## Emergency Rollback

If deployment fails:
1. Revert to previous commit
2. Check Amplify build logs
3. Fix issues locally first
4. Test locally before redeploying

## Support

- GitHub Issues: For code-related problems
- AWS Support: For Amplify deployment issues
- API Documentation: Check individual service docs