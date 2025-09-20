-- Migration: 007_create_conversation_sessions.sql
-- Description: Create conversation_sessions table for conversation management
-- Dependencies: 005_create_chatbot_instances.sql

CREATE TABLE IF NOT EXISTS conversation_sessions (
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
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_chatbot ON conversation_sessions(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_platform ON conversation_sessions(platform);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_start_time ON conversation_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_status ON conversation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user ON conversation_sessions(user_identifier);