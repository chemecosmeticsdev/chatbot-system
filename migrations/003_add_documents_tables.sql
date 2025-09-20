-- Migration: 003_add_documents_tables.sql
-- Description: Add documents and document_chunks tables for vector storage
-- Created: 2025-09-20
-- Dependencies: 002_add_products_table.sql

-- Enable vector extension for pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    s3_key VARCHAR(1000) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- technical, regulatory, safety, marketing, certification
    language VARCHAR(10) DEFAULT 'en', -- ISO 639-1 language codes
    processing_status VARCHAR(50) DEFAULT 'uploaded', -- uploaded, processing, completed, failed
    processing_log JSONB DEFAULT '[]',
    content_hash VARCHAR(64), -- SHA-256 for duplicate detection
    extracted_metadata JSONB DEFAULT '{}',
    ocr_confidence FLOAT, -- Overall OCR confidence score
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_organization ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_product ON documents(product_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_language ON documents(language);
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_hash_org ON documents(content_hash, organization_id) WHERE content_hash IS NOT NULL;

-- Create document_chunks table for vector storage
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

-- Create indexes for document_chunks
CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_type ON document_chunks(chunk_type);
CREATE INDEX IF NOT EXISTS idx_document_chunks_index ON document_chunks(chunk_index);

-- Vector similarity search index (most important for performance)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_document_chunks_search ON document_chunks USING GIN(search_vector);

-- Create trigger for search vector updates on document_chunks
DROP TRIGGER IF EXISTS document_chunks_search_vector_update ON document_chunks;
CREATE TRIGGER document_chunks_search_vector_update
    BEFORE INSERT OR UPDATE ON document_chunks
    FOR EACH ROW EXECUTE FUNCTION
    tsvector_update_trigger(search_vector, 'pg_catalog.english', chunk_text);

-- Create trigger for updated_at on documents
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add check constraints
ALTER TABLE documents
ADD CONSTRAINT check_document_type
CHECK (document_type IN ('technical', 'regulatory', 'safety', 'marketing', 'certification'));

ALTER TABLE documents
ADD CONSTRAINT check_processing_status
CHECK (processing_status IN ('uploaded', 'processing', 'completed', 'failed'));

ALTER TABLE document_chunks
ADD CONSTRAINT check_chunk_type
CHECK (chunk_type IN ('product_level', 'formulation_level', 'ingredient_level'));

-- Add comments for documentation
COMMENT ON TABLE documents IS 'Document storage with metadata and processing status';
COMMENT ON TABLE document_chunks IS 'Text chunks with vector embeddings for similarity search';
COMMENT ON COLUMN documents.processing_log IS 'JSON array of processing steps and status';
COMMENT ON COLUMN documents.extracted_metadata IS 'JSON metadata extracted during OCR processing';
COMMENT ON COLUMN document_chunks.embedding IS 'Vector embedding using AWS Titan Text v2 (1536 dimensions)';
COMMENT ON COLUMN document_chunks.metadata IS 'JSON metadata about chunk extraction and processing';
COMMENT ON COLUMN document_chunks.search_vector IS 'Full-text search vector for fallback search';