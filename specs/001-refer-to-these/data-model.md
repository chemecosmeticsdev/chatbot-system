# Data Model: Chatbot Management System

**Generated**: September 20, 2025
**Context**: Extending existing Neon PostgreSQL database with chatbot management capabilities

## Database Schema Design

### Core Principles
- **Non-destructive**: Preserve all existing tables and data
- **Extensible**: Support future feature additions
- **Performance**: Optimized for vector operations and real-time queries
- **Scalable**: Designed for 10k+ documents and 1000+ concurrent conversations

### Existing Tables (Preserve As-Is)
```sql
-- Authentication and user management (Stack Auth integration)
-- These tables are managed by Stack Auth and should not be modified
-- Existing structure preserved for compatibility
```

### New Tables for Chatbot Management

#### 1. Organizations Table
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_created_at ON organizations(created_at);
```

#### 2. Products Table (Knowledge Base Hierarchy)
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    sku VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, draft, archived
    metadata JSONB DEFAULT '{}',
    search_vector tsvector, -- Full-text search optimization
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID -- References Stack Auth user
);

-- Indexes
CREATE INDEX idx_products_organization ON products(organization_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_search ON products USING GIN(search_vector);
CREATE UNIQUE INDEX idx_products_sku_org ON products(sku, organization_id) WHERE sku IS NOT NULL;

-- Trigger for search vector updates
CREATE TRIGGER products_search_vector_update
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION
    tsvector_update_trigger(search_vector, 'pg_catalog.english', name, description);
```

#### 3. Documents Table
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    s3_key VARCHAR(1000) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- technical, regulatory, safety, marketing, certification
    language VARCHAR(10) DEFAULT 'en', -- ISO 639-1 language codes
    processing_status VARCHAR(50) DEFAULT 'uploaded', -- uploaded, processing, completed, failed
    processing_log JSONB DEFAULT '[]',
    content_hash VARCHAR(64), -- SHA-256 for duplicate detection
    extracted_metadata JSONB DEFAULT '{}',
    ocr_confidence FLOAT, -- Overall OCR confidence score
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_documents_organization ON documents(organization_id);
CREATE INDEX idx_documents_product ON documents(product_id);
CREATE INDEX idx_documents_status ON documents(processing_status);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_language ON documents(language);
CREATE UNIQUE INDEX idx_documents_hash_org ON documents(content_hash, organization_id) WHERE content_hash IS NOT NULL;
```

#### 4. Document Chunks Table (Vector Storage)
```sql
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_type VARCHAR(50) NOT NULL, -- product_level, formulation_level, ingredient_level
    chunk_index INTEGER NOT NULL,
    token_count INTEGER,
    embedding VECTOR(1536), -- AWS Titan Text v2 dimensions
    embedding_model VARCHAR(100) DEFAULT 'amazon.titan-embed-text-v2:0',
    confidence_score FLOAT, -- Chunk extraction confidence
    metadata JSONB DEFAULT '{}',
    search_vector tsvector, -- Full-text search fallback
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_document_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_document_chunks_type ON document_chunks(chunk_type);
CREATE INDEX idx_document_chunks_index ON document_chunks(chunk_index);

-- Vector similarity search index (most important for performance)
CREATE INDEX idx_document_chunks_embedding ON document_chunks
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search index
CREATE INDEX idx_document_chunks_search ON document_chunks USING GIN(search_vector);

-- Trigger for search vector updates
CREATE TRIGGER document_chunks_search_vector_update
    BEFORE INSERT OR UPDATE ON document_chunks
    FOR EACH ROW EXECUTE FUNCTION
    tsvector_update_trigger(search_vector, 'pg_catalog.english', chunk_text);
```

#### 5. Chatbot Instances Table
```sql
CREATE TABLE chatbot_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, inactive, testing, maintenance
    avatar_url VARCHAR(500),
    welcome_message TEXT,
    fallback_message TEXT,

    -- LLM Configuration
    llm_provider VARCHAR(50) NOT NULL DEFAULT 'bedrock',
    llm_model VARCHAR(100) NOT NULL,
    system_prompt TEXT NOT NULL,
    model_config JSONB NOT NULL DEFAULT '{}', -- temperature, max_tokens, etc.

    -- RAG Configuration
    rag_enabled BOOLEAN DEFAULT true,
    retrieval_k INTEGER DEFAULT 5, -- Number of chunks to retrieve
    score_threshold FLOAT DEFAULT 0.7,
    context_window INTEGER DEFAULT 4000,

    -- Knowledge Base Filters
    knowledge_base_filter JSONB DEFAULT '{}', -- product_ids, categories, document_types

    -- Integration Settings
    integration_settings JSONB DEFAULT '{}',

    -- Performance Metrics (cached)
    performance_metrics JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_by UUID -- References Stack Auth user
);

-- Indexes
CREATE INDEX idx_chatbot_instances_organization ON chatbot_instances(organization_id);
CREATE INDEX idx_chatbot_instances_status ON chatbot_instances(status);
CREATE INDEX idx_chatbot_instances_model ON chatbot_instances(llm_model);
CREATE UNIQUE INDEX idx_chatbot_instances_name_org ON chatbot_instances(name, organization_id);
```

#### 6. Chatbot Documents Association Table
```sql
CREATE TABLE chatbot_documents (
    chatbot_id UUID REFERENCES chatbot_instances(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID, -- References Stack Auth user
    PRIMARY KEY (chatbot_id, document_id)
);

-- Indexes
CREATE INDEX idx_chatbot_documents_chatbot ON chatbot_documents(chatbot_id);
CREATE INDEX idx_chatbot_documents_document ON chatbot_documents(document_id);
```

#### 7. Conversation Sessions Table
```sql
CREATE TABLE conversation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID REFERENCES chatbot_instances(id) ON DELETE CASCADE,
    user_identifier VARCHAR(255), -- Platform-specific user ID (can be anonymous)
    platform VARCHAR(50) NOT NULL, -- web, line, api, playground, widget
    session_context JSONB DEFAULT '{}',

    -- Session lifecycle
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_duration_seconds INTEGER, -- Calculated on session end

    -- Metrics
    message_count INTEGER DEFAULT 0,
    user_satisfaction_score INTEGER, -- 1-5 rating if provided
    session_metadata JSONB DEFAULT '{}', -- Platform-specific data

    status VARCHAR(50) DEFAULT 'active' -- active, inactive, expired, terminated
);

-- Indexes
CREATE INDEX idx_conversation_sessions_chatbot ON conversation_sessions(chatbot_id);
CREATE INDEX idx_conversation_sessions_platform ON conversation_sessions(platform);
CREATE INDEX idx_conversation_sessions_start_time ON conversation_sessions(start_time);
CREATE INDEX idx_conversation_sessions_status ON conversation_sessions(status);
CREATE INDEX idx_conversation_sessions_user ON conversation_sessions(user_identifier);
```

#### 8. Messages Table
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL, -- user_message, bot_response, system_message
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text', -- text, html, markdown, json

    -- Message metadata
    attachments JSONB DEFAULT '[]',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sequence_number INTEGER NOT NULL, -- For ordering within session

    -- Bot response specific fields
    response_metadata JSONB DEFAULT '{}', -- Sources, confidence, processing time
    token_usage JSONB DEFAULT '{}', -- Input/output token counts
    processing_time_ms INTEGER, -- Response generation time
    model_used VARCHAR(100), -- Which LLM model was used

    -- User feedback
    user_feedback JSONB DEFAULT '{}', -- Ratings, corrections, thumbs up/down

    -- Error handling
    error_info JSONB DEFAULT '{}', -- Error details if processing failed

    -- Search optimization
    search_vector tsvector
);

-- Indexes
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_type ON messages(message_type);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_messages_sequence ON messages(session_id, sequence_number);
CREATE INDEX idx_messages_search ON messages USING GIN(search_vector);

-- Trigger for search vector updates
CREATE TRIGGER messages_search_vector_update
    BEFORE INSERT OR UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION
    tsvector_update_trigger(search_vector, 'pg_catalog.english', content);
```

#### 9. Integration Configurations Table
```sql
CREATE TABLE integration_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID REFERENCES chatbot_instances(id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL, -- line_oa, webhook, widget, iframe
    integration_name VARCHAR(255) NOT NULL,

    -- Configuration
    credentials JSONB DEFAULT '{}', -- Encrypted sensitive data
    settings JSONB DEFAULT '{}', -- Platform-specific settings
    webhook_url VARCHAR(500),

    -- Status and health
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, error, testing
    last_health_check TIMESTAMP WITH TIME ZONE,
    health_status JSONB DEFAULT '{}',
    error_log JSONB DEFAULT '[]',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID -- References Stack Auth user
);

-- Indexes
CREATE INDEX idx_integration_configs_chatbot ON integration_configs(chatbot_id);
CREATE INDEX idx_integration_configs_type ON integration_configs(integration_type);
CREATE INDEX idx_integration_configs_status ON integration_configs(status);
```

#### 10. Admin Feedback Table
```sql
CREATE TABLE admin_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID REFERENCES chatbot_instances(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

    -- Feedback content
    feedback_text TEXT NOT NULL,
    feedback_type VARCHAR(50) NOT NULL, -- accuracy, tone, completeness, relevance, other
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    context TEXT, -- Additional context provided by admin

    -- Processing status
    status VARCHAR(50) DEFAULT 'pending', -- pending, analyzing, completed, applied, rejected
    analysis_results JSONB DEFAULT '{}', -- LLM analysis of feedback
    suggested_improvements JSONB DEFAULT '[]', -- Generated improvements
    applied_changes JSONB DEFAULT '{}', -- What changes were actually applied

    -- Impact tracking
    before_snapshot JSONB DEFAULT '{}', -- Chatbot config before changes
    after_snapshot JSONB DEFAULT '{}', -- Chatbot config after changes
    impact_metrics JSONB DEFAULT '{}', -- Performance before/after

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    applied_at TIMESTAMP WITH TIME ZONE,
    created_by UUID, -- References Stack Auth user
    processed_by UUID -- References Stack Auth user
);

-- Indexes
CREATE INDEX idx_admin_feedback_chatbot ON admin_feedback(chatbot_id);
CREATE INDEX idx_admin_feedback_type ON admin_feedback(feedback_type);
CREATE INDEX idx_admin_feedback_severity ON admin_feedback(severity);
CREATE INDEX idx_admin_feedback_status ON admin_feedback(status);
CREATE INDEX idx_admin_feedback_created_at ON admin_feedback(created_at);
```

#### 11. Analytics and Metrics Tables
```sql
-- Daily aggregated metrics for performance
CREATE TABLE daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    chatbot_id UUID REFERENCES chatbot_instances(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,

    -- Conversation metrics
    total_sessions INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    avg_session_duration_seconds INTEGER DEFAULT 0,
    avg_messages_per_session FLOAT DEFAULT 0,

    -- Performance metrics
    avg_response_time_ms INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(10,4) DEFAULT 0,

    -- Quality metrics
    avg_user_satisfaction FLOAT, -- 1-5 scale
    successful_responses_ratio FLOAT, -- Responses that didn't error

    -- Platform distribution
    platform_breakdown JSONB DEFAULT '{}', -- {web: 10, line: 5, api: 2}

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_daily_metrics_unique ON daily_metrics(organization_id, chatbot_id, metric_date);
CREATE INDEX idx_daily_metrics_date ON daily_metrics(metric_date);
CREATE INDEX idx_daily_metrics_organization ON daily_metrics(organization_id);
```

#### 12. System Events Log Table
```sql
CREATE TABLE system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- document_uploaded, chatbot_created, integration_configured
    event_category VARCHAR(50) NOT NULL, -- system, user_action, error, performance

    -- Event details
    event_data JSONB NOT NULL,
    affected_resource_type VARCHAR(50), -- chatbot, document, integration
    affected_resource_id UUID,

    -- Context
    user_id UUID, -- References Stack Auth user
    ip_address INET,
    user_agent TEXT,

    -- Severity and status
    severity VARCHAR(20) DEFAULT 'info', -- debug, info, warning, error, critical
    status VARCHAR(50) DEFAULT 'completed', -- pending, completed, failed

    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_system_events_organization ON system_events(organization_id);
CREATE INDEX idx_system_events_type ON system_events(event_type);
CREATE INDEX idx_system_events_category ON system_events(event_category);
CREATE INDEX idx_system_events_timestamp ON system_events(timestamp);
CREATE INDEX idx_system_events_severity ON system_events(severity);
CREATE INDEX idx_system_events_resource ON system_events(affected_resource_type, affected_resource_id);
```

## Database Functions and Triggers

### 1. Automatic Timestamp Updates
```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chatbot_instances_updated_at
    BEFORE UPDATE ON chatbot_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Message Sequence Number Management
```sql
-- Function to automatically set message sequence numbers
CREATE OR REPLACE FUNCTION set_message_sequence_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sequence_number IS NULL THEN
        SELECT COALESCE(MAX(sequence_number), 0) + 1
        INTO NEW.sequence_number
        FROM messages
        WHERE session_id = NEW.session_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_messages_sequence_number
    BEFORE INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION set_message_sequence_number();
```

### 3. Session Metrics Updates
```sql
-- Function to update session metrics when messages are added
CREATE OR REPLACE FUNCTION update_session_metrics()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversation_sessions SET
        message_count = message_count + 1,
        last_activity = NOW()
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_metrics_on_message
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_session_metrics();
```

## Views for Common Queries

### 1. Chatbot Performance Summary View
```sql
CREATE VIEW chatbot_performance_summary AS
SELECT
    ci.id,
    ci.name,
    ci.organization_id,
    ci.status,
    COUNT(DISTINCT cs.id) as total_sessions,
    COUNT(m.id) as total_messages,
    AVG(cs.session_duration_seconds) as avg_session_duration,
    AVG(CASE WHEN m.message_type = 'bot_response' THEN m.processing_time_ms END) as avg_response_time,
    AVG(cs.user_satisfaction_score) as avg_satisfaction
FROM chatbot_instances ci
LEFT JOIN conversation_sessions cs ON ci.id = cs.chatbot_id
LEFT JOIN messages m ON cs.id = m.session_id
WHERE cs.start_time >= NOW() - INTERVAL '30 days'
GROUP BY ci.id, ci.name, ci.organization_id, ci.status;
```

### 2. Document Processing Status View
```sql
CREATE VIEW document_processing_status AS
SELECT
    d.id,
    d.title,
    d.organization_id,
    d.product_id,
    p.name as product_name,
    d.processing_status,
    d.file_size,
    d.document_type,
    d.language,
    COUNT(dc.id) as chunk_count,
    AVG(dc.confidence_score) as avg_chunk_confidence,
    d.created_at,
    d.processed_at
FROM documents d
LEFT JOIN products p ON d.product_id = p.id
LEFT JOIN document_chunks dc ON d.id = dc.document_id
GROUP BY d.id, d.title, d.organization_id, d.product_id, p.name,
         d.processing_status, d.file_size, d.document_type, d.language,
         d.created_at, d.processed_at;
```

## Data Relationships Summary

### Primary Relationships
- **Organizations** → **Products** (1:many)
- **Products** → **Documents** (1:many)
- **Documents** → **DocumentChunks** (1:many)
- **Organizations** → **ChatbotInstances** (1:many)
- **ChatbotInstances** → **ConversationSessions** (1:many)
- **ConversationSessions** → **Messages** (1:many)

### Association Relationships
- **ChatbotInstances** ↔ **Documents** (many:many via chatbot_documents)
- **ChatbotInstances** → **IntegrationConfigs** (1:many)
- **ChatbotInstances** → **AdminFeedback** (1:many)

### Performance Considerations
- **Vector Indexes**: Optimized for similarity search on embeddings
- **Full-text Search**: Comprehensive text search across content
- **Partitioning**: Consider partitioning large tables by date for analytics
- **Connection Pooling**: Optimize for concurrent access patterns

---
*Data model design completed: September 20, 2025*
*Next: Generate API contracts and test scenarios*