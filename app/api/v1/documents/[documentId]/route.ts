import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { DocumentService } from '@/lib/services/document-service';
import { getConfig } from '@/lib/config';
import { withChatbotMonitoring } from '@/lib/monitoring/api-wrapper';

/**
 * Individual Document API Routes
 *
 * Handles operations for specific documents by ID.
 * Routes: GET, PUT, DELETE /api/v1/documents/[documentId]
 */

// Initialize database client
function createDatabaseClient(): Client {
  const config = getConfig();
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
 * GET /api/v1/documents/[documentId]
 * Get document details with chunks (if processed)
 */
async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const documentService = new DocumentService(client);
    const organizationId = getOrganizationId(request);
    const resolvedParams = await params;
    const documentId = resolvedParams.documentId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return errorResponse('Invalid document ID format');
    }

    // Check if we want chunks included
    const { searchParams } = new URL(request.url);
    const includeChunks = searchParams.get('include_chunks') === 'true';

    let document;
    if (includeChunks) {
      document = await documentService.getWithChunks(documentId, organizationId);
    } else {
      document = await documentService.getById(documentId, organizationId);
    }

    if (!document) {
      return errorResponse('Document not found', 404);
    }

    return successResponse(document);

  } catch (error: any) {
    console.error('Document GET error:', error);
    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

/**
 * PUT /api/v1/documents/[documentId]
 * Update document
 */
async function handlePUT(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const documentService = new DocumentService(client);
    const organizationId = getOrganizationId(request);
    const resolvedParams = await params;
    const documentId = resolvedParams.documentId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return errorResponse('Invalid document ID format');
    }

    // Parse request body
    let requestData;
    try {
      requestData = await request.json();
    } catch {
      return errorResponse('Invalid JSON in request body');
    }

    // Update document
    const document = await documentService.update(documentId, requestData, organizationId);

    return successResponse(document);

  } catch (error: any) {
    console.error('Document PUT error:', error);

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return errorResponse(error.message, 404);
    }

    if (error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('No valid fields')) {
      return errorResponse(error.message, 400);
    }

    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

/**
 * DELETE /api/v1/documents/[documentId]
 * Delete document
 */
async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const documentService = new DocumentService(client);
    const organizationId = getOrganizationId(request);
    const resolvedParams = await params;
    const documentId = resolvedParams.documentId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return errorResponse('Invalid document ID format');
    }

    // Delete document
    await documentService.delete(documentId, organizationId);

    return successResponse({
      message: 'Document deleted successfully'
    });

  } catch (error: any) {
    console.error('Document DELETE error:', error);

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return errorResponse(error.message, 404);
    }

    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

// Export Sentry-monitored route handlers
export const GET = withChatbotMonitoring(handleGET, 'documents_get_by_id');
export const PUT = withChatbotMonitoring(handlePUT, 'documents_update');
export const DELETE = withChatbotMonitoring(handleDELETE, 'documents_delete');