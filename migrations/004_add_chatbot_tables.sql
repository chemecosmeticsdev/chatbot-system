-- Migration: 004_add_chatbot_tables.sql
-- Description: Add chatbot_instances and chatbot_documents tables
-- Created: 2025-09-20
-- Dependencies: 003_add_documents_tables.sql

-- Create chatbot_instances table
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

-- Create indexes for chatbot_instances
CREATE INDEX IF NOT EXISTS idx_chatbot_instances_organization ON chatbot_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_instances_status ON chatbot_instances(status);
CREATE INDEX IF NOT EXISTS idx_chatbot_instances_model ON chatbot_instances(llm_model);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chatbot_instances_name_org ON chatbot_instances(name, organization_id);

-- Create chatbot_documents association table
CREATE TABLE IF NOT EXISTS chatbot_documents (
    chatbot_id UUID REFERENCES chatbot_instances(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID, -- References Stack Auth user
    PRIMARY KEY (chatbot_id, document_id)
);

-- Create indexes for chatbot_documents
CREATE INDEX IF NOT EXISTS idx_chatbot_documents_chatbot ON chatbot_documents(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_documents_document ON chatbot_documents(document_id);

-- Create trigger for updated_at on chatbot_instances
DROP TRIGGER IF EXISTS update_chatbot_instances_updated_at ON chatbot_instances;
CREATE TRIGGER update_chatbot_instances_updated_at
    BEFORE UPDATE ON chatbot_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add check constraints
ALTER TABLE chatbot_instances
ADD CONSTRAINT check_chatbot_status
CHECK (status IN ('draft', 'active', 'inactive', 'testing', 'maintenance'));

ALTER TABLE chatbot_instances
ADD CONSTRAINT check_llm_provider
CHECK (llm_provider IN ('bedrock', 'openai', 'anthropic', 'custom'));

-- Insert sample chatbot for the default organization
INSERT INTO chatbot_instances (
    organization_id,
    name,
    description,
    status,
    llm_provider,
    llm_model,
    system_prompt,
    model_config,
    welcome_message,
    fallback_message
)
SELECT
    o.id,
    'Sample Assistant',
    'A sample chatbot for demonstration and testing purposes',
    'draft',
    'bedrock',
    'anthropic.claude-3-haiku-20240307-v1:0',
    'You are a helpful assistant for answering questions about products and services. Be concise, accurate, and friendly.',
    '{"temperature": 0.7, "max_tokens": 1000, "top_p": 0.9}',
    'Hello! I''m here to help you with any questions about our products and services. How can I assist you today?',
    'I''m sorry, I don''t have enough information to answer that question. Could you please rephrase or ask something else?'
FROM organizations o WHERE o.slug = 'default'
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE chatbot_instances IS 'Chatbot instance configurations with LLM and RAG settings';
COMMENT ON TABLE chatbot_documents IS 'Many-to-many relationship between chatbots and documents';
COMMENT ON COLUMN chatbot_instances.model_config IS 'JSON configuration for LLM model parameters';
COMMENT ON COLUMN chatbot_instances.knowledge_base_filter IS 'JSON filters for document retrieval scope';
COMMENT ON COLUMN chatbot_instances.integration_settings IS 'JSON settings for external platform integrations';
COMMENT ON COLUMN chatbot_instances.performance_metrics IS 'Cached JSON metrics for quick dashboard display';