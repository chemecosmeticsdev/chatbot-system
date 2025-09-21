# Document Processing Integration Test

## Overview

The `document-processing.spec.ts` file contains comprehensive integration tests for the complete document processing pipeline, validating the workflow from upload to vector storage.

## Test Coverage

### Core Pipeline Tests

1. **Complete Document Processing Pipeline** - Tests the full workflow:
   - Document upload to S3 storage
   - OCR processing (Mistral/LlamaIndex)
   - Text extraction and cleaning
   - Smart chunking with semantic segmentation
   - Embedding generation using AWS Titan
   - Vector storage in Neon PostgreSQL
   - Document status updates and progress tracking

2. **Multiple File Format Support** - Validates processing of:
   - PDF documents (with OCR)
   - JPEG images (with OCR)
   - PNG images (with OCR)
   - Plain text files (direct processing)

3. **Error Handling** - Tests system resilience:
   - Unsupported file format rejection
   - Corrupted file processing failures
   - Error recovery and retry mechanisms
   - Graceful degradation

### Performance & Quality Tests

4. **Performance Benchmarks** - Validates:
   - Processing time under 60 seconds for large documents
   - Vector search response time under 200ms
   - Chunk generation efficiency
   - Memory and resource usage

5. **Embedding Quality** - Verifies:
   - Proper embedding model usage (AWS Titan Text v2)
   - Similarity scoring accuracy
   - Vector index performance
   - Search relevance

### Internationalization Tests

6. **Thai Language Support** - Tests:
   - Thai text processing and chunking
   - Thai language vector search
   - Proper character encoding handling
   - Culturally appropriate processing

### Advanced Scenarios

7. **Concurrent Processing** - Validates:
   - Multiple simultaneous document uploads
   - Resource contention handling
   - Processing queue management
   - System stability under load

8. **Metadata Extraction** - Tests:
   - Structured data extraction from documents
   - Metadata validation and storage
   - Search by metadata fields
   - Document classification

## Test Architecture

### Helper Utilities

The tests use specialized helper classes:

- **DocumentTestHelpers** - Document-specific testing utilities
- **TestHelpers** - General purpose test helpers
- **ApiMocker** - API response mocking for isolation
- **DatabaseTestUtils** - Database connectivity and health checks

### Test Data Management

- Programmatic test file generation (no committed binaries)
- Automatic cleanup of temporary files
- Minimal valid file formats for fast testing
- Structured test document library

### Performance Monitoring

Each test captures:
- Processing time metrics
- Memory usage patterns
- API response times
- Error rates and recovery times

## Prerequisites

### Required Services

- **Neon PostgreSQL** with pgvector extension
- **AWS Bedrock** access (Titan Text Embeddings v2)
- **AWS S3** for document storage
- **Stack Auth** for authentication
- **OCR Services** (Mistral OCR and/or LlamaIndex)

### Environment Configuration

Ensure all environment variables are configured:

```bash
# Database
DATABASE_URL=<postgresql_connection_string>

# AWS Services (BAWS prefix for Amplify)
BAWS_ACCESS_KEY_ID=<aws_access_key_id>
BAWS_SECRET_ACCESS_KEY=<aws_secret_access_key>
DEFAULT_REGION=ap-southeast-1
BEDROCK_REGION=us-east-1

# Authentication
NEXT_PUBLIC_STACK_PROJECT_ID=<project_id>
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=<publishable_key>
STACK_SECRET_SERVER_KEY=<secret_server_key>

# OCR Services
MISTRAL_API_KEY=<mistral_api_key>
LLAMAINDEX_API_KEY=<llamaindex_api_key>
```

## Running the Tests

### Individual Test Execution

```bash
# Run specific test
npx playwright test tests/e2e/document-processing.spec.ts -g "Complete document processing pipeline"

# Run with debug output
npx playwright test tests/e2e/document-processing.spec.ts --debug

# Run in headed mode
npx playwright test tests/e2e/document-processing.spec.ts --headed
```

### Full Test Suite

```bash
# Run all document processing tests
npx playwright test tests/e2e/document-processing.spec.ts

# Run with performance reporting
npx playwright test tests/e2e/document-processing.spec.ts --reporter=html
```

### CI/CD Integration

The tests are designed for CI/CD environments:

- Automatic service health checks before test execution
- Graceful handling of service unavailability
- Performance regression detection
- Comprehensive error reporting

## Expected Outcomes

### Success Criteria

1. **Processing Time**: Documents process within performance thresholds
2. **Accuracy**: OCR confidence scores above 50% for test documents
3. **Search Quality**: Vector search returns relevant results with similarity scores > 0.5
4. **Reliability**: Error handling gracefully manages failures and provides recovery options
5. **Scalability**: Concurrent processing completes without resource conflicts

### Performance Targets

- **Upload Time**: < 5 seconds for files under 10MB
- **OCR Processing**: < 30 seconds for standard documents
- **Chunking**: < 10 seconds for text segmentation
- **Embedding Generation**: < 30 seconds for standard chunks
- **Vector Indexing**: < 10 seconds for database storage
- **Search Response**: < 200ms for similarity queries

### Quality Metrics

- **OCR Confidence**: > 85% for clear documents
- **Chunk Relevance**: Semantic chunks maintain context
- **Embedding Quality**: Similar content has high similarity scores (> 0.8)
- **Search Accuracy**: Relevant results ranked higher than irrelevant ones

## Troubleshooting

### Common Issues

1. **Service Connectivity**: Verify all external services are accessible
2. **Authentication**: Ensure Stack Auth credentials are valid
3. **Performance**: Check system resources during large document processing
4. **Embeddings**: Verify AWS Bedrock access and quota limits

### Debug Mode

Run tests with additional logging:

```bash
DEBUG=pw:* npx playwright test tests/e2e/document-processing.spec.ts
```

### Test Data Inspection

Examine generated test files:

```bash
ls -la tests/fixtures/
```

## Integration with CI/CD

### GitHub Actions

The tests integrate with the existing CI/CD pipeline:

```yaml
- name: Run Document Processing Tests
  run: |
    npm run test:e2e:document-processing

- name: Generate Performance Report
  run: |
    npm run test:performance:document-processing
```

### Performance Monitoring

Results are tracked for:
- Processing time trends
- Error rate changes
- Resource usage patterns
- Search quality metrics

## Future Enhancements

### Planned Improvements

1. **Multi-language Support** - Expand beyond Thai/English
2. **Advanced OCR** - Integration with more OCR providers
3. **Smart Chunking** - AI-powered semantic segmentation
4. **Quality Scoring** - Advanced relevance metrics
5. **Cost Optimization** - Intelligent model selection

### Monitoring Integration

- Real-time performance dashboards
- Alert thresholds for degradation
- Automated performance regression detection
- Cost tracking and optimization

---

This test suite ensures the document processing pipeline meets all requirements from the research and quickstart documentation, providing comprehensive validation of the core knowledge base functionality.