-- Migration: 003_create_documents.sql
-- Description: Create documents table for file storage and processing
-- Dependencies: 002_create_products.sql

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_organization ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_product ON documents(product_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_language ON documents(language);
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_hash_org ON documents(content_hash, organization_id) WHERE content_hash IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();