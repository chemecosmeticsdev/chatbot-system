import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { VectorSearchService } from '@/lib/vector/search';
import { getConfig } from '@/lib/config';
import { withChatbotMonitoring } from '@/lib/monitoring/api-wrapper';

/**
 * Vector Search Analytics API Routes
 *
 * Handles analytics and performance metrics for vector search operations.
 * Routes: GET /api/v1/search/analytics
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
 * GET /api/v1/search/analytics
 * Get search analytics and performance metrics
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
    const session_id = searchParams.get('session_id');
    const time_range = searchParams.get('time_range') || '24h'; // 1h, 24h, 7d, 30d
    const include_details = searchParams.get('include_details') === 'true';

    // Validate required parameters
    if (!chatbot_id) {
      return errorResponse('chatbot_id is required');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(chatbot_id)) {
      return errorResponse('Invalid chatbot_id format');
    }

    if (session_id && !uuidRegex.test(session_id)) {
      return errorResponse('Invalid session_id format');
    }

    // Validate time range
    if (!['1h', '24h', '7d', '30d'].includes(time_range)) {
      return errorResponse('time_range must be one of: 1h, 24h, 7d, 30d');
    }

    // Get analytics data
    let analytics;
    if (session_id) {
      // Get session-specific analytics
      analytics = await vectorSearchService.getSearchAnalytics(
        session_id,
        chatbot_id,
        include_details
      );
    } else {
      // Get chatbot-wide analytics
      analytics = await vectorSearchService.getChatbotSearchAnalytics(
        chatbot_id,
        organizationId,
        time_range,
        include_details
      );
    }

    return successResponse({
      ...analytics,
      chatbot_id,
      session_id: session_id || null,
      time_range,
      generated_at: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Search analytics error:', error);

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return errorResponse(error.message, 404);
    }

    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

// Export Sentry-monitored route handler
export const GET = withChatbotMonitoring(handleGET, 'search_analytics');