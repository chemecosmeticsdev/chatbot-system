-- Migration: 010_create_admin_feedback.sql
-- Description: Create admin_feedback table for automated improvement system
-- Dependencies: 005_create_chatbot_instances.sql, 008_create_messages.sql

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_feedback_chatbot ON admin_feedback(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_admin_feedback_type ON admin_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_admin_feedback_severity ON admin_feedback(severity);
CREATE INDEX IF NOT EXISTS idx_admin_feedback_status ON admin_feedback(status);
CREATE INDEX IF NOT EXISTS idx_admin_feedback_created_at ON admin_feedback(created_at);