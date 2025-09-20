-- Migration: 011_create_analytics_tables.sql
-- Description: Create analytics and metrics tables
-- Dependencies: 001_create_organizations.sql, 005_create_chatbot_instances.sql

-- Daily aggregated metrics for performance
CREATE TABLE IF NOT EXISTS daily_metrics (
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_metrics_unique ON daily_metrics(organization_id, chatbot_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_organization ON daily_metrics(organization_id);

-- System events log table
CREATE TABLE IF NOT EXISTS system_events (
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
CREATE INDEX IF NOT EXISTS idx_system_events_organization ON system_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_system_events_type ON system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_category ON system_events(event_category);
CREATE INDEX IF NOT EXISTS idx_system_events_timestamp ON system_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON system_events(severity);
CREATE INDEX IF NOT EXISTS idx_system_events_resource ON system_events(affected_resource_type, affected_resource_id);