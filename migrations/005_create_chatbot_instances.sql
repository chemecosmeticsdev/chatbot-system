-- Migration: 005_create_chatbot_instances.sql
-- Description: Create chatbot_instances table for chatbot management
-- Dependencies: 001_create_organizations.sql

CREATE TABLE IF NOT EXISTS chatbot_instances (
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
CREATE INDEX IF NOT EXISTS idx_chatbot_instances_organization ON chatbot_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_instances_status ON chatbot_instances(status);
CREATE INDEX IF NOT EXISTS idx_chatbot_instances_model ON chatbot_instances(llm_model);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chatbot_instances_name_org ON chatbot_instances(name, organization_id);

-- Trigger for updated_at
CREATE TRIGGER update_chatbot_instances_updated_at
    BEFORE UPDATE ON chatbot_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();