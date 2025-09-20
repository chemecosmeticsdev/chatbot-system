-- Migration: 006_create_chatbot_documents.sql
-- Description: Create association table between chatbots and documents
-- Dependencies: 005_create_chatbot_instances.sql, 003_create_documents.sql

CREATE TABLE IF NOT EXISTS chatbot_documents (
    chatbot_id UUID REFERENCES chatbot_instances(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID, -- References Stack Auth user
    PRIMARY KEY (chatbot_id, document_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chatbot_documents_chatbot ON chatbot_documents(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_documents_document ON chatbot_documents(document_id);