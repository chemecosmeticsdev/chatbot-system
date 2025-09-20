# Technical Research: Chatbot Management System

**Generated**: September 20, 2025
**Context**: Extending existing Next.js starter with comprehensive chatbot management capabilities

## Research Findings

### 1. Shadcn/ui Integration for Professional Dashboard

**Decision**: Use Shadcn/ui components with custom theme configuration
**Rationale**:
- Excellent TypeScript support and accessibility compliance
- Professional gradient design system aligns with requirements
- Comprehensive component library reduces development time
- Strong community support and documentation

**Implementation Strategy**:
```bash
# Components to implement (based on existing patterns)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input table dialog tabs
npx shadcn-ui@latest add navigation-menu sidebar breadcrumb
npx shadcn-ui@latest add form select textarea badge progress
```

**Alternatives Considered**:
- Material-UI: Rejected due to larger bundle size and less customization
- Ant Design: Rejected due to design philosophy mismatch
- Custom components: Rejected due to development time constraints

### 2. Neon PostgreSQL Vector Database Configuration

**Decision**: Use pgvector extension with optimized indexing strategy
**Rationale**:
- Existing Neon database integration already functional
- pgvector provides excellent performance for similarity search
- Native PostgreSQL integration simplifies architecture
- Cost-effective compared to dedicated vector databases

**Implementation Details**:
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Optimized index configuration for embeddings
CREATE INDEX CONCURRENTLY idx_document_chunks_embedding
ON document_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Performance optimization settings
SET work_mem = '256MB';  -- For large vector operations
SET maintenance_work_mem = '1GB';  -- For index creation
```

**Performance Benchmarks**:
- Target: <200ms for similarity search with 10k+ vectors
- Index refresh: Automated during low-traffic periods
- Memory optimization: 1536-dimension embeddings (AWS Titan Text v2)

### 3. AWS Bedrock Multi-Model Support Strategy

**Decision**: Implement cost-tiered model selection with automatic fallback
**Rationale**:
- Existing AWS integration via BAWS_* environment variables working
- Cost optimization critical for Thai market deployment
- Different models excel at different tasks

**Model Selection Strategy**:
```typescript
interface ModelTier {
  fast: 'anthropic.claude-3-haiku-20240307-v1:0';      // $0.00025/$0.00125 per 1k tokens
  balanced: 'anthropic.claude-3-5-sonnet-20241022-v2:0'; // $0.003/$0.015 per 1k tokens
  premium: 'amazon.titan-text-premier-v1:0';             // $0.0005/$0.0015 per 1k tokens
}
```

**Cost Optimization**:
- Haiku for simple queries and real-time responses
- Sonnet for complex reasoning and Thai language processing
- Titan for long-context document processing
- Automatic model selection based on query complexity

### 4. Langchain TypeScript Integration Patterns

**Decision**: Use Langchain.js with custom retriever and memory management
**Rationale**:
- Mature TypeScript support and active development
- Excellent integration with AWS Bedrock and vector databases
- Modular architecture allows customization for Thai language needs
- Strong community and documentation

**Architecture Pattern**:
```typescript
interface RAGPipeline {
  retriever: NeonVectorStoreRetriever;  // Custom Neon integration
  llm: BedrockChat;                     // AWS Bedrock models
  memory: ConversationBufferMemory;     // Session management
  chainType: 'conversational_retrieval'; // Context-aware responses
}
```

**Custom Components**:
- Thai language text splitter for proper word boundaries
- Contextual compression for relevance filtering
- Multi-query retrieval for comprehensive results

### 5. Thai Language Support Requirements

**Decision**: Implement comprehensive Thai localization with cultural adaptations
**Rationale**:
- Primary market requirement for Thai/English bilingual support
- Complex text rendering and input method requirements
- Cultural adaptation needed for date formats and communication styles

**Technical Implementation**:
```json
// Font stack for Thai text rendering
{
  "fonts": {
    "thai": ["Sarabun", "Noto Sans Thai", "Arial Unicode MS"],
    "fallback": ["Inter", "system-ui", "sans-serif"]
  },
  "textProcessing": {
    "wordBreaking": "thai-dictionary-based",
    "lineHeight": "1.6", // Increased for Thai characters
    "characterSpacing": "normal"
  }
}
```

**Cultural Adaptations**:
- Buddhist era calendar support (B.E. dates)
- Thai number formatting and currency
- Formal/informal communication styles
- Right-to-left compatible layouts

### 6. Document Processing Pipeline Architecture

**Decision**: Multi-stage processing with OCR selection and smart chunking
**Rationale**:
- Existing Mistral OCR and LlamaIndex integrations available
- Smart chunking improves retrieval accuracy
- Hierarchical document structure preserves relationships

**Processing Workflow**:
```
1. File Upload → S3 Storage (existing integration)
2. OCR Processing → Mistral/LlamaIndex (admin selectable)
3. Text Cleaning → Remove artifacts, normalize formatting
4. Smart Chunking → LLM-powered semantic segmentation
5. Embedding Generation → AWS Titan Text v2
6. Vector Storage → Neon PostgreSQL with pgvector
7. Relationship Mapping → Product-document hierarchy
```

**Chunking Strategy**:
- Product-level chunks: 300-500 tokens for general queries
- Formulation-level: 200-400 tokens for detailed specs
- Ingredient-level: 100-200 tokens for specific components
- Preserve cross-references and technical data integrity

### 7. Real-time Updates and WebSocket Integration

**Decision**: Server-Sent Events (SSE) for real-time dashboard updates
**Rationale**:
- Simpler implementation than WebSockets for one-way communication
- Better compatibility with AWS Lambda and Amplify
- Easier to maintain and debug
- Lower resource usage for dashboard updates

**Implementation Pattern**:
```typescript
// Real-time updates for:
- Document processing status
- Conversation activity
- System health metrics
- Error notifications
```

**Alternatives Considered**:
- WebSockets: Rejected due to Lambda limitations and complexity
- Polling: Rejected due to inefficiency and latency
- Push notifications: Considered for future mobile app integration

### 8. Performance Optimization Strategies

**Decision**: Multi-layered caching and database optimization
**Rationale**:
- Vector operations can be computationally expensive
- Dashboard responsiveness critical for user experience
- Cost optimization for Thai market deployment

**Optimization Techniques**:
```typescript
// Caching layers
interface CachingStrategy {
  embeddings: 'redis-cluster';        // Frequently accessed vectors
  apiResponses: 'next-js-cache';      // API response caching
  staticAssets: 'cloudfront-cdn';     // Global content delivery
  databaseQueries: 'connection-pool'; // Neon connection optimization
}
```

**Database Optimization**:
- Partitioned tables for large document collections
- Materialized views for analytics queries
- Index optimization for vector similarity search
- Query plan analysis and optimization

### 9. Security and Compliance Framework

**Decision**: Extend existing security patterns with chatbot-specific measures
**Rationale**:
- Existing Stack Auth integration provides solid foundation
- Sensitive data (API keys, documents) requires additional protection
- Audit trail needed for admin actions

**Security Measures**:
```typescript
// Security enhancements
interface SecurityFramework {
  authentication: 'stack-auth';           // Existing integration
  authorization: 'role-based-access';     // Admin-level permissions
  dataEncryption: 'at-rest-and-transit'; // AWS KMS integration
  auditLogging: 'comprehensive-trail';    // All admin actions
  rateLimit: 'api-endpoint-protection';   // DDoS protection
}
```

### 10. Monitoring and Observability Extension

**Decision**: Extend existing Sentry integration with chatbot-specific metrics
**Rationale**:
- Existing Sentry configuration working well
- Chatbot systems require specialized monitoring
- Cost tracking essential for AI/ML operations

**Monitoring Strategy**:
```typescript
// Extended monitoring
interface MonitoringFramework {
  errorTracking: 'sentry-existing';      // Preserve current setup
  performanceMetrics: 'custom-dashboard'; // Vector operation times
  costTracking: 'aws-bedrock-usage';     // AI model costs
  conversationAnalytics: 'custom-service'; // Chatbot performance
  systemHealth: 'cloudwatch-integration'; // Infrastructure monitoring
}
```

## Implementation Priorities

### Phase 1: Foundation (Preserve existing functionality)
1. Database schema migrations (non-destructive)
2. API endpoint scaffolding
3. Basic UI component structure

### Phase 2: Core Features
1. Knowledge base management
2. Chatbot instance creation
3. Admin dashboard interface

### Phase 3: Advanced Features
1. Integration management (Line OA)
2. Analytics and reporting
3. Performance optimization

### Phase 4: Production Readiness
1. Comprehensive testing
2. Performance tuning
3. Security hardening
4. Documentation completion

## Risk Mitigation Strategies

### Technical Risks
1. **Vector Database Performance**: Comprehensive indexing strategy and query optimization
2. **AWS Costs**: Tiered model selection and usage monitoring
3. **Thai Language Processing**: Specialized libraries and testing frameworks
4. **Integration Complexity**: Isolated testing of each service integration

### Deployment Risks
1. **Amplify Build Compatibility**: Incremental changes and extensive local testing
2. **Environment Variable Management**: Preserve existing BAWS_* patterns
3. **Database Migrations**: Non-destructive schema changes with rollback capability
4. **API Backward Compatibility**: Versioned endpoints and deprecation strategies

## Success Metrics

### Performance Targets
- Page load time: <2 seconds for dashboard
- Vector search: <200ms average response time
- System uptime: 99.9% availability
- Cost efficiency: <$0.10 per conversation

### Quality Metrics
- Test coverage: 90%+ for critical paths
- TypeScript compilation: Zero errors
- Accessibility: WCAG 2.1 AA compliance
- Thai text rendering: 100% compatibility

---
*Research completed: September 20, 2025*
*Next: Proceed to Phase 1 Design & Contracts*