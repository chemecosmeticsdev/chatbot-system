/**
 * Document Service
 *
 * Handles document CRUD operations, OCR processing, and chunking pipeline.
 * Integrates with AWS S3, OCR services, and vector embeddings.
 */

import { Client } from 'pg';
import {
  Document,
  DocumentWithChunks,
  DocumentListFilters,
  DocumentListResponse,
  CreateDocumentRequest,
  DocumentProcessingStatus,
  ProcessingStatus,
  DocumentType,
  DocumentUtils,
  DocumentValidation
} from '@/lib/models/document';
import { withDatabaseMonitoring, withExternalApiMonitoring } from '@/lib/monitoring/api-wrapper';

// Service-specific types that complement the model
interface CreateDocument {
  product_id: string;
  name: string;
  file_name: string;
  type: DocumentType;
  file_path: string;
  content_type: string;
  file_size: number;
  metadata?: Record<string, any>;
}

interface UpdateDocument {
  name?: string;
  type?: DocumentType;
  processing_status?: ProcessingStatus;
  metadata?: Record<string, any>;
}

// Constants
const DOCUMENT_PROCESSING_STAGES = {
  UPLOAD: 'upload',
  OCR: 'ocr',
  CHUNKING: 'chunking',
  EMBEDDING: 'embedding',
  INDEXING: 'indexing'
} as const;

const DOCUMENT_SUPPORTED_TYPES = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
] as const;
import { SentryUtils, DocumentProcessingError } from '@/lib/monitoring/sentry-utils';

export class DocumentService {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Create a new document record
   */
  async create(data: CreateDocument, organizationId: string, productId: string, uploadedBy?: string): Promise<Document> {
    return withDatabaseMonitoring(
      async () => {
        const validatedData = data;

        // Validate file type
        if (!DOCUMENT_SUPPORTED_TYPES.includes(validatedData.content_type as any)) {
          throw new DocumentProcessingError(
            `Unsupported file type: ${validatedData.content_type}`,
            { content_type: validatedData.content_type, supported_types: DOCUMENT_SUPPORTED_TYPES }
          );
        }

        const query = `
          INSERT INTO documents (
            organization_id, product_id, name, file_name, file_path, content_type,
            file_size, processing_stage, metadata, uploaded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `;

        const values = [
          organizationId,
          productId,
          validatedData.name,
          validatedData.file_name,
          validatedData.file_path,
          validatedData.content_type,
          validatedData.file_size,
          'uploaded',
          JSON.stringify(validatedData.metadata || {}),
          uploadedBy || null
        ];

        const result = await this.client.query(query, values);

        if (result.rows.length === 0) {
          throw new DocumentProcessingError('Failed to create document');
        }

        const document = result.rows[0] as Document;

        // Log successful creation
        SentryUtils.captureDocumentProcessing({
          organizationId,
          productId,
          documentId: document.id,
          stage: 'upload',
          success: true,
          metadata: {
            file_name: document.filename,
            content_type: document.mime_type,
            file_size: document.file_size
          }
        });

        return document;
      },
      {
        operation: 'create',
        table: 'documents',
        organizationId,
        additionalData: { productId, file_name: data.name }
      }
    );
  }

  /**
   * Get document by ID
   */
  async getById(id: string, organizationId: string): Promise<Document | null> {
    return withDatabaseMonitoring(
      async () => {
        const query = `
          SELECT * FROM documents
          WHERE id = $1 AND organization_id = $2
        `;

        const result = await this.client.query(query, [id, organizationId]);

        if (result.rows.length === 0) {
          return null;
        }

        return result.rows[0] as Document;
      },
      {
        operation: 'getById',
        table: 'documents',
        organizationId,
        additionalData: { documentId: id }
      }
    );
  }

  /**
   * List documents with filtering and pagination
   */
  async list(
    organizationId: string,
    filters: DocumentListFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<DocumentListResponse> {
    return withDatabaseMonitoring(
      async () => {
        const offset = (page - 1) * limit;
        const whereConditions = ['organization_id = $1'];
        const queryParams: any[] = [organizationId];
        let paramIndex = 2;

        // Apply filters
        if (filters.product_id) {
          whereConditions.push(`product_id = $${paramIndex}`);
          queryParams.push(filters.product_id);
          paramIndex++;
        }

        if (filters.processing_status) {
          whereConditions.push(`processing_status = $${paramIndex}`);
          queryParams.push(filters.processing_status);
          paramIndex++;
        }

        // Note: content_type and search filters not available in DocumentListFilters interface
        // if (filters.content_type) {
        //   whereConditions.push(`content_type LIKE $${paramIndex}`);
        //   queryParams.push(`%${filters.content_type}%`);
        //   paramIndex++;
        // }

        // if (filters.search) {
        //   whereConditions.push(`(name ILIKE $${paramIndex} OR file_name ILIKE $${paramIndex})`);
        //   queryParams.push(`%${filters.search}%`);
        //   paramIndex++;
        // }

        const whereClause = whereConditions.join(' AND ');

        // Get total count
        const countQuery = `SELECT COUNT(*) FROM documents WHERE ${whereClause}`;
        const countResult = await this.client.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].count);

        // Get documents
        const query = `
          SELECT * FROM documents
          WHERE ${whereClause}
          ORDER BY created_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(limit, offset);
        const result = await this.client.query(query, queryParams);

        const documents = result.rows.map(row => row as any);

        return {
          documents,
          pagination: {
            current_page: page,
            total_pages: Math.ceil(total / limit),
            total_items: total,
            items_per_page: limit
          }
        };
      },
      {
        operation: 'list',
        table: 'documents',
        organizationId,
        additionalData: { filters, page, limit }
      }
    );
  }

  /**
   * Update document
   */
  async update(id: string, data: UpdateDocument, organizationId: string): Promise<Document> {
    return withDatabaseMonitoring(
      async () => {
        const validatedData = data;

        if (Object.keys(validatedData).length === 0) {
          throw new DocumentProcessingError('No valid fields provided for update');
        }

        const setClauses: string[] = [];
        const queryParams: any[] = [id, organizationId];
        let paramIndex = 3;

        // Build dynamic SET clause
        Object.entries(validatedData).forEach(([key, value]) => {
          if (value !== undefined) {
            if (key === 'metadata') {
              setClauses.push(`metadata = $${paramIndex}`);
              queryParams.push(JSON.stringify(value));
            } else {
              setClauses.push(`${key} = $${paramIndex}`);
              queryParams.push(value);
            }
            paramIndex++;
          }
        });

        setClauses.push(`updated_at = NOW()`);

        const query = `
          UPDATE documents
          SET ${setClauses.join(', ')}
          WHERE id = $1 AND organization_id = $2
          RETURNING *
        `;

        const result = await this.client.query(query, queryParams);

        if (result.rows.length === 0) {
          throw new DocumentProcessingError(`Document not found: ${id}`);
        }

        return result.rows[0] as Document;
      },
      {
        operation: 'update',
        table: 'documents',
        organizationId,
        additionalData: { documentId: id, updateFields: Object.keys(data) }
      }
    );
  }

  /**
   * Delete document
   */
  async delete(id: string, organizationId: string): Promise<void> {
    return withDatabaseMonitoring(
      async () => {
        const query = `
          DELETE FROM documents
          WHERE id = $1 AND organization_id = $2
        `;

        const result = await this.client.query(query, [id, organizationId]);

        if (result.rowCount === 0) {
          throw new DocumentProcessingError(`Document not found: ${id}`);
        }

        // Log successful deletion
        SentryUtils.captureDocumentProcessing({
          organizationId,
          productId: 'unknown', // We don't have this in delete context
          documentId: id,
          stage: 'upload', // Generic stage for deletion
          success: true,
          metadata: { operation: 'delete' }
        });
      },
      {
        operation: 'delete',
        table: 'documents',
        organizationId,
        additionalData: { documentId: id }
      }
    );
  }

  /**
   * Update processing stage
   */
  async updateProcessingStage(
    id: string,
    stage: keyof typeof DOCUMENT_PROCESSING_STAGES,
    organizationId: string,
    metadata?: Record<string, any>
  ): Promise<Document> {
    return withDatabaseMonitoring(
      async () => {
        const updateData: UpdateDocument = {
          processing_status: stage === 'OCR' ? 'processing' : stage === 'EMBEDDING' ? 'completed' : 'uploaded',
          metadata
        };

        if (metadata) {
          // Merge with existing metadata
          const existingDoc = await this.getById(id, organizationId);
          if (existingDoc) {
            updateData.metadata = {
              ...existingDoc.extracted_metadata,
              ...metadata,
              [`${stage}_timestamp`]: new Date().toISOString()
            };
          }
        }

        const updatedDoc = await this.update(id, updateData, organizationId);

        // Log stage update
        SentryUtils.captureDocumentProcessing({
          organizationId,
          productId: 'unknown', // We could get this from the document if needed
          documentId: id,
          stage: stage as any,
          success: true,
          metadata
        });

        return updatedDoc;
      },
      {
        operation: 'updateProcessingStage',
        table: 'documents',
        organizationId,
        additionalData: { documentId: id, stage, metadata }
      }
    );
  }

  /**
   * Process document through OCR
   */
  async processOCR(id: string, organizationId: string): Promise<{ success: boolean; text?: string; error?: string }> {
    const startTime = Date.now();

    try {
      const document = await this.getById(id, organizationId);
      if (!document) {
        throw new DocumentProcessingError(`Document not found: ${id}`);
      }

      // Update to processing stage
      await this.updateProcessingStage(id, 'OCR', organizationId, {
        ocr_started_at: new Date().toISOString()
      });

      // Simulate OCR processing (replace with actual OCR service)
      const ocrResult = await this.performOCR(document);

      if (ocrResult.success && ocrResult.text) {
        // Update to completed stage with extracted text
        await this.updateProcessingStage(id, 'EMBEDDING', organizationId, {
          ocr_completed_at: new Date().toISOString(),
          extracted_text_length: ocrResult.text.length,
          ocr_confidence: ocrResult.confidence || 0.95
        });

        // Log successful OCR
        SentryUtils.captureDocumentProcessing({
          organizationId,
          productId: document.product_id,
          documentId: id,
          stage: 'ocr',
          success: true,
          duration: Date.now() - startTime,
          metadata: {
            text_length: ocrResult.text.length,
            confidence: ocrResult.confidence
          }
        });

        return { success: true, text: ocrResult.text };
      } else {
        // Update processing status to failed
        await this.update(id, {
          processing_status: 'failed' as ProcessingStatus,
          metadata: {
            ocr_failed_at: new Date().toISOString(),
            error_message: ocrResult.error || 'OCR processing failed'
          }
        }, organizationId);

        // Log OCR failure
        SentryUtils.captureDocumentProcessing({
          organizationId,
          productId: document.product_id,
          documentId: id,
          stage: 'ocr',
          success: false,
          duration: Date.now() - startTime,
          errorMessage: ocrResult.error || 'OCR processing failed'
        });

        return { success: false, error: ocrResult.error || 'OCR processing failed' };
      }
    } catch (error) {
      // Log OCR error
      SentryUtils.captureDocumentProcessing({
        organizationId,
        productId: 'unknown',
        documentId: id,
        stage: 'ocr',
        success: false,
        duration: Date.now() - startTime,
        errorMessage: (error as Error).message
      });

      throw error;
    }
  }

  /**
   * Perform actual OCR (placeholder for integration with OCR services)
   */
  private async performOCR(document: Document): Promise<{ success: boolean; text?: string; confidence?: number; error?: string }> {
    return withExternalApiMonitoring(
      async () => {
        // This is a placeholder - replace with actual OCR service integration
        // Could integrate with Mistral OCR, AWS Textract, Google Vision API, etc.

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simulate different outcomes based on file type
        if (document.mime_type.startsWith('image/')) {
          return {
            success: true,
            text: `Extracted text from ${document.filename}. This is a placeholder for actual OCR results.`,
            confidence: 0.95
          };
        } else if (document.mime_type === 'application/pdf') {
          return {
            success: true,
            text: `PDF text extracted from ${document.filename}. This is a placeholder for actual PDF parsing results.`,
            confidence: 0.98
          };
        } else {
          return {
            success: false,
            error: `Unsupported content type for OCR: ${document.mime_type}`
          };
        }
      },
      {
        service: 'ocr_service',
        endpoint: 'process_document',
        additionalData: {
          document_id: document.id,
          content_type: document.mime_type,
          file_size: document.file_size
        }
      }
    );
  }

  /**
   * Get document with chunks (for documents that have been processed and chunked)
   */
  async getWithChunks(id: string, organizationId: string): Promise<DocumentWithChunks | null> {
    return withDatabaseMonitoring(
      async () => {
        const query = `
          SELECT
            d.*,
            json_agg(
              json_build_object(
                'id', dc.id,
                'chunk_index', dc.chunk_index,
                'content', dc.content,
                'metadata', dc.metadata,
                'embedding_id', dc.embedding_id,
                'created_at', dc.created_at
              ) ORDER BY dc.chunk_index
            ) FILTER (WHERE dc.id IS NOT NULL) as chunks
          FROM documents d
          LEFT JOIN document_chunks dc ON d.id = dc.document_id
          WHERE d.id = $1 AND d.organization_id = $2
          GROUP BY d.id
        `;

        const result = await this.client.query(query, [id, organizationId]);

        if (result.rows.length === 0) {
          return null;
        }

        const row = result.rows[0];
        const document = row as Document;

        return {
          ...document,
          chunks: row.chunks || []
        };
      },
      {
        operation: 'getWithChunks',
        table: 'documents',
        organizationId,
        additionalData: { documentId: id }
      }
    );
  }

  /**
   * Bulk update processing stages for multiple documents
   */
  async bulkUpdateStage(
    documentIds: string[],
    stage: keyof typeof DOCUMENT_PROCESSING_STAGES,
    organizationId: string
  ): Promise<number> {
    return withDatabaseMonitoring(
      async () => {
        if (documentIds.length === 0) {
          return 0;
        }

        const placeholders = documentIds.map((_, index) => `$${index + 3}`).join(', ');
        const query = `
          UPDATE documents
          SET processing_status = $1, updated_at = NOW()
          WHERE organization_id = $2 AND id IN (${placeholders})
        `;

        const params = [DOCUMENT_PROCESSING_STAGES[stage], organizationId, ...documentIds];
        const result = await this.client.query(query, params);

        // Log bulk update
        SentryUtils.addBreadcrumb('Bulk document stage update', {
          organizationId,
          stage,
          document_count: documentIds.length,
          updated_count: result.rowCount
        });

        return result.rowCount || 0;
      },
      {
        operation: 'bulkUpdateStage',
        table: 'documents',
        organizationId,
        additionalData: { documentCount: documentIds.length, stage }
      }
    );
  }
}

export default DocumentService;