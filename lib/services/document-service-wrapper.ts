/**
 * Document Service Wrapper
 *
 * Temporary wrapper to adapt the new schema to the existing DocumentService
 * until the full service can be updated to match the database schema
 */

import { Client } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface CreateDocumentData {
  title: string;
  filename: string;
  s3_key: string;
  mime_type: string;
  file_size: number;
  document_type: string;
  language?: string;
  extracted_metadata?: Record<string, any>;
}

export class DocumentServiceWrapper {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async create(
    data: CreateDocumentData,
    organizationId: string,
    productId: string,
    uploadedBy?: string
  ) {
    const query = `
      INSERT INTO documents (
        id, organization_id, product_id, title, filename, s3_key,
        mime_type, file_size, document_type, language, processing_status,
        extracted_metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      uuidv4(),
      organizationId,
      productId,
      data.title,
      data.filename,
      data.s3_key,
      data.mime_type,
      data.file_size,
      data.document_type,
      data.language || 'en',
      'uploaded',
      JSON.stringify(data.extracted_metadata || {}),
    ];

    const result = await this.client.query(query, values);
    return result.rows[0];
  }

  async getById(id: string, organizationId: string) {
    const query = `
      SELECT * FROM documents
      WHERE id = $1 AND organization_id = $2
    `;
    const result = await this.client.query(query, [id, organizationId]);
    return result.rows[0] || null;
  }

  async list(
    organizationId: string,
    filters: any = {},
    page: number = 1,
    limit: number = 20
  ) {
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

    if (filters.mime_type) {
      whereConditions.push(`mime_type LIKE $${paramIndex}`);
      queryParams.push(`%${filters.mime_type}%`);
      paramIndex++;
    }

    if (filters.search) {
      whereConditions.push(`(title ILIKE $${paramIndex} OR filename ILIKE $${paramIndex})`);
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }

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

    return {
      documents: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async processOCR(id: string, organizationId: string) {
    const document = await this.getById(id, organizationId);
    if (!document) {
      throw new Error(`Document not found: ${id}`);
    }

    // Update status to processing
    await this.client.query(
      `UPDATE documents SET processing_status = 'processing', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    try {
      // Import and use the real OCR service
      const { OCRService } = await import('./ocr-service');
      const ocrService = new OCRService();

      // Check if file type is supported
      if (!OCRService.isSupportedFileType(document.mime_type)) {
        throw new Error(`Unsupported file type for OCR: ${document.mime_type}`);
      }

      // Process document with OCR service
      const ocrResult = await ocrService.processDocument({
        id: document.id,
        s3_key: document.s3_key,
        mime_type: document.mime_type,
        filename: document.filename,
        file_size: document.file_size
      });

      if (!ocrResult.success) {
        throw new Error(ocrResult.error || 'OCR processing failed');
      }

      // Update to completed status with real OCR results
      await this.client.query(
        `UPDATE documents
         SET processing_status = 'completed',
             ocr_confidence = $1,
             extracted_metadata = $2,
             processed_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [
          ocrResult.confidence || 0.85,
          JSON.stringify({
            ...document.extracted_metadata,
            ocr_completed: true,
            ocr_provider: ocrResult.provider,
            text_length: ocrResult.text?.length || 0,
            confidence: ocrResult.confidence || 0.85,
            processing_timestamp: new Date().toISOString(),
            ocr_metadata: ocrResult.metadata || {}
          }),
          id
        ]
      );

      // Store extracted text in a separate table
      if (ocrResult.text) {
        await this.client.query(
          `INSERT INTO document_extracted_text (document_id, extracted_text, confidence, provider, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (document_id)
           DO UPDATE SET
             extracted_text = EXCLUDED.extracted_text,
             confidence = EXCLUDED.confidence,
             provider = EXCLUDED.provider,
             updated_at = NOW()`,
          [id, ocrResult.text, ocrResult.confidence || 0.85, ocrResult.provider || 'unknown']
        );

        // Process for vector storage (chunk + embed + store)
        try {
          const { VectorService } = await import('./vector-service');
          const vectorService = new VectorService(this.client);

          const vectorResult = await vectorService.processDocumentForVector(
            id,
            ocrResult.text,
            {
              chunk_size: 1000,
              chunk_overlap: 200,
              preserve_paragraphs: true
            }
          );

          if (vectorResult.success) {
            // Update document metadata with chunking information
            await this.client.query(
              `UPDATE documents
               SET extracted_metadata = $1
               WHERE id = $2`,
              [
                JSON.stringify({
                  ...document.extracted_metadata,
                  ocr_completed: true,
                  ocr_provider: ocrResult.provider,
                  text_length: ocrResult.text?.length || 0,
                  confidence: ocrResult.confidence || 0.85,
                  processing_timestamp: new Date().toISOString(),
                  ocr_metadata: ocrResult.metadata || {},
                  // Vector processing info
                  vector_processed: true,
                  total_chunks: vectorResult.total_chunks || 0,
                  total_tokens: vectorResult.total_tokens || 0,
                  chunking_completed_at: new Date().toISOString()
                }),
                id
              ]
            );
          } else {
            console.warn('Vector processing failed:', vectorResult.error);
            // Update metadata to indicate vector processing failed
            await this.client.query(
              `UPDATE documents
               SET extracted_metadata = $1
               WHERE id = $2`,
              [
                JSON.stringify({
                  ...document.extracted_metadata,
                  ocr_completed: true,
                  ocr_provider: ocrResult.provider,
                  text_length: ocrResult.text?.length || 0,
                  confidence: ocrResult.confidence || 0.85,
                  processing_timestamp: new Date().toISOString(),
                  ocr_metadata: ocrResult.metadata || {},
                  // Vector processing info
                  vector_processed: false,
                  vector_error: vectorResult.error,
                  chunking_failed_at: new Date().toISOString()
                }),
                id
              ]
            );
          }
        } catch (vectorError) {
          console.error('Vector processing error:', vectorError);
          // Don't fail the entire OCR process if vector processing fails
        }
      }

      return {
        success: true,
        text: ocrResult.text,
        confidence: ocrResult.confidence || 0.85,
        provider: ocrResult.provider
      };

    } catch (error) {
      console.error('OCR processing error:', error);

      // Update status to failed
      await this.client.query(
        `UPDATE documents
         SET processing_status = 'failed',
             extracted_metadata = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [
          JSON.stringify({
            ...document.extracted_metadata,
            ocr_failed: true,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            failed_at: new Date().toISOString()
          }),
          id
        ]
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}