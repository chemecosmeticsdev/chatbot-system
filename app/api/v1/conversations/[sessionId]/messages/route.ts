import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { ConversationService } from '@/lib/services/conversation-service';
import { getConfig } from '@/lib/config';
import { withChatbotMonitoring } from '@/lib/monitoring/api-wrapper';

/**
 * Conversation Messages API Routes
 *
 * Handles message operations within conversation sessions.
 * Routes: POST /api/v1/conversations/[sessionId]/messages
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
 * POST /api/v1/conversations/[sessionId]/messages
 * Add a message to conversation and get chatbot response
 */
async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const conversationService = new ConversationService(client);
    const organizationId = getOrganizationId(request);
    const resolvedParams = await params;
    const sessionId = resolvedParams.sessionId;

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

    // Validate required fields
    if (!requestData.content) {
      return errorResponse('content is required');
    }

    if (typeof requestData.content !== 'string' || requestData.content.trim().length === 0) {
      return errorResponse('content must be a non-empty string');
    }

    if (!requestData.role) {
      return errorResponse('role is required');
    }

    // Validate role enum
    if (!['user', 'assistant', 'system'].includes(requestData.role)) {
      return errorResponse('Invalid role. Must be one of: user, assistant, system');
    }

    // Validate optional fields
    if (requestData.attachments && !Array.isArray(requestData.attachments)) {
      return errorResponse('attachments must be an array');
    }

    if (requestData.metadata && typeof requestData.metadata !== 'object') {
      return errorResponse('metadata must be an object');
    }

    // Add processing options
    const options = {
      generate_response: requestData.generate_response !== false, // default true
      include_vector_search: requestData.include_vector_search !== false, // default true
      search_limit: requestData.search_limit || 5,
      similarity_threshold: requestData.similarity_threshold || 0.7,
      stream_response: requestData.stream_response === true // default false
    };

    // Validate search options
    if (options.search_limit < 1 || options.search_limit > 20) {
      return errorResponse('search_limit must be between 1 and 20');
    }

    if (options.similarity_threshold < 0 || options.similarity_threshold > 1) {
      return errorResponse('similarity_threshold must be between 0 and 1');
    }

    // Add message and get response
    const result = await conversationService.addMessage(
      sessionId,
      {
        role: requestData.role,
        content: requestData.content,
        attachments: requestData.attachments || [],
        metadata: requestData.metadata || {}
      },
      organizationId,
      options
    );

    return successResponse({
      message: result.message,
      response: result.response || null,
      vector_search_results: result.vector_search_results || [],
      conversation_status: result.conversation_status,
      cost_info: result.cost_info || null,
      response_time: result.response_time || null,
      search_analytics: result.search_analytics || null
    }, 201);

  } catch (error: any) {
    console.error('Message POST error:', error);

    // Handle specific error types
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return errorResponse(error.message, 404);
    }

    if (error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('Invalid') ||
        error.message.includes('session expired') ||
        error.message.includes('session completed')) {
      return errorResponse(error.message, 400);
    }

    if (error.message.includes('rate limit') || error.message.includes('quota exceeded')) {
      return errorResponse(error.message, 429);
    }

    if (error.message.includes('session is not active')) {
      return errorResponse(error.message, 409);
    }

    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

// Export Sentry-monitored route handler
export const POST = withChatbotMonitoring(handlePOST, 'conversations_add_message');