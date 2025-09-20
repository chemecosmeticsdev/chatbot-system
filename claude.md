# Claude Code Configuration

## Project Overview
Knowledge base and chatbot management system starter project for Thai/English markets. This configuration provides comprehensive guidance for Claude Code to efficiently develop, test, and deploy the system.

## MCP Server Configuration

### Required MCP Servers
- **context7**: Library documentation and examples
- **shadcn**: UI component management (for future development)
- **neon**: Database operations and auth
- **puppeteer-mcp-claude**: Browser automation for testing
- **playwright**: Visual testing and layout validation
- **aws-powertools**: Serverless best practices

## Custom Commands

### /test-all
Run comprehensive API integration test suite
```bash
npm run test:api
```

### /deploy-check
Validate deployment readiness
```bash
npm run build && npm run setup-env
```

### /setup-project
Initialize from starter template
```bash
npm ci && npm run setup-env && npm run dev
```

### /i18n-check
Validate Thai/English localization (for future implementation)

### /security-audit
Run security checks on authentication flows

## Development Workflow

### 1. Environment Setup
- Validate all environment variables using `lib/config.ts`
- Use BAWS prefix for AWS variables (Amplify requirement)
- Test all API connections before development

### 2. Testing Strategy
- **API Testing Priority**: Database → Auth → AWS → OCR services
- **Visual Testing**: Use Playwright for layout validation
- **Integration Testing**: Comprehensive test suite via `/api/test-all`

### 3. Development Commands
```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint check
npm run type-check   # TypeScript validation
npm run test:api     # API integration tests
```

## Project Structure

```
app/
├── api/                     # API routes
│   ├── test-*/             # Service test endpoints
│   ├── test-all/           # Comprehensive test runner
│   └── test-auth/          # Neon Auth testing
├── components/             # React components
│   └── ApiTestDashboard.tsx # Main test interface
├── handler/                # Stack Auth handlers
└── page.tsx               # Main dashboard

lib/
├── config.ts              # Environment validation
├── neon.ts                # Database connections
└── aws.ts                 # AWS service clients

scripts/
├── test-apis.js           # CI/CD test runner
└── setup-env.js          # Environment validation
```

## API Integration Status

The starter project validates these services:

### ✅ Database (Neon PostgreSQL)
- Connection testing
- Table operations
- Vector database ready

### ✅ Authentication (Neon Auth/Stack Auth)
- User management
- JWT validation
- SuperAdmin support ready

### ✅ AWS Services
- **Bedrock**: Titan embeddings (us-east-1)
- **S3**: Document storage (ap-southeast-1)
- **IAM**: Proper permissions configured

### ✅ OCR Services
- **Mistral OCR**: Document processing API
- **LlamaIndex**: Alternative OCR solution

## CI/CD Pipeline

### GitHub Actions Workflow
1. **Code Quality**: Lint + Type check
2. **Build Test**: Production build validation
3. **API Integration**: Live service testing
4. **Deployment**: Automatic Amplify deployment

### Branch Strategy
- `main`: Production-ready code
- `develop`: Development integration
- `feature/*`: Feature development

## Deployment Configuration

### AWS Amplify
- **Build**: `amplify.yml` configuration
- **Environment**: All variables properly configured
- **Auto-deploy**: On push to main branch

### Required Environment Variables
```
NEXT_PUBLIC_STACK_PROJECT_ID=your_stack_project_id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_stack_publishable_key
STACK_SECRET_SERVER_KEY=your_stack_secret_key
DATABASE_URL=your_neon_postgresql_connection_string
BAWS_ACCESS_KEY_ID=your_aws_access_key
BAWS_SECRET_ACCESS_KEY=your_aws_secret_key
DEFAULT_REGION=ap-southeast-1
BEDROCK_REGION=us-east-1
MISTRAL_API_KEY=your_mistral_api_key
LLAMAINDEX_API_KEY=your_llamaindex_api_key
```

## Development Best Practices

### 1. Code Quality
- **TypeScript**: Full type safety
- **ESLint**: Code quality enforcement
- **Prettier**: Consistent formatting

### 2. Testing Approach
- Test individual APIs before integration
- Use visual feedback for layout changes
- Validate environment before deployment

### 3. Security Practices
- Environment variable validation
- Secure API key handling
- Authentication flow testing

## Future Development Path

### Phase 1: Core Enhancement
- Add Shadcn/ui components
- Implement i18n (Thai/English)
- Enhanced error handling with Sentry

### Phase 2: Feature Development
- Chatbot management interface
- Document processing pipeline
- RAG implementation with Langchain

### Phase 3: Production Ready
- Performance optimization
- Advanced monitoring
- Scaling considerations

## Debugging and Monitoring

### Error Tracking
- Console logs for development
- API test results documentation
- GitHub Actions logs for CI/CD

### Performance Monitoring
- API response times
- Build performance
- Deployment metrics

## Commands Reference

### Development
```bash
npm run dev          # Start development
npm run build        # Build project
npm run start        # Start production
```

### Testing
```bash
npm run test:api     # API integration tests
npm run lint         # Code quality
npm run type-check   # Type validation
```

### Deployment
```bash
npm run setup-env    # Environment validation
git push origin main # Trigger deployment
```

This configuration ensures Claude Code can efficiently work with the starter project and scale it into a full-featured application.