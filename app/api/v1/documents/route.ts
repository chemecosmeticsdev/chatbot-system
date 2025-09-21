import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { DocumentServiceWrapper } from '@/lib/services/document-service-wrapper';
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
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  filename: z.string().min(1, 'Filename is required').max(255, 'Filename too long'),
  s3_key: z.string().min(1, 'S3 key is required').max(500, 'S3 key too long'),
  mime_type: z.string().min(1, 'MIME type is required').max(100, 'MIME type too long'),
  file_size: z.number().min(1, 'File size must be positive').max(100 * 1024 * 1024, 'File too large (max 100MB)'),
  document_type: z.enum(['technical', 'legal', 'marketing', 'financial', 'other']),
  language: z.string().max(10).optional().default('en'),
  extracted_metadata: z.record(z.any()).optional(),
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
  // In a real implementation, this would come from the user's organization membership
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
    const documentService = new DocumentServiceWrapper(client);

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
    const documentService = new DocumentServiceWrapper(client);

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
    if (!ALLOWED_CONTENT_TYPES.includes(validatedData.mime_type)) {
      return errorResponse(`Unsupported file type: ${validatedData.mime_type}`, 400);
    }

    // 2. Validate S3 key doesn't contain path traversal
    if (validatedData.s3_key.includes('..') || validatedData.s3_key.includes('~')) {
      return errorResponse('Invalid S3 key', 400);
    }

    // 3. Validate all string fields for injection attempts
    const stringFields = [
      validatedData.title,
      validatedData.filename,
      validatedData.s3_key,
      validatedData.mime_type,
      validatedData.document_type
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
    // Transform to DocumentService expected format
    const documentData = {
      title: validatedData.title,
      filename: validatedData.filename,
      s3_key: validatedData.s3_key,
      mime_type: validatedData.mime_type,
      file_size: validatedData.file_size,
      document_type: validatedData.document_type,
      language: validatedData.language,
      extracted_metadata: validatedData.extracted_metadata || {}
    };

    const document = await documentService.create(
      documentData,
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

// Export route handlers (monitoring temporarily disabled due to timeout issues)
export const GET = handleGET;
export const POST = handlePOST;