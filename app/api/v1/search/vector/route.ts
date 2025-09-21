import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { VectorService } from '@/lib/services/vector-service';
import { getConfig } from '@/lib/config';
import { stackServerApp } from '@/stack';
import { z } from 'zod';

/**
 * Vector Search API
 *
 * Performs semantic search across document chunks using vector embeddings
 * REQUIRES AUTHENTICATION
 */

// Input validation schema
const VectorSearchSchema = z.object({
  query: z.string().min(1, 'Query is required').max(1000, 'Query too long'),
  limit: z.number().min(1).max(50).optional().default(10),
  threshold: z.number().min(0).max(1).optional().default(0.7),
  product_id: z.string().uuid().optional(),
});

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
 * POST /api/v1/search/vector
 * Perform vector similarity search across document chunks
 */
export async function POST(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    // Authenticate user first
    const { organizationId, userId } = await getAuthenticatedContext(request);

    await client.connect();
    const vectorService = new VectorService(client);

    // Parse and validate request body
    let requestData;
    try {
      requestData = await request.json();
    } catch {
      return errorResponse('Invalid JSON in request body', 400);
    }

    // Validate input against schema
    const validatedData = VectorSearchSchema.parse(requestData);
    const { query, limit, threshold, product_id } = validatedData;

    // Perform vector search
    const startTime = Date.now();
    const results = await vectorService.searchSimilarChunks(
      query,
      limit,
      threshold,
      organizationId
    );

    const searchTime = Date.now() - startTime;

    // Filter by product if specified
    const filteredResults = product_id
      ? results.filter(result => {
          // This would require joining with documents table to get product_id
          // For now, we'll include all results
          return true;
        })
      : results;

    return successResponse({
      query,
      results: filteredResults.map(result => ({
        chunk_id: result.id,
        document_id: result.document_id,
        document_title: result.document_title || result.filename,
        content: result.content,
        similarity_score: Math.round(result.similarity * 100) / 100,
        metadata: result.metadata,
        chunk_index: result.chunk_index
      })),
      search_metadata: {
        total_results: filteredResults.length,
        search_time_ms: searchTime,
        similarity_threshold: threshold,
        max_results: limit,
        organization_id: organizationId
      }
    });

  } catch (error: any) {
    console.error('Vector search error:', error);

    // Handle authentication errors
    if (error.message.includes('Authentication')) {
      return errorResponse('Authentication required', 401);
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')}`, 400);
    }

    // Handle vector search specific errors
    if (error.message.includes('embedding') || error.message.includes('vector')) {
      return errorResponse('Vector search service unavailable', 503);
    }

    return errorResponse('Internal server error', 500);
  } finally {
    await client.end();
  }
}

/**
 * GET /api/v1/search/vector?query=...
 * Convenience GET endpoint for simple searches
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const limit = parseInt(searchParams.get('limit') || '10');
  const threshold = parseFloat(searchParams.get('threshold') || '0.7');

  if (!query) {
    return errorResponse('Query parameter is required', 400);
  }

  // Convert GET to POST format
  const postRequest = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ query, limit, threshold })
  });

  return POST(postRequest as NextRequest);
}