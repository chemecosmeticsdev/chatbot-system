import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Document Processing Test Utilities
 *
 * Specialized helpers for testing document upload, processing, and vector operations
 */

export interface TestDocument {
  name: string;
  type: string;
  content: Uint8Array;
  expectedProcessing: 'completed' | 'failed';
  language?: string;
  metadata?: Record<string, any>;
}

export class DocumentTestHelpers {
  constructor(private page: Page) {}

  /**
   * Create test documents with various formats and content
   */
  static createTestDocuments(): Record<string, TestDocument> {
    return {
      validPdf: {
        name: 'test-document.pdf',
        type: 'application/pdf',
        content: new Uint8Array([
          0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, // %PDF-1.4
          0x31, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A, // Basic PDF structure
          0x3C, 0x3C, 0x2F, 0x54, 0x79, 0x70, 0x65, 0x2F, // Object definition
          0x43, 0x61, 0x74, 0x61, 0x6C, 0x6F, 0x67, 0x3E, 0x3E, 0x0A,
          0x65, 0x6E, 0x64, 0x6F, 0x62, 0x6A, 0x0A, // endobj
          0x25, 0x25, 0x45, 0x4F, 0x46 // %%EOF
        ]),
        expectedProcessing: 'completed'
      },

      validJpeg: {
        name: 'test-image.jpg',
        type: 'image/jpeg',
        content: new Uint8Array([
          0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, // JPEG header
          0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, // JFIF
          0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, // Quantization table
          ...new Array(60).fill(0x80), // Minimal JPEG data
          0xFF, 0xD9 // EOI marker
        ]),
        expectedProcessing: 'completed'
      },

      validPng: {
        name: 'test-image.png',
        type: 'image/png',
        content: new Uint8Array([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
          0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
          0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
          0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // Header data
          0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
          0x08, 0x57, 0x01, 0x01, 0x00, 0x00, 0xFF, 0xFF, // Minimal image data
          0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE5, 0x27, 0xDE, 0xFC,
          0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND
          0xAE, 0x42, 0x60, 0x82
        ]),
        expectedProcessing: 'completed'
      },

      validText: {
        name: 'test-document.txt',
        type: 'text/plain',
        content: new Uint8Array(Buffer.from(
          'Test Document Content\n\n' +
          'This is a sample document for testing the document processing pipeline.\n' +
          'It contains multiple paragraphs and should be processed successfully.\n\n' +
          'Product Information:\n' +
          '- Name: Test Product\n' +
          '- Model: TP-001\n' +
          '- Category: Electronics\n' +
          '- Features: High performance, Energy efficient\n\n' +
          'Technical Specifications:\n' +
          'Operating voltage: 12V DC\n' +
          'Power consumption: 5W\n' +
          'Operating temperature: -10°C to +60°C\n\n' +
          'Installation Instructions:\n' +
          '1. Ensure power is disconnected\n' +
          '2. Mount the device securely\n' +
          '3. Connect the cables as shown in the diagram\n' +
          '4. Apply power and verify operation'
        )),
        expectedProcessing: 'completed'
      },

      thaiText: {
        name: 'thai-document.txt',
        type: 'text/plain',
        content: new Uint8Array(Buffer.from(
          'เอกสารภาษาไทย\n\n' +
          'นี่คือเอกสารทดสอบสำหรับการประมวลผลภาษาไทย\n' +
          'ระบบควรสามารถจัดการข้อความภาษาไทยได้อย่างถูกต้อง\n\n' +
          'ข้อมูลผลิตภัณฑ์:\n' +
          '- ชื่อ: ผลิตภัณฑ์ทดสอบ\n' +
          '- รุ่น: TH-001\n' +
          '- หมวดหมู่: อิเล็กทรอนิกส์\n' +
          '- คุณสมบัติ: ประสิทธิภาพสูง ประหยัดพลังงาน\n\n' +
          'คำแนะนำการติดตั้ง:\n' +
          '1. ตรวจสอบให้แน่ใจว่าไฟฟ้าถูกตัดออก\n' +
          '2. ติดตั้งอุปกรณ์อย่างมั่นคง\n' +
          '3. เชื่อมต่อสายเคเบิลตามแผนภาพ\n' +
          '4. เปิดไฟฟ้าและตรวจสอบการทำงาน',
          'utf8'
        )),
        expectedProcessing: 'completed',
        language: 'th'
      },

      largeText: {
        name: 'large-document.txt',
        type: 'text/plain',
        content: new Uint8Array(Buffer.from(
          'Large Document for Performance Testing\n\n' +
          'This document contains repeated content to test processing performance.\n\n' +
          ('Product specification paragraph repeated for testing. ' +
           'This content simulates a real document with substantial text that ' +
           'needs to be processed through the OCR, chunking, and embedding pipeline. ' +
           'The system should handle this efficiently and within performance requirements.\n\n'
          ).repeat(500) // ~100KB of text
        )),
        expectedProcessing: 'completed'
      },

      corruptedPdf: {
        name: 'corrupted.pdf',
        type: 'application/pdf',
        content: new Uint8Array([0x00, 0x00, 0x00, 0x00]), // Invalid PDF
        expectedProcessing: 'failed'
      },

      unsupportedFile: {
        name: 'test-executable.exe',
        type: 'application/octet-stream',
        content: new Uint8Array([0x4D, 0x5A, 0x90, 0x00]), // PE header
        expectedProcessing: 'failed'
      }
    };
  }

  /**
   * Create a test file on disk
   */
  async createTestFile(document: TestDocument, fixturesDir: string): Promise<string> {
    const filePath = path.join(fixturesDir, document.name);

    // Ensure directory exists
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    fs.writeFileSync(filePath, document.content);
    return filePath;
  }

  /**
   * Upload a document through the UI
   */
  async uploadDocument(
    filePath: string,
    options: {
      documentType?: string;
      language?: string;
      autoProcess?: boolean;
    } = {}
  ): Promise<string> {
    // Navigate to upload form
    await this.page.click('[data-testid="upload-documents-action"]');

    // Handle file selection
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.page.click('[data-testid="file-upload-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([filePath]);

    // Set document options
    if (options.documentType) {
      await this.page.selectOption('[data-testid="document-type-select"]', options.documentType);
    }

    if (options.language) {
      await this.page.selectOption('[data-testid="document-language-select"]', options.language);
    }

    if (options.autoProcess !== false) {
      await this.page.check('[data-testid="auto-process-checkbox"]');
    }

    // Submit upload
    await this.page.click('[data-testid="upload-submit-button"]');

    // Wait for upload confirmation
    await expect(this.page.locator('[data-testid="upload-success-message"]')).toBeVisible();

    // Navigate to processing status and get document ID
    await this.page.click('[data-testid="view-processing-status"]');
    const documentId = await this.page.locator('[data-testid="document-id"]').textContent();

    if (!documentId) {
      throw new Error('Failed to get document ID after upload');
    }

    return documentId;
  }

  /**
   * Wait for document processing to complete
   */
  async waitForProcessingComplete(expectedStatus: 'completed' | 'failed' = 'completed', timeout = 90000) {
    await expect(this.page.locator('[data-testid="processing-status"]')).toHaveText(expectedStatus, { timeout });
  }

  /**
   * Verify processing stages
   */
  async verifyProcessingStages(expectedStages: string[]) {
    for (const stage of expectedStages) {
      const stageStatus = this.page.locator(`[data-testid="${stage}-stage-status"]`);
      await expect(stageStatus).toHaveText('completed', { timeout: 60000 });
    }
  }

  /**
   * Get processing metrics
   */
  async getProcessingMetrics(): Promise<{
    processingTime: number;
    chunkCount: number;
    ocrConfidence?: number;
    extractedTextLength: number;
  }> {
    const processingTimeText = await this.page.locator('[data-testid="processing-time"]').textContent();
    const chunkCountText = await this.page.locator('[data-testid="chunk-count"]').textContent();
    const ocrConfidenceText = await this.page.locator('[data-testid="ocr-confidence"]').textContent();
    const extractedTextLengthText = await this.page.locator('[data-testid="extracted-text-length"]').textContent();

    return {
      processingTime: parseFloat(processingTimeText || '0'),
      chunkCount: parseInt(chunkCountText || '0'),
      ocrConfidence: ocrConfidenceText ? parseFloat(ocrConfidenceText) : undefined,
      extractedTextLength: parseInt(extractedTextLengthText || '0')
    };
  }

  /**
   * Test vector search functionality
   */
  async testVectorSearch(
    query: string,
    expectedResults: number = 1,
    filters?: {
      product_ids?: string[];
      document_types?: string[];
    }
  ): Promise<any> {
    const searchResponse = await this.page.request.post('/api/v1/search/vector', {
      data: {
        query,
        k: 10,
        score_threshold: 0.5,
        filters
      }
    });

    expect(searchResponse.ok()).toBeTruthy();
    const searchData = await searchResponse.json();
    expect(searchData.success).toBe(true);
    expect(searchData.data.results.length).toBeGreaterThanOrEqual(expectedResults);

    return searchData;
  }

  /**
   * Verify document chunks via API
   */
  async verifyDocumentChunks(documentId: string): Promise<any> {
    const chunksResponse = await this.page.request.get(`/api/v1/documents/${documentId}/chunks`);
    expect(chunksResponse.ok()).toBeTruthy();

    const chunksData = await chunksResponse.json();
    expect(chunksData.success).toBe(true);
    expect(chunksData.data.chunks.length).toBeGreaterThan(0);

    // Verify chunk structure
    chunksData.data.chunks.forEach((chunk: any) => {
      expect(chunk).toHaveProperty('id');
      expect(chunk).toHaveProperty('chunk_text');
      expect(chunk).toHaveProperty('chunk_type');
      expect(chunk).toHaveProperty('embedding_model');
      expect(chunk.chunk_text.length).toBeGreaterThan(0);
    });

    return chunksData;
  }

  /**
   * Test concurrent document uploads
   */
  async testConcurrentUploads(documents: TestDocument[], fixturesDir: string): Promise<string[]> {
    const uploadPromises = documents.map(async (doc, index) => {
      const filePath = await this.createTestFile(doc, fixturesDir);

      // Create a new context for each upload to simulate concurrent users
      const context = await this.page.context().browser()!.newContext();
      const newPage = await context.newPage();

      try {
        await newPage.goto('/dashboard/products');
        const helpers = new DocumentTestHelpers(newPage);

        const documentId = await helpers.uploadDocument(filePath, {
          documentType: 'technical',
          language: doc.language || 'en'
        });

        await helpers.waitForProcessingComplete(doc.expectedProcessing);

        return documentId;
      } finally {
        await context.close();
        fs.unlinkSync(filePath);
      }
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Verify error handling for failed documents
   */
  async verifyErrorHandling(expectedErrorMessage?: string) {
    await this.waitForProcessingComplete('failed');

    // Error message should be displayed
    await expect(this.page.locator('[data-testid="error-message"]')).toBeVisible();

    if (expectedErrorMessage) {
      await expect(this.page.locator('[data-testid="error-message"]')).toContainText(expectedErrorMessage);
    }

    // Recovery options should be available
    await expect(this.page.locator('[data-testid="retry-processing-button"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="remove-document-button"]')).toBeVisible();
  }

  /**
   * Clean up test files
   */
  static cleanupTestFiles(filePaths: string[]) {
    filePaths.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  }

  /**
   * Verify embedding quality
   */
  async verifyEmbeddingQuality(documentId: string, minSimilarity = 0.8) {
    const chunksData = await this.verifyDocumentChunks(documentId);

    // Test similarity between related chunks
    const chunks = chunksData.data.chunks;
    if (chunks.length > 1) {
      const searchResult = await this.testVectorSearch(chunks[0].chunk_text, 1);
      const topResult = searchResult.data.results[0];

      expect(topResult.similarity_score).toBeGreaterThan(minSimilarity);
    }
  }

  /**
   * Performance test helper
   */
  async measureProcessingPerformance(document: TestDocument, fixturesDir: string): Promise<{
    uploadTime: number;
    processingTime: number;
    searchTime: number;
    metrics: any;
  }> {
    const filePath = await this.createTestFile(document, fixturesDir);

    try {
      // Measure upload time
      const uploadStart = Date.now();
      const documentId = await this.uploadDocument(filePath, { documentType: 'technical' });
      const uploadTime = Date.now() - uploadStart;

      // Measure processing time
      const processingStart = Date.now();
      await this.waitForProcessingComplete('completed');
      const processingTime = Date.now() - processingStart;

      // Get processing metrics
      const metrics = await this.getProcessingMetrics();

      // Measure search time
      const searchStart = Date.now();
      await this.testVectorSearch('test content');
      const searchTime = Date.now() - searchStart;

      return {
        uploadTime,
        processingTime,
        searchTime,
        metrics
      };
    } finally {
      fs.unlinkSync(filePath);
    }
  }
}