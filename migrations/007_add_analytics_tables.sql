-- Migration: 007_add_analytics_tables.sql
-- Description: Add daily_metrics and system_events tables for analytics
-- Created: 2025-09-20
-- Dependencies: 006_add_integration_feedback_tables.sql

-- Create daily_metrics table
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

-- Create indexes for daily_metrics
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_metrics_unique ON daily_metrics(organization_id, chatbot_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_organization ON daily_metrics(organization_id);

-- Create system_events table
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

-- Create indexes for system_events
CREATE INDEX IF NOT EXISTS idx_system_events_organization ON system_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_system_events_type ON system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_category ON system_events(event_category);
CREATE INDEX IF NOT EXISTS idx_system_events_timestamp ON system_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON system_events(severity);
CREATE INDEX IF NOT EXISTS idx_system_events_resource ON system_events(affected_resource_type, affected_resource_id);

-- Add check constraints
ALTER TABLE daily_metrics
ADD CONSTRAINT check_daily_metrics_date
CHECK (metric_date <= CURRENT_DATE);

ALTER TABLE daily_metrics
ADD CONSTRAINT check_satisfaction_range
CHECK (avg_user_satisfaction IS NULL OR (avg_user_satisfaction >= 1.0 AND avg_user_satisfaction <= 5.0));

ALTER TABLE daily_metrics
ADD CONSTRAINT check_success_ratio
CHECK (successful_responses_ratio IS NULL OR (successful_responses_ratio >= 0.0 AND successful_responses_ratio <= 1.0));

ALTER TABLE system_events
ADD CONSTRAINT check_event_category
CHECK (event_category IN ('system', 'user_action', 'error', 'performance'));

ALTER TABLE system_events
ADD CONSTRAINT check_severity
CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical'));

ALTER TABLE system_events
ADD CONSTRAINT check_status
CHECK (status IN ('pending', 'completed', 'failed'));

-- Create views for common queries
CREATE OR REPLACE VIEW chatbot_performance_summary AS
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

CREATE OR REPLACE VIEW document_processing_status AS
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

-- Function to aggregate daily metrics (to be called by scheduled job)
CREATE OR REPLACE FUNCTION aggregate_daily_metrics(target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS INTEGER AS $$
DECLARE
    rows_affected INTEGER := 0;
BEGIN
    INSERT INTO daily_metrics (
        organization_id,
        chatbot_id,
        metric_date,
        total_sessions,
        total_messages,
        unique_users,
        avg_session_duration_seconds,
        avg_messages_per_session,
        avg_response_time_ms,
        avg_user_satisfaction,
        successful_responses_ratio,
        platform_breakdown
    )
    SELECT
        ci.organization_id,
        ci.id as chatbot_id,
        target_date::date,
        COUNT(DISTINCT cs.id) as total_sessions,
        COUNT(m.id) as total_messages,
        COUNT(DISTINCT cs.user_identifier) as unique_users,
        AVG(cs.session_duration_seconds)::integer as avg_session_duration_seconds,
        AVG(cs.message_count) as avg_messages_per_session,
        AVG(CASE WHEN m.message_type = 'bot_response' THEN m.processing_time_ms END)::integer as avg_response_time_ms,
        AVG(cs.user_satisfaction_score) as avg_user_satisfaction,
        SUM(CASE WHEN m.error_info = '{}' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(m.id), 0) as successful_responses_ratio,
        json_object_agg(cs.platform, COUNT(cs.id)) as platform_breakdown
    FROM chatbot_instances ci
    LEFT JOIN conversation_sessions cs ON ci.id = cs.chatbot_id
        AND cs.start_time::date = target_date
    LEFT JOIN messages m ON cs.id = m.session_id
        AND m.timestamp::date = target_date
    GROUP BY ci.organization_id, ci.id
    ON CONFLICT (organization_id, chatbot_id, metric_date)
    DO UPDATE SET
        total_sessions = EXCLUDED.total_sessions,
        total_messages = EXCLUDED.total_messages,
        unique_users = EXCLUDED.unique_users,
        avg_session_duration_seconds = EXCLUDED.avg_session_duration_seconds,
        avg_messages_per_session = EXCLUDED.avg_messages_per_session,
        avg_response_time_ms = EXCLUDED.avg_response_time_ms,
        avg_user_satisfaction = EXCLUDED.avg_user_satisfaction,
        successful_responses_ratio = EXCLUDED.successful_responses_ratio,
        platform_breakdown = EXCLUDED.platform_breakdown;

    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE daily_metrics IS 'Daily aggregated metrics for performance monitoring and analytics';
COMMENT ON TABLE system_events IS 'System-wide event log for audit trail and monitoring';
COMMENT ON COLUMN daily_metrics.platform_breakdown IS 'JSON breakdown of session counts by platform';
COMMENT ON COLUMN system_events.event_data IS 'JSON event details and context information';
COMMENT ON COLUMN system_events.affected_resource_type IS 'Type of resource affected by this event';
COMMENT ON COLUMN system_events.affected_resource_id IS 'UUID of the specific resource affected';
COMMENT ON FUNCTION aggregate_daily_metrics IS 'Aggregates conversation metrics for a specific date';

-- Insert initial system event to mark successful migration
INSERT INTO system_events (
    organization_id,
    event_type,
    event_category,
    event_data,
    severity,
    status
)
SELECT
    o.id,
    'database_migration_completed',
    'system',
    '{"migration": "007_add_analytics_tables", "tables_created": ["daily_metrics", "system_events"], "views_created": ["chatbot_performance_summary", "document_processing_status"]}'::jsonb,
    'info',
    'completed'
FROM organizations o WHERE o.slug = 'default';