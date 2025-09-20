-- Migration: 008_create_messages.sql
-- Description: Create messages table for conversation history
-- Dependencies: 007_create_conversation_sessions.sql

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_sequence ON messages(session_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_messages_search ON messages USING GIN(search_vector);

-- Trigger for search vector updates
CREATE TRIGGER messages_search_vector_update
    BEFORE INSERT OR UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION
    tsvector_update_trigger(search_vector, 'pg_catalog.english', content);

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