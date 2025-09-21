# Claude Code Configuration

## Project Overview
**UPDATED**: Comprehensive knowledge base and chatbot management system for Thai/English markets. Evolved from starter project to full-featured platform with document processing, vector search, multi-instance chatbot management, Line OA integration, and advanced analytics. This configuration provides comprehensive guidance for Claude Code to efficiently develop, test, and deploy the complete system.

### New System Capabilities
- **Knowledge Base Management**: Document upload, OCR processing, vector embeddings, hierarchical product-document relationships
- **Multi-Instance Chatbot Management**: Create, configure, and deploy multiple chatbot instances with different LLM models and knowledge scopes
- **Admin Feedback System**: Natural language feedback processing with automated system prompt improvements
- **Integration Platform**: Line OA Message API, iframe embeds, JavaScript widgets
- **Analytics Dashboard**: Conversation tracking, performance monitoring, cost analysis, user engagement metrics
- **Professional UI**: Shadcn/ui components with Thai/English internationalization

## MCP Server Configuration

### Required MCP Servers
- **context7**: Library documentation and examples
- **shadcn**: UI component management (ACTIVE - for dashboard components)
- **neon**: Database operations and auth (EXTENDED - vector operations, chatbot management)
- **sentry**: Error monitoring and debugging integration (ENHANCED - chatbot-specific tracking)
- **puppeteer-mcp-claude**: Browser automation for testing
- **playwright**: Visual testing and layout validation (EXTENDED - dashboard testing)
- **aws-powertools**: Serverless best practices (EXTENDED - LLM integration)

## Subagents Configuration

### Core Development Subagents

#### /agents/document-processor
**Purpose**: Handle file uploads, OCR processing, and document chunking
**Tools**: Neon MCP, AWS Powertools, Context7, Read, Write, Edit
**Triggers**: Document upload requests, OCR tasks, chunking operations
**Outputs**: Processed documents, extracted text, chunk metadata, processing status
**Usage**: `Use document-processor subagent to handle file upload and OCR processing for [file_type]`

#### /agents/rag-developer
**Purpose**: Develop and test RAG pipeline components and vector operations
**Tools**: Neon MCP, AWS Powertools, Context7, Bash
**Triggers**: Vector operations, embedding tasks, retrieval testing, similarity searches
**Outputs**: RAG configurations, performance metrics, test results, optimization recommendations
**Usage**: `Use rag-developer subagent to optimize vector search performance for [use_case]`

#### /agents/ui-designer
**Purpose**: Create and maintain UI components using Shadcn/ui best practices
**Tools**: Shadcn MCP, Playwright, Context7, Read, Write, Edit
**Triggers**: Component creation, UI testing, design updates, responsive design issues
**Outputs**: React components, styling updates, visual test results, design documentation
**Usage**: `Use ui-designer subagent to create [component_name] with [requirements]`

#### /agents/i18n-manager
**Purpose**: Manage translations and localization workflows for Thai/English
**Tools**: Read, Write, Edit, Grep, Glob
**Triggers**: New text additions, translation updates, locale validation, missing keys
**Outputs**: Translation files, i18n reports, locale configurations, validation results
**Usage**: `Use i18n-manager subagent to add translations for [feature] in Thai and English`

#### /agents/vector-db-admin
**Purpose**: Database operations, migrations, and vector performance management
**Tools**: Neon MCP, Read, Write, Bash
**Triggers**: Schema changes, vector operations, performance issues, migration needs
**Outputs**: Database migrations, performance reports, optimization recommendations, health checks
**Usage**: `Use vector-db-admin subagent to optimize database performance for [operation]`

#### /agents/chatbot-trainer
**Purpose**: Configure and train chatbot instances with different LLM models
**Tools**: Neon MCP, AWS Powertools, Context7
**Triggers**: Chatbot creation, training data updates, model configuration, deployment
**Outputs**: Chatbot configurations, training reports, deployment status, performance metrics
**Usage**: `Use chatbot-trainer subagent to configure chatbot with [model] for [use_case]`

#### /agents/performance-optimizer
**Purpose**: Monitor and optimize system performance across all components
**Tools**: Neon MCP, AWS Powertools, Playwright, Bash
**Triggers**: Performance degradation, resource usage spikes, slow queries
**Outputs**: Performance reports, optimization recommendations, bottleneck analysis
**Usage**: `Use performance-optimizer subagent to analyze and fix performance issues in [component]`

## Custom Commands

### Core Development Commands

#### /test-all
Run comprehensive API integration test suite
```bash
npm run test:api
```

#### /deploy-check
Validate deployment readiness
```bash
npm run build && npm run setup-env
```

#### /setup-project
Initialize from starter template
```bash
npm ci && npm run setup-env && npm run dev
```

#### /setup-shadcn
Initialize Shadcn/ui component system with proper configuration
- Sets up components.json with custom theme
- Installs required dependencies
- Configures Tailwind integration
- Creates base component structure

#### /create-component [name] [type]
Generate new UI component with tests and documentation
- Creates component file with TypeScript
- Generates Storybook stories
- Adds unit tests with Jest/Testing Library
- Updates component index exports
- **Example**: `/create-component UserCard interactive`

#### /test-rag [query]
Test RAG pipeline with sample query and performance metrics
- Executes vector similarity search
- Measures response time and accuracy
- Tests different retrieval strategies
- Validates embedding quality
- **Example**: `/test-rag "How to setup authentication?"`

#### /optimize-vectors
Analyze and optimize vector database performance
- Checks index performance
- Analyzes query patterns
- Suggests optimization strategies
- Updates vector indexes if needed
- Provides performance benchmarks

#### /deploy-chatbot [name] [environment]
Deploy chatbot to specified environment with validation
- Validates chatbot configuration
- Tests model connectivity
- Deploys to target environment
- Runs post-deployment health checks
- **Example**: `/deploy-chatbot customer-support production`

#### /analyze-performance [component]
Run comprehensive performance analysis on system component
- Measures response times and throughput
- Analyzes memory and CPU usage
- Identifies bottlenecks and optimization opportunities
- Generates performance reports
- **Example**: `/analyze-performance vector-search`

#### /generate-migration [description]
Create database migration file with proper naming and structure
- Generates migration with timestamp
- Includes rollback functionality
- Validates migration syntax
- Updates migration tracking
- **Example**: `/generate-migration "Add chatbot_settings table"`

#### /test-i18n [locale]
Validate translations and localization for specified locale
- Checks for missing translation keys
- Validates translation completeness
- Tests locale-specific formatting
- Verifies cultural adaptations
- **Example**: `/test-i18n th`

#### /debug-vector [operation]
Debug vector database operations with detailed logging
- Traces vector operations step-by-step
- Analyzes embedding quality
- Tests similarity calculations
- Provides debugging insights
- **Example**: `/debug-vector similarity-search`

#### /benchmark-rag [queries]
Benchmark RAG performance with test queries and generate reports
- Tests multiple query types
- Measures accuracy and relevance
- Compares different models
- Generates performance benchmarks
- **Example**: `/benchmark-rag "auth,database,setup"`

### NEW: Chatbot Management Commands

#### /create-chatbot [name] [model] [purpose]
Create new chatbot instance with optimized configuration
- Sets up database entry with proper schema
- Configures LLM model and parameters
- Creates default system prompt based on purpose
- Assigns knowledge base filters
- **Example**: `/create-chatbot "Customer Support" claude-3-haiku "customer service"`

#### /assign-knowledge [chatbot_id] [product_categories]
Assign knowledge base content to specific chatbot instance
- Links products and documents to chatbot
- Updates vector search filters
- Tests retrieval effectiveness
- Validates knowledge scope
- **Example**: `/assign-knowledge "uuid-123" "electronics,software"`

#### /process-feedback [chatbot_id] [feedback_text]
Process admin feedback and generate system prompt improvements
- Analyzes feedback using LLM
- Generates prompt modification suggestions
- A/B tests proposed changes
- Tracks improvement impact
- **Example**: `/process-feedback "uuid-123" "Responses are too technical for customers"`

#### /test-integration [chatbot_id] [platform]
Test chatbot integration with external platforms
- Validates API credentials and connectivity
- Tests message flow (send/receive)
- Verifies webhook functionality
- Checks error handling
- **Example**: `/test-integration "uuid-123" "line-oa"`

#### /generate-embed [chatbot_id] [type]
Generate integration embed codes for websites
- Creates iframe or JavaScript widget code
- Configures appearance and behavior
- Sets security restrictions
- Provides installation documentation
- **Example**: `/generate-embed "uuid-123" "widget"`

#### /analyze-conversations [chatbot_id] [period]
Analyze conversation patterns and performance metrics
- Extracts common query patterns
- Measures response effectiveness
- Identifies improvement opportunities
- Generates insights reports
- **Example**: `/analyze-conversations "uuid-123" "7d"`

### Quality Assurance Commands

#### /audit-security
Run comprehensive security audit across the application
- Scans for security vulnerabilities
- Checks authentication flows
- Validates input sanitization
- Tests authorization controls

#### /validate-apis
Test all API endpoints with comprehensive integration tests
- Validates API responses and error handling
- Tests authentication and authorization
- Checks rate limiting and security
- Verifies database operations

#### /check-dependencies
Audit package dependencies for vulnerabilities and updates
- Scans for known security vulnerabilities
- Checks for outdated packages
- Suggests safe update paths
- Validates license compatibility

#### /test-visual
Run visual regression tests with Playwright for UI consistency
- Captures screenshots of all components
- Compares against baseline images
- Tests responsive design breakpoints
- Validates cross-browser compatibility

#### /performance-test [endpoint]
Load test specific API endpoint with realistic traffic patterns
- Simulates concurrent user load
- Measures response times under stress
- Identifies performance bottlenecks
- Tests auto-scaling behavior
- **Example**: `/performance-test /api/vector-search`

#### /db-health-check
Comprehensive database health and consistency check
- Validates data integrity
- Checks vector index performance
- Analyzes query performance
- Tests backup and recovery procedures

#### /i18n-check
Validate Thai/English localization (comprehensive implementation)
- Checks translation completeness
- Validates Thai text rendering
- Tests language switching functionality
- Verifies cultural adaptations

#### /security-audit
Run security checks on authentication flows and data protection
- Tests authentication bypass attempts
- Validates data encryption
- Checks for injection vulnerabilities
- Tests authorization edge cases

## Development Hooks

### Pre-commit Hooks
Automated quality checks before code commits to ensure code quality and prevent issues:

- **TypeScript Compilation**: Verify all TypeScript files compile without errors
- **ESLint Validation**: Enforce code quality standards and catch potential bugs
- **Prettier Formatting**: Ensure consistent code formatting across the project
- **API Integration Tests**: Run subset of critical API tests for core functionality
- **i18n Key Validation**: Check for missing translation keys and validate structure
- **Vector Database Schema**: Validate database schema changes and migrations
- **Sentry Configuration**: Verify error tracking configuration is valid
- **Security Scan**: Basic security vulnerability checks on changed files

### Pre-push Hooks
Comprehensive testing before pushing to remote repository:

- **Full Test Suite**: Execute complete test suite including unit, integration, and E2E tests
- **Build Validation**: Ensure production build completes successfully
- **Performance Regression**: Test critical paths for performance degradation
- **Database Migration Validation**: Verify all pending migrations are valid and safe
- **Security Vulnerability Scan**: Comprehensive security audit of dependencies
- **Documentation Updates**: Check for required documentation updates
- **API Backward Compatibility**: Ensure API changes don't break existing clients
- **Vector Index Consistency**: Validate vector database indexes are consistent

### Post-deploy Hooks
Automated verification after successful deployment:

- **Integration Test Execution**: Run full integration test suite against deployed environment
- **Performance Baseline Comparison**: Compare performance metrics against established baselines
- **Error Rate Monitoring Setup**: Initialize error tracking and alerting for new deployment
- **Vector Database Consistency Verification**: Ensure vector operations work correctly in production
- **Chatbot Health Checks**: Validate all chatbot instances are responding correctly
- **User Acceptance Test Triggers**: Automatically trigger UAT workflows for stakeholders
- **Cost Monitoring Activation**: Initialize cost tracking for new features and services
- **Backup Verification**: Ensure backup systems are functioning correctly

### Error Handling Hooks
Automated response to system errors and failures:

- **Auto-create Sentry Issues**: Automatically generate detailed Sentry issues with full context
- **GitHub Issue Creation**: Create GitHub issues for critical errors with debugging information
- **Team Notifications**: Send Slack/Discord notifications with error severity and context
- **Performance Degradation Alerts**: Trigger alerts when performance degrades beyond thresholds
- **Database Connection Recovery**: Attempt automatic recovery for database connection failures
- **Automatic Rollback Triggers**: Initiate rollback procedures for critical system failures
- **User Impact Assessment**: Analyze and report user impact of system errors
- **Escalation Procedures**: Automatically escalate critical issues to on-call personnel

## Development Workflow

### 1. Environment Setup
- Validate all environment variables using `lib/config.ts`
- Use BAWS prefix for AWS variables (Amplify requirement)
- Test all API connections before development

### 2. Enhanced Testing Strategy

#### API Testing Framework
- **Priority Order**: Database → Auth → AWS → OCR → Vector Operations → RAG Pipeline
- **Test Types**: Unit, Integration, Performance, Security, Load testing
- **Automation**: Continuous testing with GitHub Actions
- **Coverage**: 90%+ code coverage requirement for critical paths
- **Documentation**: Auto-generated API documentation from tests

#### Visual Testing with Playwright
- **Component Testing**: Screenshot comparison for all UI components
- **Cross-browser Testing**: Chrome, Firefox, Safari, Edge compatibility
- **Responsive Testing**: Mobile, tablet, desktop viewport validation
- **Accessibility Testing**: WCAG 2.1 AA compliance verification
- **Performance Testing**: Core Web Vitals measurement and optimization
- **i18n Testing**: Layout validation for Thai and English text

#### Vector Database Testing
- **Embedding Quality**: Validate embedding generation accuracy and consistency
- **Similarity Search**: Test various search strategies and relevance scoring
- **Performance Testing**: Query response time and throughput benchmarking
- **Consistency Testing**: Verify data integrity across operations
- **Concurrent Access**: Test multiple user scenarios and race conditions
- **Migration Testing**: Validate schema changes and data preservation

#### RAG Pipeline Testing
- **End-to-End Testing**: Complete query-to-response workflow validation
- **Model Comparison**: A/B testing different LLM models for performance
- **Retrieval Testing**: Various retrieval strategies and accuracy measurement
- **Context Testing**: Validate context window management and relevance
- **Cost Testing**: Monitor and optimize token usage and API costs
- **Multilingual Testing**: Thai and English query processing validation

#### Integration Testing Suite
- **Service Integration**: Test all external service connections (AWS, Neon, OCR)
- **Authentication Flow**: Complete user journey from signup to usage
- **Document Processing**: File upload, OCR, chunking, and embedding pipeline
- **Chatbot Workflows**: Creation, configuration, training, and deployment
- **Error Scenarios**: Graceful handling of failures and edge cases
- **Performance Monitoring**: Real-time metrics collection and analysis

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
```bash
# Stack Auth Configuration (get from Stack Auth dashboard)
NEXT_PUBLIC_STACK_PROJECT_ID=<project_id>
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=<publishable_key>
STACK_SECRET_SERVER_KEY=<secret_server_key>

# Database Configuration (get from Neon dashboard)
DATABASE_URL=<postgresql_connection_string>

# AWS Configuration (use BAWS prefix for Amplify)
BAWS_ACCESS_KEY_ID=<aws_access_key_id>
BAWS_SECRET_ACCESS_KEY=<aws_secret_access_key>
DEFAULT_REGION=ap-southeast-1
BEDROCK_REGION=us-east-1

# OCR Service Configuration
MISTRAL_API_KEY=<mistral_api_key>
LLAMAINDEX_API_KEY=<llamaindex_api_key>
```

**Security Note**: Never commit actual credentials to the repository. Use environment-specific configuration and secure secret management.

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

## Advanced Error Handling & Monitoring

### Enhanced Sentry Integration

#### Custom Error Boundaries
- **Component-level Isolation**: Prevent UI crashes from propagating
- **Vector Operation Tracking**: Specialized error handling for database operations
- **API Failure Categorization**: Classify and route errors based on service type
- **User Session Correlation**: Track errors across user journeys
- **Performance Degradation Detection**: Identify and alert on performance issues
- **Custom Metadata Collection**: Capture context-specific debugging information

#### Error Context Enhancement
- **User Journey Tracking**: Complete user flow leading to error
- **Database Query Context**: SQL queries and parameters at time of error
- **Vector Operation Parameters**: Embedding vectors, similarity thresholds, search criteria
- **File Processing Metadata**: Document details, OCR settings, processing stage
- **Authentication State**: User permissions, session status, token validity
- **Performance Metrics**: Response times, memory usage, CPU utilization at error time

#### Automated Error Response
- **GitHub Issue Creation**: Automatically create issues with full context and stack traces
- **Error Pattern Recognition**: Identify recurring issues and suggest solutions
- **Performance Regression Alerts**: Notify when response times degrade significantly
- **Critical Error Escalation**: Immediate notification for system-breaking errors
- **User Impact Notifications**: Alert users about known issues and workarounds
- **Rollback Trigger Mechanisms**: Automatic rollback for critical deployment failures

### Real-time System Health Monitoring

#### Performance Dashboards
- **API Response Time Monitoring**: Track all endpoints with 95th percentile metrics
- **Database Performance Metrics**: Query execution times, connection pool status
- **Vector Operation Success Rates**: Embedding generation, similarity search performance
- **User Engagement Analytics**: Active users, feature usage patterns, session duration
- **Cost Tracking per Service**: AWS usage, LLM API costs, storage expenses
- **Error Rate Trend Analysis**: Historical error patterns and resolution times

#### Predictive Monitoring
- **Performance Degradation Prediction**: ML-based prediction of performance issues
- **Resource Usage Forecasting**: Predict scaling needs based on usage trends
- **Error Pattern Analysis**: Identify patterns that precede critical failures
- **Capacity Planning Metrics**: Storage, compute, and bandwidth usage trends
- **Cost Optimization Recommendations**: Automated suggestions for cost reduction
- **User Behavior Trend Analysis**: Predict feature usage and resource needs

### Debugging and Troubleshooting

#### Development Debugging Tools
- **Vector Operation Debugger**: Step-by-step vector database operation tracing
- **RAG Pipeline Visualizer**: Visual representation of retrieval-augmented generation flow
- **API Request Tracer**: Complete request lifecycle with timing and dependencies
- **Database Query Analyzer**: Performance analysis and optimization suggestions
- **Authentication Flow Debugger**: Token validation and permission checking tools
- **Cost Analysis Tools**: Real-time cost tracking and optimization opportunities

#### Production Monitoring
- **Health Check Endpoints**: Comprehensive system health validation
- **Synthetic Transaction Monitoring**: Automated user journey testing
- **External Service Monitoring**: Track third-party service availability and performance
- **Infrastructure Monitoring**: Server resources, network connectivity, storage health
- **Security Incident Detection**: Automated detection of suspicious activities
- **Compliance Monitoring**: GDPR, data retention, and security policy compliance

## Git Branch Management Strategy

### Branch Structure
- **`main`**: Production deployment branch (AWS Amplify)
- **`feature/complete-chatbot-system`**: Active development branch with complete implementation
- **`archive/project-specifications`**: Archived planning and specification documents

### Branch History and Purpose

#### Active Branches
- **`main`**: Contains the deployed version with basic starter functionality. Currently has build errors that will be addressed after feature development is complete.
- **`feature/complete-chatbot-system`**: Primary development branch containing:
  - Complete chatbot management system (169 files, 54,000+ lines)
  - S3 configuration fixes
  - Database schema and TDD foundation
  - Core chatbot management functionality

#### Archived Branches
- **`archive/project-specifications`**: Preserved planning documentation including:
  - Complete project specifications (64 numbered tasks T001-T064)
  - API contracts and data models
  - Claude Code hooks and automation scripts
  - PowerShell utilities and project constitution
  - Research documents and quickstart guides

### Branch Management Decisions (2025-09-21)
**Decision**: Archived `001-refer-to-these` branch to `archive/project-specifications` to:
1. **Preserve Planning History**: Maintain complete project blueprint and task management system
2. **Clean Development Focus**: Keep active development branch focused on implementation
3. **Historical Reference**: Enable future reference to original specifications and planning documents
4. **Separate Concerns**: Maintain clear separation between planning artifacts and implementation code

### Development Workflow
1. **Primary Development**: Use `feature/complete-chatbot-system` for all active development
2. **Planning Reference**: Access archived specifications in `archive/project-specifications` when needed
3. **Production Deployment**: Merge stable features to `main` branch for AWS Amplify deployment
4. **Specification Updates**: Create new planning branches if major architectural changes are needed

### Branch Access
- **Active Development**: `git checkout feature/complete-chatbot-system`
- **Planning Reference**: `git checkout archive/project-specifications` (read-only)
- **Production**: `git checkout main` (for deployment fixes only)

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