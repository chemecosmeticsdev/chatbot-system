-- Migration: 009_create_integration_configs.sql
-- Description: Create integration_configs table for external integrations
-- Dependencies: 005_create_chatbot_instances.sql

CREATE TABLE IF NOT EXISTS integration_configs (
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
CREATE INDEX IF NOT EXISTS idx_integration_configs_chatbot ON integration_configs(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_integration_configs_type ON integration_configs(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_configs_status ON integration_configs(status);

-- Trigger for updated_at
CREATE TRIGGER update_integration_configs_updated_at
    BEFORE UPDATE ON integration_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();