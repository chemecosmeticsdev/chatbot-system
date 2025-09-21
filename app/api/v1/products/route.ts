import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { ProductService } from '@/lib/services/product-service';
import { ProductStatus } from '@/lib/models/product';
import { getConfig } from '@/lib/config';

/**
 * Products API Routes
 *
 * Handles CRUD operations for products in the knowledge base system.
 * Follows the OpenAPI contract specification.
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
  // For now, use default organization
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
 * GET /api/v1/products
 * List products with filtering and pagination
 */
export async function GET(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const productService = new ProductService(client);
    const organizationId = getOrganizationId(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    // Validate pagination
    if (page < 1) {
      return errorResponse('Page must be a positive integer');
    }

    if (limit < 1 || limit > 100) {
      return errorResponse('Limit must be between 1 and 100');
    }

    // Validate status enum
    if (status && !['active', 'inactive', 'draft', 'archived'].includes(status)) {
      return errorResponse('Invalid status. Must be one of: active, inactive, draft, archived');
    }

    const filters = {
      category,
      status: status as ProductStatus | undefined,
      search
    };
    const result = await productService.list(organizationId, filters, page, limit);

    return successResponse(result);

  } catch (error: any) {
    console.error('Products GET error:', error);
    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

/**
 * POST /api/v1/products
 * Create a new product
 */
export async function POST(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const productService = new ProductService(client);
    const organizationId = getOrganizationId(request);

    // Parse request body
    let requestData;
    try {
      requestData = await request.json();
    } catch {
      return errorResponse('Invalid JSON in request body');
    }

    // Create product
    const product = await productService.create(requestData, organizationId);

    return successResponse(product, 201);

  } catch (error: any) {
    console.error('Products POST error:', error);

    // Handle validation errors
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