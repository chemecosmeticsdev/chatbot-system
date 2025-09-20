import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { ProductService } from '@/lib/services/product-service';
import { getConfig } from '@/lib/config';

/**
 * Individual Product API Routes
 *
 * Handles operations for specific products by ID.
 * Routes: GET, PUT, DELETE /api/v1/products/[productId]
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
  return 'default-org-id';
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
 * GET /api/v1/products/[productId]
 * Get product details with associated documents
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const productService = new ProductService(client);
    const organizationId = getOrganizationId(request);
    const productId = params.productId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      return errorResponse('Invalid product ID format');
    }

    const product = await productService.getByIdWithDocuments(productId, organizationId);

    if (!product) {
      return errorResponse('Product not found', 404);
    }

    return successResponse(product);

  } catch (error: any) {
    console.error('Product GET error:', error);
    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

/**
 * PUT /api/v1/products/[productId]
 * Update product
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const productService = new ProductService(client);
    const organizationId = getOrganizationId(request);
    const productId = params.productId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      return errorResponse('Invalid product ID format');
    }

    // Parse request body
    let requestData;
    try {
      requestData = await request.json();
    } catch {
      return errorResponse('Invalid JSON in request body');
    }

    // Update product
    const product = await productService.update(productId, requestData, organizationId);

    return successResponse(product);

  } catch (error: any) {
    console.error('Product PUT error:', error);

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return errorResponse(error.message, 404);
    }

    if (error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('already exists')) {
      return errorResponse(error.message, 400);
    }

    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

/**
 * DELETE /api/v1/products/[productId]
 * Delete product
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const productService = new ProductService(client);
    const organizationId = getOrganizationId(request);
    const productId = params.productId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      return errorResponse('Invalid product ID format');
    }

    // Delete product
    await productService.delete(productId, organizationId);

    return successResponse({
      message: 'Product deleted successfully'
    });

  } catch (error: any) {
    console.error('Product DELETE error:', error);

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return errorResponse(error.message, 404);
    }

    if (error.message.includes('Cannot delete')) {
      return errorResponse(error.message, 409); // Conflict
    }

    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}