# Document Processor Subagent

## Overview

The Document Processor subagent handles comprehensive file upload, OCR processing, and document chunking operations for the chatbot system. It integrates with Mistral OCR, LlamaIndex OCR, AWS S3 for storage, and Neon PostgreSQL for metadata persistence.

## Core Capabilities

### 1. File Upload & Validation
- **Supported Formats**: PDF, PNG, JPG, JPEG, GIF, WEBP, TXT, DOCX, MD
- **File Size Limits**: 50MB per file, 500MB batch processing
- **Validation**: MIME type verification, file integrity checks, security scanning
- **Storage**: AWS S3 with organized folder structure and metadata

### 2. OCR Processing
- **Primary Engine**: Mistral OCR API for high accuracy text extraction
- **Fallback Engine**: LlamaIndex OCR for reliability and cost optimization
- **Language Support**: Thai, English, and multi-language documents
- **Output Formats**: Raw text, structured JSON, confidence scoring

### 3. Document Chunking
- **Strategies**: Semantic chunking, fixed-size chunking, paragraph-based chunking
- **Vector Ready**: Optimized chunks for embedding generation
- **Overlap Management**: Configurable overlap for context preservation
- **Metadata Preservation**: Source tracking, page numbers, confidence scores

### 4. Database Integration
- **Storage**: Neon PostgreSQL with vector search capabilities
- **Schema**: Documents, chunks, processing jobs, metadata tables
- **Relationships**: Hierarchical document-chunk relationships
- **Indexing**: Full-text search and vector similarity indexing

## Trigger Patterns

The subagent activates on these commands:

```
"Use document-processor subagent to handle file upload and OCR processing for [file_type]"
"Process document with OCR and chunk for embedding"
"Upload and extract text from [document_description]"
"Batch process documents for knowledge base"
"Extract text from image/PDF and prepare for vector storage"
```

## Required MCP Servers

- **neon**: Database operations, vector storage, metadata management
- **aws-powertools**: S3 file operations, Lambda processing, error handling
- **context7**: Documentation and integration examples
- **sentry**: Error monitoring and debugging for processing failures

## Available Tools

- **Read/Write/Edit**: File system operations for temporary processing
- **Bash**: System commands for file manipulation and validation
- **mcp__neon__***: Database operations for metadata and chunk storage
- **mcp__aws-powertools__***: AWS service integrations and best practices

## Processing Workflow

### Phase 1: File Upload & Validation
1. **File Reception**: Validate file type, size, and structure
2. **Security Scan**: Check for malicious content or embedded scripts
3. **S3 Upload**: Store original file with organized naming convention
4. **Database Record**: Create initial document record with metadata

### Phase 2: OCR Processing
1. **Engine Selection**: Choose optimal OCR engine based on file type and language
2. **Text Extraction**: Process document through selected OCR service
3. **Quality Assessment**: Evaluate extraction confidence and completeness
4. **Fallback Processing**: Use alternative engine if primary fails or quality is low
5. **Result Storage**: Save extracted text and confidence metrics

### Phase 3: Document Chunking
1. **Strategy Selection**: Choose chunking approach based on document type and content
2. **Chunk Generation**: Create overlapping chunks optimized for vector embedding
3. **Metadata Enrichment**: Add source references, page numbers, and context markers
4. **Vector Preparation**: Format chunks for embedding generation
5. **Database Storage**: Persist chunks with relationships and searchable metadata

### Phase 4: Status & Reporting
1. **Progress Tracking**: Real-time status updates during processing
2. **Error Handling**: Comprehensive error recovery and user notification
3. **Quality Metrics**: Processing statistics and accuracy reporting
4. **Completion Notification**: Final status with access to processed content

## Database Schema

```sql
-- Documents table for file metadata
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    s3_bucket TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    upload_timestamp TIMESTAMPTZ DEFAULT NOW(),
    processing_status TEXT DEFAULT 'pending',
    ocr_engine TEXT,
    extracted_text TEXT,
    confidence_score DECIMAL(3,2),
    metadata JSONB DEFAULT '{}',
    created_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document chunks for vector storage
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_size INTEGER NOT NULL,
    overlap_start INTEGER DEFAULT 0,
    overlap_end INTEGER DEFAULT 0,
    page_number INTEGER,
    chunk_metadata JSONB DEFAULT '{}',
    embedding vector(1536), -- For OpenAI/Bedrock embeddings
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processing jobs for status tracking
CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL, -- 'upload', 'ocr', 'chunk', 'embed'
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    progress_percentage INTEGER DEFAULT 0,
    job_metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(upload_timestamp);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_document ON processing_jobs(document_id);
```

## Configuration Options

### OCR Engine Settings
```typescript
interface OCRConfig {
  primaryEngine: 'mistral' | 'llamaindex';
  fallbackEngine: 'mistral' | 'llamaindex';
  confidenceThreshold: number; // 0.0 - 1.0
  languageHints: string[]; // ['en', 'th']
  retryAttempts: number;
  timeoutMs: number;
}
```

### Chunking Strategy Settings
```typescript
interface ChunkingConfig {
  strategy: 'semantic' | 'fixed' | 'paragraph' | 'hybrid';
  chunkSize: number; // Characters
  overlapSize: number; // Characters
  minChunkSize: number;
  maxChunkSize: number;
  preserveFormatting: boolean;
  splitOnSentences: boolean;
}
```

### Processing Settings
```typescript
interface ProcessingConfig {
  batchSize: number; // Files processed simultaneously
  maxRetries: number;
  timeoutPerFile: number; // Milliseconds
  enableProgressTracking: boolean;
  notifyOnCompletion: boolean;
  autoCleanupFailed: boolean;
}
```

## API Endpoints Integration

The subagent integrates with existing API structure:

### File Upload Endpoint
```typescript
// app/api/documents/upload/route.ts
POST /api/documents/upload
- Accepts multipart/form-data
- Validates file types and sizes
- Initiates processing workflow
- Returns job ID for status tracking
```

### Processing Status Endpoint
```typescript
// app/api/documents/status/[jobId]/route.ts
GET /api/documents/status/[jobId]
- Returns real-time processing status
- Progress percentage and current phase
- Error details if processing failed
- Estimated completion time
```

### Document Retrieval Endpoint
```typescript
// app/api/documents/[documentId]/route.ts
GET /api/documents/[documentId]
- Returns document metadata
- Access to extracted text
- Chunk information and statistics
- Download links for processed content
```

### Batch Processing Endpoint
```typescript
// app/api/documents/batch/route.ts
POST /api/documents/batch
- Handles multiple file uploads
- Queues processing jobs
- Returns batch job ID
- Progress tracking for entire batch
```

## Error Handling Strategies

### File Upload Errors
- **Invalid File Type**: Clear message with supported formats
- **File Too Large**: Size limits and compression suggestions
- **Corrupted File**: Integrity check failures and re-upload guidance
- **S3 Upload Failure**: Retry logic with exponential backoff

### OCR Processing Errors
- **Engine Timeout**: Automatic fallback to secondary engine
- **Low Confidence**: Manual review flagging and improvement suggestions
- **API Rate Limits**: Queue management and retry scheduling
- **Language Detection**: Fallback to multi-language processing

### Chunking Errors
- **Text Too Short**: Skip chunking for very small documents
- **Encoding Issues**: Character encoding detection and conversion
- **Structure Problems**: Fallback to simple text splitting
- **Database Errors**: Transaction rollback and error recovery

### System Errors
- **Database Connection**: Connection pooling and retry logic
- **Storage Failures**: Multiple storage backend support
- **Memory Issues**: Streaming processing for large files
- **Network Errors**: Robust retry mechanisms

## Usage Examples

### Basic Document Upload
```typescript
// Trigger: "Use document-processor subagent to upload and process contract.pdf"

1. Validate PDF file format and size
2. Upload to S3 bucket: documents/contracts/2024/09/contract_uuid.pdf
3. Create document record in database
4. Process with Mistral OCR (primary)
5. Chunk text into 512-character segments with 50-character overlap
6. Store chunks in database with metadata
7. Return processing status and document ID
```

### Batch Image Processing
```typescript
// Trigger: "Use document-processor subagent for batch OCR of invoice images"

1. Validate all image files (PNG, JPG, JPEG)
2. Upload batch to S3: documents/invoices/batch_uuid/
3. Create processing job for batch
4. Process each image with LlamaIndex OCR
5. Extract structured data (amounts, dates, vendors)
6. Chunk and store with invoice-specific metadata
7. Generate batch processing report
```

### Multi-language Document Processing
```typescript
// Trigger: "Process Thai-English document with OCR and prepare for embedding"

1. Detect document language (Thai/English mixed)
2. Configure OCR engine for multi-language support
3. Extract text with language-specific confidence scoring
4. Apply semantic chunking preserving language boundaries
5. Generate chunks optimized for multilingual embedding
6. Store with language metadata for search optimization
```

### Large Document Batch Processing
```typescript
// Trigger: "Batch process 100+ PDF knowledge base documents"

1. Validate batch size and file types
2. Create batch processing job with progress tracking
3. Process in parallel batches of 10 files
4. Use both OCR engines for load balancing
5. Implement progressive chunking strategies
6. Store with hierarchical metadata structure
7. Generate knowledge base index and statistics
```

## Testing & Validation

### Unit Test Coverage
- File validation and type checking
- OCR engine integration and fallbacks
- Chunking algorithm accuracy
- Database operation integrity
- Error handling and recovery

### Integration Test Scenarios
- End-to-end document processing pipeline
- Batch processing with mixed file types
- OCR engine failover testing
- Database transaction consistency
- S3 storage and retrieval operations

### Performance Benchmarks
- Processing time per file type and size
- Memory usage during large file processing
- Concurrent processing limits
- Database query performance
- OCR accuracy metrics

### Error Recovery Testing
- Network interruption scenarios
- Database connection failures
- OCR service unavailability
- Storage quota exceeded
- Invalid file format handling

## Monitoring & Observability

### Key Metrics
- **Processing Rate**: Files processed per hour
- **Success Rate**: Percentage of successful processing
- **Error Rate**: Failures by category and cause
- **Performance**: Average processing time by file type
- **Quality**: OCR confidence scores and accuracy

### Alerting Thresholds
- Processing failure rate > 5%
- Average processing time > 2x baseline
- OCR confidence score < 70%
- Storage quota usage > 90%
- Database connection errors

### Logging Strategy
- Structured JSON logging for all operations
- Processing timeline with timestamps
- Error details with stack traces
- Performance metrics for optimization
- User activity and document access patterns

## Security Considerations

### File Security
- Virus scanning before processing
- Content-based file type validation
- Sandboxed processing environment
- Secure temporary file handling
- Access control for processed content

### Data Privacy
- PII detection and redaction options
- Encrypted storage for sensitive documents
- Audit logging for document access
- Retention policy compliance
- User consent tracking

### API Security
- Authentication required for all operations
- Rate limiting per user/IP
- Input validation and sanitization
- SQL injection prevention
- Cross-site scripting protection

## Scalability Architecture

### Horizontal Scaling
- Microservice-based processing architecture
- Queue-based job distribution
- Multiple OCR engine instances
- Database read replicas
- CDN for processed content delivery

### Resource Optimization
- Intelligent caching strategies
- Compression for storage efficiency
- Lazy loading for large documents
- Background processing queues
- Auto-scaling based on load

### Performance Tuning
- Database query optimization
- Index strategy for vector search
- Parallel processing pipelines
- Memory-efficient streaming
- Connection pooling

## Future Enhancements

### Advanced Features
- AI-powered document classification
- Automated data extraction templates
- Multi-modal processing (text + images)
- Real-time collaborative processing
- Advanced search capabilities

### Integration Expansions
- Additional OCR engine support
- Cloud storage provider options
- External API integrations
- Workflow automation tools
- Business intelligence dashboards

### Performance Improvements
- GPU-accelerated processing
- Edge computing deployment
- Advanced caching strategies
- Predictive processing
- Machine learning optimization

## Configuration File Reference

The subagent uses environment variables from the main project configuration:

```typescript
// From lib/config.ts - No additional environment variables needed
- DATABASE_URL: Neon PostgreSQL connection
- BAWS_ACCESS_KEY_ID: AWS access key for S3
- BAWS_SECRET_ACCESS_KEY: AWS secret key for S3
- DEFAULT_REGION: AWS region for S3 storage
- MISTRAL_API_KEY: Mistral OCR service API key
- LLAMAINDEX_API_KEY: LlamaIndex OCR service API key
```

## Activation Commands

To use the document-processor subagent, use these command patterns:

```bash
# Single file processing
"Use document-processor subagent to handle file upload and OCR processing for PDF invoice"

# Batch processing
"Use document-processor subagent for batch processing of contract documents"

# Specific OCR engine
"Process image with document-processor subagent using Mistral OCR"

# With chunking specification
"Use document-processor subagent to extract text and chunk for embedding generation"

# Multi-language processing
"Process Thai-English document with document-processor subagent"

# Status checking
"Check document processing status using document-processor subagent"
```

## Success Criteria

The subagent successfully completes when:

1. ✅ Files are uploaded and validated without errors
2. ✅ OCR processing extracts text with acceptable confidence
3. ✅ Document chunking generates vector-ready segments
4. ✅ All metadata is stored in database with proper relationships
5. ✅ Processing status is updated throughout the workflow
6. ✅ Error handling gracefully manages any failures
7. ✅ Final output includes access to processed content and statistics

## Output Format

Upon completion, the subagent provides:

```json
{
  "status": "completed",
  "documentId": "uuid-v4",
  "filename": "original-filename.pdf",
  "processingStats": {
    "fileSize": "2.5MB",
    "processingTime": "45 seconds",
    "ocrEngine": "mistral",
    "confidenceScore": 0.92,
    "chunksGenerated": 47,
    "avgChunkSize": 512
  },
  "access": {
    "documentUrl": "/api/documents/uuid",
    "chunksUrl": "/api/documents/uuid/chunks",
    "metadataUrl": "/api/documents/uuid/metadata"
  },
  "errors": [],
  "warnings": [
    "Low confidence in pages 3-4, manual review recommended"
  ]
}
```

This comprehensive document-processor subagent provides robust, scalable, and secure document processing capabilities for the chatbot system, integrating seamlessly with existing infrastructure and APIs.