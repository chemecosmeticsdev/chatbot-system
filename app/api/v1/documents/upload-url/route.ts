import { NextRequest, NextResponse } from 'next/server';
import { getS3Client } from '@/lib/aws';
import { getConfig } from '@/lib/config';
import { stackServerApp } from '@/stack';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

/**
 * S3 Presigned URL API
 *
 * Generates secure presigned URLs for direct S3 uploads
 * REQUIRES AUTHENTICATION
 */

// Input validation schema
const UploadUrlRequestSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(255, 'Filename too long'),
  content_type: z.string().min(1, 'Content type is required'),
  file_size: z.number().min(1, 'File size must be positive').max(100 * 1024 * 1024, 'File too large (max 100MB)'),
  product_id: z.string().uuid('Invalid product ID format')
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
  const organizationId = (user as any).organizationId || 'bf5e7b6e-f44c-4393-9fc4-8be04af5be45';

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
 * POST /api/v1/documents/upload-url
 * Generate presigned URL for S3 upload
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user first
    const { organizationId, userId } = await getAuthenticatedContext(request);

    // Parse and validate request body
    let requestData;
    try {
      requestData = await request.json();
    } catch {
      return errorResponse('Invalid JSON in request body', 400);
    }

    // Validate input against schema
    const validatedData = UploadUrlRequestSchema.parse(requestData);

    // Validate file type is allowed
    if (!ALLOWED_CONTENT_TYPES.includes(validatedData.content_type)) {
      return errorResponse(`Unsupported file type: ${validatedData.content_type}`, 400);
    }

    // Validate filename doesn't contain dangerous characters
    const dangerousChars = /[<>:"|?*\x00-\x1f]/;
    if (dangerousChars.test(validatedData.filename)) {
      return errorResponse('Filename contains invalid characters', 400);
    }

    // Generate unique S3 key
    const fileExtension = validatedData.filename.split('.').pop() || '';
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const uniqueId = uuidv4();
    const s3Key = `documents/${organizationId}/${validatedData.product_id}/${timestamp}/${uniqueId}.${fileExtension}`;

    // Get S3 configuration
    const config = getConfig();
    if (!config.S3_BUCKET_NAME) {
      return errorResponse('S3 storage not configured', 500);
    }

    const s3Client = getS3Client();

    // Generate presigned URL for PUT operation
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');

    const putCommand = new PutObjectCommand({
      Bucket: config.S3_BUCKET_NAME,
      Key: s3Key,
      ContentType: validatedData.content_type,
      ContentLength: validatedData.file_size,
      Metadata: {
        'original-filename': validatedData.filename,
        'uploaded-by': userId,
        'organization-id': organizationId,
        'product-id': validatedData.product_id,
        'upload-timestamp': new Date().toISOString()
      }
    });

    // Generate presigned URL valid for 15 minutes
    const presignedUrl = await getSignedUrl(s3Client, putCommand, {
      expiresIn: 900 // 15 minutes
    });

    return successResponse({
      upload_url: presignedUrl,
      s3_key: s3Key,
      bucket: config.S3_BUCKET_NAME,
      expires_in: 900,
      required_headers: {
        'Content-Type': validatedData.content_type,
        'Content-Length': validatedData.file_size.toString()
      },
      metadata: {
        filename: validatedData.filename,
        product_id: validatedData.product_id,
        organization_id: organizationId
      }
    }, 201);

  } catch (error: any) {
    console.error('Upload URL generation error:', error);

    // Handle authentication errors
    if (error.message.includes('Authentication')) {
      return errorResponse('Authentication required', 401);
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')}`, 400);
    }

    // Handle AWS errors
    if (error.name === 'CredentialsError' || error.name === 'UnknownEndpoint') {
      return errorResponse('S3 configuration error', 500);
    }

    return errorResponse('Internal server error', 500);
  }
}