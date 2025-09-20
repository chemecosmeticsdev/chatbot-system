-- Migration: 004_create_document_chunks.sql
-- Description: Create document_chunks table for vector storage
-- Dependencies: 003_create_documents.sql

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_type VARCHAR(50) NOT NULL, -- product_level, formulation_level, ingredient_level
    chunk_index INTEGER NOT NULL,
    token_count INTEGER,
    embedding VECTOR(1536), -- AWS Titan Text v2 dimensions
    embedding_model VARCHAR(100) DEFAULT 'amazon.titan-embed-text-v2:0',
    confidence_score FLOAT, -- Chunk extraction confidence
    metadata JSONB DEFAULT '{}',
    search_vector tsvector, -- Full-text search fallback
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_type ON document_chunks(chunk_type);
CREATE INDEX IF NOT EXISTS idx_document_chunks_index ON document_chunks(chunk_index);

-- Vector similarity search index (most important for performance)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_document_chunks_search ON document_chunks USING GIN(search_vector);

-- Trigger for search vector updates
CREATE TRIGGER document_chunks_search_vector_update
    BEFORE INSERT OR UPDATE ON document_chunks
    FOR EACH ROW EXECUTE FUNCTION
    tsvector_update_trigger(search_vector, 'pg_catalog.english', chunk_text);