-- Migration: Add document_extracted_text table for OCR results
-- Description: Store extracted text from documents separately for efficient processing

-- Create document_extracted_text table
CREATE TABLE IF NOT EXISTS document_extracted_text (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    extracted_text TEXT NOT NULL,
    confidence DECIMAL(5,4) DEFAULT 0.85 CHECK (confidence >= 0 AND confidence <= 1),
    provider VARCHAR(50) NOT NULL DEFAULT 'unknown',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint on document_id (one extracted text per document)
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_extracted_text_document_id
ON document_extracted_text(document_id);

-- Create index on provider for analytics
CREATE INDEX IF NOT EXISTS idx_document_extracted_text_provider
ON document_extracted_text(provider);

-- Create index on confidence for quality filtering
CREATE INDEX IF NOT EXISTS idx_document_extracted_text_confidence
ON document_extracted_text(confidence);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_document_extracted_text_created_at
ON document_extracted_text(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_extracted_text_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_extracted_text_updated_at
    BEFORE UPDATE ON document_extracted_text
    FOR EACH ROW
    EXECUTE FUNCTION update_document_extracted_text_updated_at();

-- Add comments for documentation
COMMENT ON TABLE document_extracted_text IS 'Stores OCR extracted text from documents';
COMMENT ON COLUMN document_extracted_text.document_id IS 'Reference to the source document';
COMMENT ON COLUMN document_extracted_text.extracted_text IS 'Text extracted from the document via OCR';
COMMENT ON COLUMN document_extracted_text.confidence IS 'OCR confidence score (0.0 to 1.0)';
COMMENT ON COLUMN document_extracted_text.provider IS 'OCR provider used (mistral, llamaindex, direct, etc.)';
COMMENT ON COLUMN document_extracted_text.created_at IS 'When the text was first extracted';
COMMENT ON COLUMN document_extracted_text.updated_at IS 'When the text was last updated';