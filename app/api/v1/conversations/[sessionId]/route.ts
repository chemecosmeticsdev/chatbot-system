import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { ConversationService } from '@/lib/services/conversation-service';
import { getConfig } from '@/lib/config';
import { withChatbotMonitoring } from '@/lib/monitoring/api-wrapper';

/**
 * Individual Conversation API Routes
 *
 * Handles operations for specific conversation sessions by ID.
 * Routes: GET, PUT, DELETE /api/v1/conversations/[sessionId]
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
 * GET /api/v1/conversations/[sessionId]
 * Get conversation details with messages
 */
async function handleGET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const conversationService = new ConversationService(client);
    const organizationId = getOrganizationId(request);
    const sessionId = params.sessionId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return errorResponse('Invalid session ID format');
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const include_messages = searchParams.get('include_messages') !== 'false'; // default true
    const include_analytics = searchParams.get('include_analytics') === 'true';
    const message_limit = parseInt(searchParams.get('message_limit') || '50');

    if (message_limit < 1 || message_limit > 200) {
      return errorResponse('message_limit must be between 1 and 200');
    }

    const conversation = await conversationService.getById(
      sessionId,
      organizationId,
      include_messages,
      message_limit
    );

    if (!conversation) {
      return errorResponse('Conversation not found', 404);
    }

    // Add analytics if requested
    if (include_analytics) {
      const analytics = await conversationService.getAnalytics(sessionId, organizationId);
      conversation.analytics = analytics;
    }

    return successResponse(conversation);

  } catch (error: any) {
    console.error('Conversation GET error:', error);
    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

/**
 * PUT /api/v1/conversations/[sessionId]
 * Update conversation session
 */
async function handlePUT(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const conversationService = new ConversationService(client);
    const organizationId = getOrganizationId(request);
    const sessionId = params.sessionId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return errorResponse('Invalid session ID format');
    }

    // Parse request body
    let requestData;
    try {
      requestData = await request.json();
    } catch {
      return errorResponse('Invalid JSON in request body');
    }

    // Validate status enum if provided
    if (requestData.status && !['active', 'completed', 'abandoned', 'expired'].includes(requestData.status)) {
      return errorResponse('Invalid status. Must be one of: active, completed, abandoned, expired');
    }

    // Validate metadata if provided
    if (requestData.session_metadata && typeof requestData.session_metadata !== 'object') {
      return errorResponse('session_metadata must be an object');
    }

    if (requestData.user_metadata && typeof requestData.user_metadata !== 'object') {
      return errorResponse('user_metadata must be an object');
    }

    // Update conversation
    const conversation = await conversationService.update(sessionId, requestData, organizationId);

    return successResponse(conversation);

  } catch (error: any) {
    console.error('Conversation PUT error:', error);

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return errorResponse(error.message, 404);
    }

    if (error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('Invalid') ||
        error.message.includes('No valid fields')) {
      return errorResponse(error.message, 400);
    }

    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

/**
 * DELETE /api/v1/conversations/[sessionId]
 * Delete conversation session and all messages
 */
async function handleDELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const conversationService = new ConversationService(client);
    const organizationId = getOrganizationId(request);
    const sessionId = params.sessionId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return errorResponse('Invalid session ID format');
    }

    // Check for force delete parameter
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // Delete conversation
    await conversationService.delete(sessionId, organizationId, force);

    return successResponse({
      message: 'Conversation deleted successfully'
    });

  } catch (error: any) {
    console.error('Conversation DELETE error:', error);

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return errorResponse(error.message, 404);
    }

    if (error.message.includes('Cannot delete') || error.message.includes('has active')) {
      return errorResponse(error.message, 409); // Conflict
    }

    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

// Export Sentry-monitored route handlers
export const GET = withChatbotMonitoring(handleGET, 'conversations_get_by_id');
export const PUT = withChatbotMonitoring(handlePUT, 'conversations_update');
export const DELETE = withChatbotMonitoring(handleDELETE, 'conversations_delete');