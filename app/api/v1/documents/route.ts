import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { DocumentService } from '@/lib/services/document-service';
import { getConfig } from '@/lib/config';
import { withChatbotMonitoring } from '@/lib/monitoring/api-wrapper';
import { withDocumentSecurity } from '@/lib/security/middleware';
import { executeSecureQuery, validateQueryParameters } from '@/lib/neon';
import { stackServerApp } from '@/stack';
import { z } from 'zod';

/**
 * Documents API Routes
 *
 * Handles CRUD operations for documents, file uploads, and OCR processing.
 * Follows the OpenAPI contract specification with comprehensive security.
 * REQUIRES AUTHENTICATION - Documents are protected resources.
 */

// Input validation schemas
const DocumentQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1).refine(val => val >= 1, 'Page must be positive'),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20).refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
  product_id: z.string().uuid().optional(),
  processing_stage: z.enum(['uploaded', 'processing', 'completed', 'failed']).optional(),
  content_type: z.string().max(100).optional(),
  search: z.string().max(255).optional().transform(val => val ? val.trim() : undefined),
});

const DocumentCreateSchema = z.object({
  product_id: z.string().uuid('Invalid product ID format'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  file_name: z.string().min(1, 'File name is required').max(255, 'File name too long'),
  file_path: z.string().min(1, 'File path is required').max(500, 'File path too long'),
  content_type: z.string().min(1, 'Content type is required').max(100, 'Content type too long'),
  file_size: z.number().min(1, 'File size must be positive').max(100 * 1024 * 1024, 'File too large (max 100MB)'),
  description: z.string().max(2000).optional(),
  metadata: z.record(z.any()).optional(),
});

// Allowed file types for security
const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'text/plain',
  'text/html',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

// Initialize database client
function createDatabaseClient(): Client {
  const config = getConfigSafe();
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
  // In a real implementation, this would come from the user's organization membership
  const organizationId = user.organizationId || '00000000-0000-0000-0000-000000000001';

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
 * GET /api/v1/documents
 * List documents with filtering and pagination
 * REQUIRES AUTHENTICATION
 */
async function handleGET(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    // Authenticate user first
    const { organizationId, userId } = await getAuthenticatedContext(request);

    await client.connect();
    const documentService = new DocumentService(client);

    // Validate and parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validatedParams = DocumentQuerySchema.parse(queryParams);
    const { page, limit, product_id, processing_stage, content_type, search } = validatedParams;

    // Additional security: validate search parameter for injection attempts
    if (search && !validateQueryParameters([search])) {
      return errorResponse('Invalid search parameter', 400);
    }

    // Validate product_id access - ensure user has access to this product
    if (product_id) {
      // TODO: Add product access validation
      // const hasAccess = await validateProductAccess(userId, product_id, organizationId);
      // if (!hasAccess) {
      //   return errorResponse('Access denied to specified product', 403);
      // }
    }

    const filters = { product_id, processing_stage, content_type, search };
    const result = await documentService.list(organizationId, filters, page, limit);

    return successResponse(result);

  } catch (error: any) {
    console.error('Documents GET error:', error);

    // Handle authentication errors
    if (error.message.includes('Authentication')) {
      return errorResponse('Authentication required', 401);
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400);
    }

    return errorResponse('Internal server error', 500);
  } finally {
    await client.end();
  }
}

/**
 * POST /api/v1/documents
 * Create a new document record (without file upload)
 * REQUIRES AUTHENTICATION
 */
async function handlePOST(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    // Authenticate user first
    const { organizationId, userId } = await getAuthenticatedContext(request);

    await client.connect();
    const documentService = new DocumentService(client);

    // Parse and validate request body
    let requestData;
    try {
      requestData = await request.json();
    } catch {
      return errorResponse('Invalid JSON in request body', 400);
    }

    // Validate input against schema
    const validatedData = DocumentCreateSchema.parse(requestData);

    // Additional security validations
    // 1. Validate file type is allowed
    if (!ALLOWED_CONTENT_TYPES.includes(validatedData.content_type)) {
      return errorResponse(`Unsupported file type: ${validatedData.content_type}`, 400);
    }

    // 2. Validate file path doesn't contain path traversal
    if (validatedData.file_path.includes('..') || validatedData.file_path.includes('~')) {
      return errorResponse('Invalid file path', 400);
    }

    // 3. Validate all string fields for injection attempts
    const stringFields = [
      validatedData.name,
      validatedData.file_name,
      validatedData.file_path,
      validatedData.content_type,
      validatedData.description
    ].filter(Boolean) as string[];

    if (!validateQueryParameters(stringFields)) {
      return errorResponse('Invalid characters detected in input', 400);
    }

    // 4. Validate product access - ensure user has access to this product
    // TODO: Add product access validation
    // const hasAccess = await validateProductAccess(userId, validatedData.product_id, organizationId);
    // if (!hasAccess) {
    //   return errorResponse('Access denied to specified product', 403);
    // }

    // Create document with validated data and authenticated user context
    const document = await documentService.create(
      validatedData,
      organizationId,
      validatedData.product_id,
      userId // Use authenticated user ID
    );

    return successResponse(document, 201);

  } catch (error: any) {
    console.error('Documents POST error:', error);

    // Handle authentication errors
    if (error.message.includes('Authentication')) {
      return errorResponse('Authentication required', 401);
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`, 400);
    }

    // Handle other validation errors
    if (error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('already exists') ||
        error.message.includes('Unsupported file type')) {
      return errorResponse(error.message, 400);
    }

    return errorResponse('Internal server error', 500);
  } finally {
    await client.end();
  }
}

// Export secured and monitored route handlers
export const GET = withDocumentSecurity(
  withChatbotMonitoring(handleGET, 'documents_list'),
  'documents_list'
);

export const POST = withDocumentSecurity(
  withChatbotMonitoring(handlePOST, 'documents_create'),
  'documents_create'
);