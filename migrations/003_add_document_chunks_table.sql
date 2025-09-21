-- Migration: Add document_chunks table for vector storage
-- Description: Store document chunks with embeddings for vector search

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_chunks table
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding vector(512), -- 512-dimensional vectors for Titan embeddings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
ON document_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_chunk_index
ON document_chunks(document_id, chunk_index);

-- Vector similarity search index (HNSW for fast approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw
ON document_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Alternative IVFFlat index (good for exact nearest neighbor with many vectors)
-- CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_ivfflat
-- ON document_chunks USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_document_chunks_created_at
ON document_chunks(created_at);

-- GIN index on metadata for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_document_chunks_metadata_gin
ON document_chunks USING gin(metadata);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_chunks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_chunks_updated_at
    BEFORE UPDATE ON document_chunks
    FOR EACH ROW
    EXECUTE FUNCTION update_document_chunks_updated_at();

-- Add unique constraint to prevent duplicate chunk indexes per document
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_chunks_unique_chunk
ON document_chunks(document_id, chunk_index);

-- Add comments for documentation
COMMENT ON TABLE document_chunks IS 'Stores document chunks with vector embeddings for similarity search';
COMMENT ON COLUMN document_chunks.document_id IS 'Reference to the source document';
COMMENT ON COLUMN document_chunks.chunk_index IS 'Sequential index of the chunk within the document';
COMMENT ON COLUMN document_chunks.content IS 'Text content of the chunk';
COMMENT ON COLUMN document_chunks.metadata IS 'Additional metadata about the chunk (type, length, etc.)';
COMMENT ON COLUMN document_chunks.embedding IS '512-dimensional vector embedding for similarity search';
COMMENT ON COLUMN document_chunks.created_at IS 'When the chunk was created';
COMMENT ON COLUMN document_chunks.updated_at IS 'When the chunk was last updated';

-- Add check constraints
ALTER TABLE document_chunks
ADD CONSTRAINT check_chunk_index_positive
CHECK (chunk_index >= 0);

ALTER TABLE document_chunks
ADD CONSTRAINT check_content_not_empty
CHECK (length(trim(content)) > 0);

-- Create a view for document statistics
CREATE OR REPLACE VIEW document_chunk_stats AS
SELECT
    d.id as document_id,
    d.title,
    d.filename,
    COUNT(dc.id) as total_chunks,
    COUNT(dc.embedding) as chunks_with_embeddings,
    AVG(length(dc.content)) as avg_chunk_length,
    MAX(dc.chunk_index) as max_chunk_index,
    d.processing_status,
    d.created_at as document_created_at,
    MAX(dc.created_at) as last_chunk_created_at
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_id
GROUP BY d.id, d.title, d.filename, d.processing_status, d.created_at;

COMMENT ON VIEW document_chunk_stats IS 'Summary statistics for document chunking and embedding status';