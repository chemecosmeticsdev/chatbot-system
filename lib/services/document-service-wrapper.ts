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
    // Simplified OCR processing - similar to our test implementation
    const document = await this.getById(id, organizationId);
    if (!document) {
      throw new Error(`Document not found: ${id}`);
    }

    // Update status to processing
    await this.client.query(
      `UPDATE documents SET processing_status = 'processing', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // Simulate OCR processing based on file type
    let extractedText = '';
    const confidence = 0.95;

    if (document.mime_type === 'application/pdf') {
      extractedText = `Extracted text from ${document.filename}. This is a placeholder for actual OCR results from PDF processing.`;
    } else if (document.mime_type.startsWith('image/')) {
      extractedText = `Extracted text from ${document.filename}. This is a placeholder for actual OCR results from image processing.`;
    } else {
      throw new Error(`Unsupported file type for OCR: ${document.mime_type}`);
    }

    // Update to completed status
    await this.client.query(
      `UPDATE documents
       SET processing_status = 'completed',
           ocr_confidence = $1,
           extracted_metadata = $2,
           processed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [
        confidence,
        JSON.stringify({
          ...document.extracted_metadata,
          ocr_completed: true,
          text_length: extractedText.length,
          confidence: confidence,
          processing_timestamp: new Date().toISOString()
        }),
        id
      ]
    );

    return {
      success: true,
      text: extractedText,
      confidence: confidence
    };
  }
}