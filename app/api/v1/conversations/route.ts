import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { ConversationService } from '@/lib/services/conversation-service';
import { getConfig } from '@/lib/config';
import { withChatbotMonitoring } from '@/lib/monitoring/api-wrapper';

/**
 * Conversations API Routes
 *
 * Handles CRUD operations for conversation sessions and message processing.
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
 * GET /api/v1/conversations
 * List conversation sessions with filtering and pagination
 */
async function handleGET(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const conversationService = new ConversationService(client);
    const organizationId = getOrganizationId(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const chatbot_id = searchParams.get('chatbot_id') || undefined;
    const platform = searchParams.get('platform') || undefined;
    const status = searchParams.get('status') || undefined;
    const user_id = searchParams.get('user_id') || undefined;
    const include_messages = searchParams.get('include_messages') === 'true';

    // Validate pagination
    if (page < 1) {
      return errorResponse('Page must be a positive integer');
    }

    if (limit < 1 || limit > 100) {
      return errorResponse('Limit must be between 1 and 100');
    }

    // Validate platform enum
    if (platform && !['web', 'line', 'whatsapp', 'messenger', 'api'].includes(platform)) {
      return errorResponse('Invalid platform. Must be one of: web, line, whatsapp, messenger, api');
    }

    // Validate status enum
    if (status && !['active', 'completed', 'abandoned', 'expired'].includes(status)) {
      return errorResponse('Invalid status. Must be one of: active, completed, abandoned, expired');
    }

    // Validate UUID format for chatbot_id if provided
    if (chatbot_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(chatbot_id)) {
        return errorResponse('Invalid chatbot_id format');
      }
    }

    const filters = { chatbot_id, platform, status, user_id };
    const result = await conversationService.list(organizationId, filters, page, limit, include_messages);

    return successResponse(result);

  } catch (error: any) {
    console.error('Conversations GET error:', error);
    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

/**
 * POST /api/v1/conversations
 * Create a new conversation session
 */
async function handlePOST(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const conversationService = new ConversationService(client);
    const organizationId = getOrganizationId(request);

    // Parse request body
    let requestData;
    try {
      requestData = await request.json();
    } catch {
      return errorResponse('Invalid JSON in request body');
    }

    // Validate required fields
    if (!requestData.chatbot_id) {
      return errorResponse('chatbot_id is required');
    }

    if (!requestData.platform) {
      return errorResponse('platform is required');
    }

    if (!requestData.user_id) {
      return errorResponse('user_id is required');
    }

    // Validate UUID format for chatbot_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(requestData.chatbot_id)) {
      return errorResponse('Invalid chatbot_id format');
    }

    // Validate platform enum
    if (!['web', 'line', 'whatsapp', 'messenger', 'api'].includes(requestData.platform)) {
      return errorResponse('Invalid platform. Must be one of: web, line, whatsapp, messenger, api');
    }

    // Validate optional fields
    if (requestData.user_metadata && typeof requestData.user_metadata !== 'object') {
      return errorResponse('user_metadata must be an object');
    }

    if (requestData.session_metadata && typeof requestData.session_metadata !== 'object') {
      return errorResponse('session_metadata must be an object');
    }

    // Create conversation
    const conversation = await conversationService.create(requestData, organizationId);

    return successResponse(conversation, 201);

  } catch (error: any) {
    console.error('Conversations POST error:', error);

    // Handle validation errors
    if (error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('Invalid') ||
        error.message.includes('already exists')) {
      return errorResponse(error.message, 400);
    }

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return errorResponse(error.message, 404);
    }

    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

// Export Sentry-monitored route handlers
export const GET = withChatbotMonitoring(handleGET, 'conversations_list');
export const POST = withChatbotMonitoring(handlePOST, 'conversations_create');