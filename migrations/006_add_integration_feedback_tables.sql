-- Migration: 006_add_integration_feedback_tables.sql
-- Description: Add integration_configs and admin_feedback tables
-- Created: 2025-09-20
-- Dependencies: 005_add_conversation_tables.sql

-- Create integration_configs table
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

-- Create indexes for integration_configs
CREATE INDEX IF NOT EXISTS idx_integration_configs_chatbot ON integration_configs(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_integration_configs_type ON integration_configs(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_configs_status ON integration_configs(status);

-- Create admin_feedback table
CREATE TABLE IF NOT EXISTS admin_feedback (
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

-- Create indexes for admin_feedback
CREATE INDEX IF NOT EXISTS idx_admin_feedback_chatbot ON admin_feedback(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_admin_feedback_type ON admin_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_admin_feedback_severity ON admin_feedback(severity);
CREATE INDEX IF NOT EXISTS idx_admin_feedback_status ON admin_feedback(status);
CREATE INDEX IF NOT EXISTS idx_admin_feedback_created_at ON admin_feedback(created_at);

-- Create trigger for updated_at on integration_configs
DROP TRIGGER IF EXISTS update_integration_configs_updated_at ON integration_configs;
CREATE TRIGGER update_integration_configs_updated_at
    BEFORE UPDATE ON integration_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add check constraints
ALTER TABLE integration_configs
ADD CONSTRAINT check_integration_type
CHECK (integration_type IN ('line_oa', 'webhook', 'widget', 'iframe'));

ALTER TABLE integration_configs
ADD CONSTRAINT check_integration_status
CHECK (status IN ('active', 'inactive', 'error', 'testing'));

ALTER TABLE admin_feedback
ADD CONSTRAINT check_feedback_type
CHECK (feedback_type IN ('accuracy', 'tone', 'completeness', 'relevance', 'other'));

ALTER TABLE admin_feedback
ADD CONSTRAINT check_feedback_severity
CHECK (severity IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE admin_feedback
ADD CONSTRAINT check_feedback_status
CHECK (status IN ('pending', 'analyzing', 'completed', 'applied', 'rejected'));

-- Add comments for documentation
COMMENT ON TABLE integration_configs IS 'External platform integration configurations for chatbots';
COMMENT ON TABLE admin_feedback IS 'Admin feedback for improving chatbot responses and behavior';
COMMENT ON COLUMN integration_configs.credentials IS 'Encrypted JSON credentials for external platforms';
COMMENT ON COLUMN integration_configs.settings IS 'Platform-specific configuration settings';
COMMENT ON COLUMN integration_configs.health_status IS 'JSON health check results and metrics';
COMMENT ON COLUMN integration_configs.error_log IS 'JSON array of recent errors and issues';
COMMENT ON COLUMN admin_feedback.analysis_results IS 'LLM analysis results of the feedback';
COMMENT ON COLUMN admin_feedback.suggested_improvements IS 'JSON array of suggested improvements';
COMMENT ON COLUMN admin_feedback.applied_changes IS 'JSON record of changes actually applied';
COMMENT ON COLUMN admin_feedback.before_snapshot IS 'Chatbot configuration before feedback application';
COMMENT ON COLUMN admin_feedback.after_snapshot IS 'Chatbot configuration after feedback application';
COMMENT ON COLUMN admin_feedback.impact_metrics IS 'Performance metrics comparing before/after feedback';