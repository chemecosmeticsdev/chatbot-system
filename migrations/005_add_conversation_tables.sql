-- Migration: 005_add_conversation_tables.sql
-- Description: Add conversation_sessions and messages tables
-- Created: 2025-09-20
-- Dependencies: 004_add_chatbot_tables.sql

-- Create conversation_sessions table
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

-- Create indexes for conversation_sessions
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_chatbot ON conversation_sessions(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_platform ON conversation_sessions(platform);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_start_time ON conversation_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_status ON conversation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user ON conversation_sessions(user_identifier);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
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

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_sequence ON messages(session_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_messages_search ON messages USING GIN(search_vector);

-- Create trigger for search vector updates on messages
DROP TRIGGER IF EXISTS messages_search_vector_update ON messages;
CREATE TRIGGER messages_search_vector_update
    BEFORE INSERT OR UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION
    tsvector_update_trigger(search_vector, 'pg_catalog.english', content);

-- Create function to automatically set message sequence numbers
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

-- Create trigger for automatic sequence numbering
DROP TRIGGER IF EXISTS set_messages_sequence_number ON messages;
CREATE TRIGGER set_messages_sequence_number
    BEFORE INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION set_message_sequence_number();

-- Create function to update session metrics when messages are added
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

-- Create trigger for session metrics updates
DROP TRIGGER IF EXISTS update_session_metrics_on_message ON messages;
CREATE TRIGGER update_session_metrics_on_message
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_session_metrics();

-- Add check constraints
ALTER TABLE conversation_sessions
ADD CONSTRAINT check_session_platform
CHECK (platform IN ('web', 'line', 'api', 'playground', 'widget'));

ALTER TABLE conversation_sessions
ADD CONSTRAINT check_session_status
CHECK (status IN ('active', 'inactive', 'expired', 'terminated'));

ALTER TABLE conversation_sessions
ADD CONSTRAINT check_satisfaction_score
CHECK (user_satisfaction_score IS NULL OR (user_satisfaction_score >= 1 AND user_satisfaction_score <= 5));

ALTER TABLE messages
ADD CONSTRAINT check_message_type
CHECK (message_type IN ('user_message', 'bot_response', 'system_message'));

ALTER TABLE messages
ADD CONSTRAINT check_content_type
CHECK (content_type IN ('text', 'html', 'markdown', 'json'));

-- Add comments for documentation
COMMENT ON TABLE conversation_sessions IS 'Chat conversation sessions with metadata and metrics';
COMMENT ON TABLE messages IS 'Individual messages within conversation sessions';
COMMENT ON COLUMN conversation_sessions.session_context IS 'JSON context data for the conversation';
COMMENT ON COLUMN conversation_sessions.session_metadata IS 'Platform-specific metadata and settings';
COMMENT ON COLUMN messages.response_metadata IS 'JSON metadata including sources, confidence, retrieval results';
COMMENT ON COLUMN messages.token_usage IS 'JSON token counts for cost tracking';
COMMENT ON COLUMN messages.user_feedback IS 'JSON user feedback including ratings and corrections';
COMMENT ON COLUMN messages.search_vector IS 'Full-text search vector for message content';