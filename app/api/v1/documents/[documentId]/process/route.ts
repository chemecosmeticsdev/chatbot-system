import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { DocumentService } from '@/lib/services/document-service';
import { getConfig } from '@/lib/config';
import { withChatbotMonitoring } from '@/lib/monitoring/api-wrapper';

/**
 * Document Processing API Routes
 *
 * Handles OCR processing and chunking operations for documents.
 * Routes: POST /api/v1/documents/[documentId]/process
 */

// Initialize database client
function createDatabaseClient(): Client {
  const config = getConfigSafe();
  return new Client({
    connectionString: config.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

// Get organization ID from request (placeholder - integrate with Stack Auth)
function getOrganizationId(request: NextRequest): string {
  // TODO: Extract from authenticated user context
  return '00000000-0000-0000-0000-000000000001';
}

// Error response helper
function errorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

// Success response helper
function successResponse(data: any, status: number = 200) {
  return NextResponse.json(
    { success: true, data },
    { status }
  );
}

/**
 * POST /api/v1/documents/[documentId]/process
 * Trigger OCR processing for a document
 */
async function handlePOST(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const documentService = new DocumentService(client);
    const organizationId = getOrganizationId(request);
    const documentId = params.documentId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return errorResponse('Invalid document ID format');
    }

    // Check if document exists and is in the right state
    const document = await documentService.getById(documentId, organizationId);
    if (!document) {
      return errorResponse('Document not found', 404);
    }

    // Check processing stage
    if (document.processing_stage === 'processing') {
      return errorResponse('Document is already being processed', 409);
    }

    if (document.processing_stage === 'completed') {
      return errorResponse('Document has already been processed', 409);
    }

    // Start OCR processing
    const result = await documentService.processOCR(documentId, organizationId);

    if (result.success) {
      return successResponse({
        message: 'Document processing completed successfully',
        extracted_text_length: result.text?.length || 0,
        processing_time: 'varies' // Could be enhanced to return actual time
      });
    } else {
      return errorResponse(result.error || 'OCR processing failed', 422);
    }

  } catch (error: any) {
    console.error('Document processing error:', error);

    if (error.message.includes('not found')) {
      return errorResponse(error.message, 404);
    }

    if (error.message.includes('already') || error.message.includes('Cannot process')) {
      return errorResponse(error.message, 409);
    }

    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

// Export Sentry-monitored route handler
export const POST = withChatbotMonitoring(handlePOST, 'documents_process_ocr');