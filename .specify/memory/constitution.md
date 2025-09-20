<!--
SYNC IMPACT REPORT:
Version: New constitution v1.0.0 (establishing foundational governance)
Modified Principles:
- Added: Documentation-First Development
- Added: Multi-language Excellence
- Added: Test-Driven Integration
- Added: Best Practices Enforcement
- Added: Performance & Observability
Added Sections:
- Technology Standards
- Development Workflow
Templates Requiring Updates:
- ✅ .specify/templates/plan-template.md (version reference updated)
Follow-up TODOs: None - all placeholders resolved
-->

# Knowledge Base and Chatbot Management System Constitution

## Core Principles

### I. Documentation-First Development
Every API, component, and integration MUST reference official documentation using Context7 MCP. No assumptions or outdated practices allowed. All technical decisions must be backed by authoritative sources and current best practices.

**Rationale**: Ensures reliability, maintainability, and prevents integration issues with rapidly evolving tech stack (AWS Bedrock, Shadcn/ui, Neon).

### II. Multi-language Excellence
Thai (primary) and English support MUST be built-in from the start. UI layouts, text overflow, and cultural adaptations are mandatory considerations for every component and feature.

**Rationale**: Primary market is Thailand with mixed-language requirements. Retrofitting i18n is costly and error-prone compared to designing for it from inception.

### III. Test-Driven Integration (NON-NEGOTIABLE)
API testing MUST be isolated before UI integration. Playwright/Puppeteer MCP required for visual feedback. All external service connections (AWS, Neon, OCR) validated before use.

**Rationale**: Complex integration chain (Next.js → AWS → Neon → OCR services) requires systematic validation to prevent cascade failures in production.

### IV. Best Practices Enforcement
Strictly follow industry standards for design, development, and testing. Error handling mandatory for all API calls. GitHub issues/PRs used for productivity tracking and knowledge management.

**Rationale**: Professional system serving production users requires enterprise-grade reliability and maintainability standards.

### V. Performance & Observability
AWS deployment optimization, Sentry error tracking, and resource monitoring are foundational requirements. Cost-effective solutions prioritized (AWS Bedrock us-east-1, efficient embedding models).

**Rationale**: Serverless architecture and AI/ML operations require proactive monitoring to control costs and ensure scalability for Thai market deployment.

## Technology Standards

**Mandatory Tech Stack**:
- Frontend: Next.js + Shadcn/ui components (professional responsive design)
- Database: Neon PostgreSQL with vector extensions
- Authentication: Neon Auth + Stack Auth integration
- Backend: AWS Lambda + API Gateway (serverless)
- Storage: AWS S3 (document uploads)
- OCR: Mistral OCR + LlamaIndex (admin-selectable)
- Embeddings: AWS Bedrock Titan Text Embeddings v2
- RAG Framework: Langchain
- Monitoring: Sentry error tracking
- Testing: Playwright for visual testing, Jest for unit tests
- Deployment: AWS Amplify with CI/CD

**Performance Requirements**:
- Desktop-first responsive design with mobile optimization
- Light/dark mode toggle functionality
- Thai text rendering optimization
- Vector search performance optimization
- Cost-effective AWS Bedrock model selection

## Development Workflow

**Environment Setup**:
- Environment variable validation via `lib/config.ts`
- BAWS prefix for AWS variables (Amplify requirement)
- All API connections tested before development

**Quality Gates**:
- TypeScript compilation without errors
- ESLint validation and Prettier formatting
- API integration tests pass
- i18n key validation for Thai/English
- Visual regression tests with Playwright
- Sentry configuration validation

**CI/CD Pipeline**:
- Automated testing on GitHub Actions
- AWS Amplify auto-deployment on main branch
- Performance monitoring and cost tracking
- Automated error reporting and GitHub issue creation

## Governance

**Amendment Process**:
This constitution supersedes all other development practices. Amendments require:
1. Documentation of proposed changes with rationale
2. Impact assessment on existing templates and workflows
3. Version increment following semantic versioning
4. Update of dependent template files
5. Migration plan for breaking changes

**Compliance Validation**:
- All PRs must verify constitutional compliance
- Performance standards must be maintained
- Error handling patterns must be consistent
- Multi-language support cannot be compromised
- Official documentation references mandatory

**Version Control**:
- MAJOR: Backward incompatible changes to core principles or tech stack
- MINOR: New principles, standards, or workflow additions
- PATCH: Clarifications, refinements, non-breaking updates

Use `CLAUDE.md` for runtime development guidance and MCP server configurations.

**Version**: 1.0.0 | **Ratified**: 2025-09-20 | **Last Amended**: 2025-09-20