/**
 * Document Model
 *
 * Represents documents in the knowledge base system.
 * Documents are processed through OCR and chunked for vector search.
 */

export interface Document {
  id: string;
  organization_id: string;
  product_id: string;
  title: string;
  filename: string;
  s3_key: string;
  file_size: number;
  mime_type: string;
  document_type: DocumentType;
  language: string;
  processing_status: ProcessingStatus;
  processing_log: ProcessingLogEntry[];
  content_hash?: string;
  extracted_metadata: Record<string, any>;
  ocr_confidence?: number;
  created_at: Date;
  updated_at: Date;
  processed_at?: Date;
}

export type DocumentType = 'technical' | 'regulatory' | 'safety' | 'marketing' | 'certification';

export type ProcessingStatus = 'uploaded' | 'processing' | 'completed' | 'failed';

export interface ProcessingLogEntry {
  timestamp: Date;
  stage: string;
  status: 'started' | 'completed' | 'failed';
  message?: string;
  error?: string;
  duration_ms?: number;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_text: string;
  chunk_type: ChunkType;
  chunk_index: number;
  token_count?: number;
  embedding?: number[]; // Vector embedding
  embedding_model: string;
  confidence_score?: number;
  metadata: Record<string, any>;
  search_vector?: string; // PostgreSQL tsvector
  created_at: Date;
}

export type ChunkType = 'product_level' | 'formulation_level' | 'ingredient_level';

export interface CreateDocumentRequest {
  product_id: string;
  title: string;
  filename: string;
  s3_key: string;
  file_size: number;
  mime_type: string;
  document_type: DocumentType;
  language?: string;
  content_hash?: string;
  extracted_metadata?: Record<string, any>;
}

export interface DocumentSummary {
  id: string;
  title: string;
  document_type: DocumentType;
  file_size: number;
  processing_status: ProcessingStatus;
  chunk_count: number;
  created_at: Date;
}

export interface DocumentWithChunks extends Document {
  chunks: DocumentChunk[];
}

export interface DocumentListFilters {
  product_id?: string;
  document_type?: DocumentType;
  processing_status?: ProcessingStatus;
  language?: string;
}

export interface DocumentListResponse {
  documents: DocumentSummary[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

export interface DocumentProcessingStatus {
  document_id: string;
  title: string;
  processing_status: ProcessingStatus;
  progress_percentage: number;
  error_message?: string;
  chunks_created: number;
  processing_started_at?: Date;
  processing_completed_at?: Date;
}

/**
 * Document validation schema
 */
export class DocumentValidation {
  static readonly SUPPORTED_MIME_TYPES = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/tiff'
  ];

  static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  static validateCreate(data: any): CreateDocumentRequest {
    if (!data.product_id || typeof data.product_id !== 'string') {
      throw new Error('Product ID is required and must be a string');
    }

    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      throw new Error('Document title is required and must be a non-empty string');
    }

    if (!data.filename || typeof data.filename !== 'string') {
      throw new Error('Filename is required and must be a string');
    }

    if (!data.s3_key || typeof data.s3_key !== 'string') {
      throw new Error('S3 key is required and must be a string');
    }

    if (!data.file_size || typeof data.file_size !== 'number' || data.file_size <= 0) {
      throw new Error('File size is required and must be a positive number');
    }

    if (data.file_size > this.MAX_FILE_SIZE) {
      throw new Error(`File size cannot exceed ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    if (!data.mime_type || typeof data.mime_type !== 'string') {
      throw new Error('MIME type is required and must be a string');
    }

    if (!this.SUPPORTED_MIME_TYPES.includes(data.mime_type)) {
      throw new Error(`Unsupported MIME type. Supported types: ${this.SUPPORTED_MIME_TYPES.join(', ')}`);
    }

    if (!data.document_type || !['technical', 'regulatory', 'safety', 'marketing', 'certification'].includes(data.document_type)) {
      throw new Error('Document type must be one of: technical, regulatory, safety, marketing, certification');
    }

    if (data.title.length > 255) {
      throw new Error('Document title must be 255 characters or less');
    }

    if (data.filename.length > 500) {
      throw new Error('Filename must be 500 characters or less');
    }

    if (data.s3_key.length > 1000) {
      throw new Error('S3 key must be 1000 characters or less');
    }

    return {
      product_id: data.product_id,
      title: data.title.trim(),
      filename: data.filename,
      s3_key: data.s3_key,
      file_size: data.file_size,
      mime_type: data.mime_type,
      document_type: data.document_type,
      language: data.language || 'en',
      content_hash: data.content_hash,
      extracted_metadata: data.extracted_metadata || {}
    };
  }

  static validateUUID(id: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error('Invalid UUID format');
    }
  }

  static validateLanguageCode(code: string): boolean {
    // ISO 639-1 language codes (simplified validation)
    const validCodes = ['en', 'th', 'zh', 'ja', 'ko', 'de', 'fr', 'es', 'it', 'pt', 'ru'];
    return validCodes.includes(code);
  }
}

/**
 * Document utility functions
 */
export class DocumentUtils {
  /**
   * Extract file extension from filename
   */
  static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Generate content hash from file buffer
   */
  static async generateContentHash(buffer: Buffer): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Determine if file type supports OCR
   */
  static supportsOCR(mimeType: string): boolean {
    const ocrSupportedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff'
    ];
    return ocrSupportedTypes.includes(mimeType);
  }

  /**
   * Estimate processing time based on file size and type
   */
  static estimateProcessingTime(fileSize: number, mimeType: string): number {
    const baseSizePerSecond = this.supportsOCR(mimeType) ? 1024 * 1024 : 5 * 1024 * 1024; // 1MB/s for OCR, 5MB/s for text
    return Math.ceil(fileSize / baseSizePerSecond);
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  /**
   * Create processing log entry
   */
  static createLogEntry(
    stage: string,
    status: 'started' | 'completed' | 'failed',
    message?: string,
    error?: string,
    startTime?: Date
  ): ProcessingLogEntry {
    const entry: ProcessingLogEntry = {
      timestamp: new Date(),
      stage,
      status,
      message,
      error
    };

    if (startTime && status === 'completed') {
      entry.duration_ms = Date.now() - startTime.getTime();
    }

    return entry;
  }

  /**
   * Calculate processing progress
   */
  static calculateProgress(log: ProcessingLogEntry[]): number {
    const stages = ['upload', 'ocr', 'chunking', 'embedding', 'indexing'];
    const completedStages = stages.filter(stage =>
      log.some(entry => entry.stage === stage && entry.status === 'completed')
    );

    return Math.round((completedStages.length / stages.length) * 100);
  }

  /**
   * Format document for display
   */
  static formatForDisplay(document: Document): any {
    return {
      ...document,
      file_size_formatted: this.formatFileSize(document.file_size),
      created_at: document.created_at.toISOString(),
      updated_at: document.updated_at.toISOString(),
      processed_at: document.processed_at?.toISOString(),
      progress_percentage: this.calculateProgress(document.processing_log)
    };
  }
}