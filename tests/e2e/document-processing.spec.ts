import { test, expect } from '@playwright/test';
import { TestHelpers, ApiMocker, DatabaseTestUtils } from '../utils/test-helpers';
import { DocumentTestHelpers, TestDocument } from '../utils/document-test-helpers';
import * as path from 'path';

/**
 * Document Processing Integration Test
 *
 * This test validates the complete document processing pipeline from upload to vector storage:
 * 1. Document upload to S3 storage
 * 2. OCR processing (Mistral/LlamaIndex)
 * 3. Text extraction and cleaning
 * 4. Smart chunking with semantic segmentation
 * 5. Embedding generation using AWS Titan
 * 6. Vector storage in Neon PostgreSQL
 * 7. Document status updates and progress tracking
 *
 * Test Environment: Requires fully configured AWS, Neon, and OCR services
 */

test.describe('Document Processing Pipeline', () => {
  let helpers: TestHelpers;
  let docHelpers: DocumentTestHelpers;
  let apiMocker: ApiMocker;
  let dbUtils: DatabaseTestUtils;
  let fixturesDir: string;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    docHelpers = new DocumentTestHelpers(page);
    apiMocker = new ApiMocker(page);
    dbUtils = new DatabaseTestUtils(page);
    fixturesDir = path.join(__dirname, '../fixtures');

    // Ensure database connectivity before each test
    await dbUtils.validateDatabaseHealth();
  });

  test('Complete document processing pipeline for PDF document', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes timeout for full pipeline

    // Step 1: Navigate to dashboard and ensure we have a product
    await page.goto('/dashboard/products');
    await helpers.waitForLoadingToComplete();

    // Step 2: Get test documents and upload PDF
    const testDocuments = DocumentTestHelpers.createTestDocuments();
    const pdfDocument = testDocuments.validPdf;
    const filePath = await docHelpers.createTestFile(pdfDocument, fixturesDir);

    try {
      // Upload the document
      const documentId = await docHelpers.uploadDocument(filePath, {
        documentType: 'technical',
        language: 'en',
        autoProcess: true
      });

      // Step 3: Monitor processing stages
      await docHelpers.verifyProcessingStages(['upload', 'ocr', 'chunking', 'embedding', 'indexing']);

      // Step 4: Wait for completion and verify metrics
      await docHelpers.waitForProcessingComplete('completed');
      const metrics = await docHelpers.getProcessingMetrics();

      expect(metrics.chunkCount).toBeGreaterThan(0);
      expect(metrics.extractedTextLength).toBeGreaterThan(0);
      expect(metrics.ocrConfidence).toBeGreaterThan(0.5);

      // Step 5: Test vector search functionality
      const searchResults = await docHelpers.testVectorSearch('test document', 1);
      expect(searchResults.data.results.some((result: any) => result.document_id === documentId)).toBe(true);

      // Step 6: Verify document chunks and embeddings
      await docHelpers.verifyDocumentChunks(documentId);
      await docHelpers.verifyEmbeddingQuality(documentId);

    } finally {
      DocumentTestHelpers.cleanupTestFiles([filePath]);
    }
  });

  test('Document processing handles different file types correctly', async ({ page }) => {
    test.setTimeout(90000); // 1.5 minutes timeout

    const testDocuments = DocumentTestHelpers.createTestDocuments();
    const supportedFormats = [
      testDocuments.validPdf,
      testDocuments.validJpeg,
      testDocuments.validPng,
      testDocuments.validText
    ];

    for (const document of supportedFormats) {
      await page.goto('/dashboard/products');
      const filePath = await docHelpers.createTestFile(document, fixturesDir);

      try {
        const documentId = await docHelpers.uploadDocument(filePath, {
          documentType: 'technical',
          autoProcess: true
        });

        await docHelpers.waitForProcessingComplete(document.expectedProcessing);

        if (document.expectedProcessing === 'completed') {
          const metrics = await docHelpers.getProcessingMetrics();
          expect(metrics.chunkCount).toBeGreaterThan(0);
        }

      } finally {
        DocumentTestHelpers.cleanupTestFiles([filePath]);
      }
    }
  });

  test('Error handling for unsupported file formats', async ({ page }) => {
    await page.goto('/dashboard/products');

    const testDocuments = DocumentTestHelpers.createTestDocuments();
    const unsupportedDocument = testDocuments.unsupportedFile;
    const filePath = await docHelpers.createTestFile(unsupportedDocument, fixturesDir);

    try {
      // Attempt to upload unsupported file
      await page.click('[data-testid="upload-documents-action"]');

      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.click('[data-testid="file-upload-button"]');
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles([filePath]);

      await page.selectOption('[data-testid="document-type-select"]', 'technical');
      await page.click('[data-testid="upload-submit-button"]');

      // Should show error for unsupported file type
      await expect(page.locator('[data-testid="upload-error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="upload-error-message"]')).toContainText('Unsupported file type');

    } finally {
      DocumentTestHelpers.cleanupTestFiles([filePath]);
    }
  });

  test('Document processing performance benchmarks', async ({ page }) => {
    test.setTimeout(90000); // 1.5 minutes timeout

    await page.goto('/dashboard/products');

    const testDocuments = DocumentTestHelpers.createTestDocuments();
    const largeDocument = testDocuments.largeText;

    const performance = await docHelpers.measureProcessingPerformance(largeDocument, fixturesDir);

    // Performance requirements from research.md
    expect(performance.processingTime).toBeLessThan(60000); // Under 1 minute
    expect(performance.searchTime).toBeLessThan(200); // Under 200ms for vector search
    expect(performance.metrics.chunkCount).toBeGreaterThan(5); // Multiple chunks for large document

    console.log('Performance metrics:', {
      uploadTime: `${performance.uploadTime}ms`,
      processingTime: `${performance.processingTime}ms`,
      searchTime: `${performance.searchTime}ms`,
      chunks: performance.metrics.chunkCount
    });
  });

  test('Thai language document processing', async ({ page }) => {
    await page.goto('/dashboard/products');

    const testDocuments = DocumentTestHelpers.createTestDocuments();
    const thaiDocument = testDocuments.thaiText;
    const filePath = await docHelpers.createTestFile(thaiDocument, fixturesDir);

    try {
      const documentId = await docHelpers.uploadDocument(filePath, {
        documentType: 'technical',
        language: 'th',
        autoProcess: true
      });

      await docHelpers.waitForProcessingComplete('completed');

      // Test Thai language search
      const searchResults = await docHelpers.testVectorSearch('เอกสารภาษาไทย', 1);
      expect(searchResults.data.results.length).toBeGreaterThan(0);

      // Verify Thai text handling in chunks
      const chunksData = await docHelpers.verifyDocumentChunks(documentId);
      const hasThaiContent = chunksData.data.chunks.some((chunk: any) =>
        chunk.chunk_text.includes('ภาษาไทย')
      );
      expect(hasThaiContent).toBe(true);

    } finally {
      DocumentTestHelpers.cleanupTestFiles([filePath]);
    }
  });

  test('Concurrent document processing', async ({ page, context }) => {
    test.setTimeout(120000); // 2 minutes for concurrent processing

    const testDocuments = DocumentTestHelpers.createTestDocuments();
    const documentsToTest = [
      testDocuments.validText,
      testDocuments.validPdf,
      testDocuments.validJpeg
    ];

    const documentIds = await docHelpers.testConcurrentUploads(documentsToTest, fixturesDir);

    // Verify all documents were processed successfully
    expect(documentIds).toHaveLength(documentsToTest.length);
    documentIds.forEach(id => expect(id).toBeTruthy());

    console.log(`Successfully processed ${documentIds.length} documents concurrently`);
  });

  test('Document processing failure recovery', async ({ page }) => {
    await page.goto('/dashboard/products');

    const testDocuments = DocumentTestHelpers.createTestDocuments();
    const corruptedDocument = testDocuments.corruptedPdf;
    const filePath = await docHelpers.createTestFile(corruptedDocument, fixturesDir);

    try {
      const documentId = await docHelpers.uploadDocument(filePath, {
        documentType: 'technical',
        autoProcess: true
      });

      // Verify error handling
      await docHelpers.verifyErrorHandling('OCR processing failed');

      // Test retry functionality
      await page.click('[data-testid="retry-processing-button"]');
      await expect(page.locator('[data-testid="processing-status"]')).toHaveText('processing', { timeout: 10000 });

      // Should fail again with corrupted file
      await docHelpers.waitForProcessingComplete('failed');

    } finally {
      DocumentTestHelpers.cleanupTestFiles([filePath]);
    }
  });

  test('Document metadata extraction and validation', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Create document with structured metadata
    const metadataDocument: TestDocument = {
      name: 'metadata-test-document.txt',
      type: 'text/plain',
      content: new Uint8Array(Buffer.from(`
        Title: Test Product Manual
        Version: 1.0
        Date: 2024-01-15
        Author: Test Author

        Product Specifications:
        - Model: TEST-001
        - Category: Electronics
        - Warranty: 2 years

        This is the main content of the test document.
      `)),
      expectedProcessing: 'completed',
      metadata: {
        title: 'Test Product Manual',
        version: '1.0',
        model: 'TEST-001'
      }
    };

    const filePath = await docHelpers.createTestFile(metadataDocument, fixturesDir);

    try {
      const documentId = await docHelpers.uploadDocument(filePath, {
        documentType: 'technical',
        autoProcess: true
      });

      await docHelpers.waitForProcessingComplete('completed');

      // Verify metadata extraction UI
      const metadataSection = page.locator('[data-testid="extracted-metadata"]');
      await expect(metadataSection).toBeVisible();

      // Verify metadata through API
      const metadataResponse = await page.request.get(`/api/v1/documents/${documentId}`);
      expect(metadataResponse.ok()).toBeTruthy();

      const documentData = await metadataResponse.json();
      expect(documentData.success).toBe(true);
      expect(documentData.data.extracted_metadata).toBeDefined();

      // Verify chunks contain structured information
      const chunksData = await docHelpers.verifyDocumentChunks(documentId);
      const hasStructuredContent = chunksData.data.chunks.some((chunk: any) =>
        chunk.chunk_text.includes('TEST-001') || chunk.chunk_text.includes('Product Manual')
      );
      expect(hasStructuredContent).toBe(true);

    } finally {
      DocumentTestHelpers.cleanupTestFiles([filePath]);
    }
  });
});