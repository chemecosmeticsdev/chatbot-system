-- Migration: 012_create_views.sql
-- Description: Create useful views for common queries
-- Dependencies: All previous migrations

-- Chatbot performance summary view
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

-- Document processing status view
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