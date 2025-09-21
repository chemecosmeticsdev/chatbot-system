import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { VectorSearchService } from '@/lib/vector/search';
import { getConfig } from '@/lib/config';
import { withChatbotMonitoring } from '@/lib/monitoring/api-wrapper';

/**
 * Vector Search API Routes
 *
 * Handles vector similarity search for document retrieval and RAG operations.
 * Follows the OpenAPI contract specification.
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
  // For now, use a valid UUID format for default organization
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
 * POST /api/v1/search
 * Perform vector similarity search
 */
async function handlePOST(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const vectorSearchService = new VectorSearchService(client);
    const organizationId = getOrganizationId(request);

    // Parse request body
    let requestData;
    try {
      requestData = await request.json();
    } catch {
      return errorResponse('Invalid JSON in request body');
    }

    // Validate required fields
    if (!requestData.query || typeof requestData.query !== 'string') {
      return errorResponse('query is required and must be a string');
    }

    if (requestData.query.trim().length === 0) {
      return errorResponse('query cannot be empty');
    }

    if (!requestData.chatbot_id) {
      return errorResponse('chatbot_id is required');
    }

    if (!requestData.session_id) {
      return errorResponse('session_id is required');
    }

    // Validate optional parameters
    const limit = requestData.limit || 10;
    if (typeof limit !== 'number' || limit < 1 || limit > 50) {
      return errorResponse('limit must be a number between 1 and 50');
    }

    const similarity_threshold = requestData.similarity_threshold || 0.7;
    if (typeof similarity_threshold !== 'number' || similarity_threshold < 0 || similarity_threshold > 1) {
      return errorResponse('similarity_threshold must be a number between 0 and 1');
    }

    // Prepare search filters
    const filters = {
      product_ids: requestData.product_ids || [],
      content_types: requestData.content_types || [],
      categories: requestData.categories || [],
      tags: requestData.tags || [],
      date_range: requestData.date_range || null
    };

    // Validate UUID format for chatbot_id and session_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(requestData.chatbot_id)) {
      return errorResponse('Invalid chatbot_id format');
    }

    if (!uuidRegex.test(requestData.session_id)) {
      return errorResponse('Invalid session_id format');
    }

    // Perform vector search
    const results = await vectorSearchService.similaritySearch(
      requestData.query,
      requestData.chatbot_id,
      requestData.session_id,
      {
        ...filters,
        limit,
        similarity_threshold,
        boost_recent: requestData.boost_recent || false,
        include_metadata: requestData.include_metadata !== false // default true
      }
    );

    // Add search analytics
    const analytics = await vectorSearchService.getSearchAnalytics(
      requestData.session_id,
      requestData.chatbot_id
    );

    return successResponse({
      results,
      total_results: results.length,
      query: requestData.query,
      search_time: analytics.average_search_time || 0,
      filters_applied: Object.keys(filters).filter(key =>
        filters[key] && (Array.isArray(filters[key]) ? filters[key].length > 0 : true)
      ),
      analytics: {
        session_search_count: analytics.total_searches || 0,
        average_similarity: results.length > 0 ?
          results.reduce((sum, r) => sum + r.similarity_score, 0) / results.length : 0
      }
    });

  } catch (error: any) {
    console.error('Vector search error:', error);

    // Handle specific error types
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return errorResponse(error.message, 404);
    }

    if (error.message.includes('rate limit') || error.message.includes('quota exceeded')) {
      return errorResponse(error.message, 429);
    }

    if (error.message.includes('Invalid') || error.message.includes('required')) {
      return errorResponse(error.message, 400);
    }

    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

/**
 * GET /api/v1/search/suggestions
 * Get search suggestions based on popular queries
 */
async function handleGET(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const vectorSearchService = new VectorSearchService(client);
    const organizationId = getOrganizationId(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const chatbot_id = searchParams.get('chatbot_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!chatbot_id) {
      return errorResponse('chatbot_id is required');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(chatbot_id)) {
      return errorResponse('Invalid chatbot_id format');
    }

    if (limit < 1 || limit > 20) {
      return errorResponse('limit must be between 1 and 20');
    }

    // Get search suggestions
    const suggestions = await vectorSearchService.getSearchSuggestions(
      chatbot_id,
      organizationId,
      limit
    );

    return successResponse({
      suggestions,
      total: suggestions.length,
      chatbot_id
    });

  } catch (error: any) {
    console.error('Search suggestions error:', error);
    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

// Export Sentry-monitored route handlers
export const POST = withChatbotMonitoring(handlePOST, 'vector_search');
export const GET = withChatbotMonitoring(handleGET, 'search_suggestions');