import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { DocumentServiceWrapper } from '@/lib/services/document-service-wrapper';
import { getConfig } from '@/lib/config';
import { stackServerApp } from '@/stack';
import { withChatbotMonitoring } from '@/lib/monitoring/api-wrapper';

/**
 * Document Processing API Routes
 *
 * Handles OCR processing and chunking operations for documents.
 * Routes: POST /api/v1/documents/[documentId]/process
 */

// Initialize database client
function createDatabaseClient(): Client {
  const config = getConfig();
  return new Client({
    connectionString: config.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

// Get authenticated user and organization context
async function getAuthenticatedContext(request: NextRequest): Promise<{
  user: any;
  organizationId: string;
  userId: string;
}> {
  if (!stackServerApp) {
    throw new Error('Authentication not configured');
  }

  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error('Authentication required');
  }

  // Extract organization ID from user context or default
  const organizationId = user.organizationId || 'bf5e7b6e-f44c-4393-9fc4-8be04af5be45';

  return {
    user,
    organizationId,
    userId: user.id
  };
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
    // Authenticate user first
    const { organizationId, userId } = await getAuthenticatedContext(request);

    await client.connect();
    const documentService = new DocumentServiceWrapper(client);
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

    // Check processing status (using correct column name)
    if (document.processing_status === 'processing') {
      return errorResponse('Document is already being processed', 409);
    }

    if (document.processing_status === 'completed') {
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

    // Handle authentication errors
    if (error.message.includes('Authentication')) {
      return errorResponse('Authentication required', 401);
    }

    if (error.message.includes('not found')) {
      return errorResponse(error.message, 404);
    }

    if (error.message.includes('already') || error.message.includes('Cannot process')) {
      return errorResponse(error.message, 409);
    }

    return errorResponse('Internal server error', 500);
  } finally {
    await client.end();
  }
}

// Export route handler (monitoring temporarily disabled due to timeout issues)
export const POST = handlePOST;