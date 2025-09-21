import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { ChatbotService } from '@/lib/chatbot/service';
import { getConfig } from '@/lib/config';
import { withChatbotMonitoring } from '@/lib/monitoring/api-wrapper';

/**
 * Individual Chatbot API Routes
 *
 * Handles operations for specific chatbot instances by ID.
 * Routes: GET, PUT, DELETE /api/v1/chatbots/[chatbotId]
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
 * GET /api/v1/chatbots/[chatbotId]
 * Get chatbot details with analytics
 */
async function handleGET(
  request: NextRequest,
  { params }: { params: { chatbotId: string } }
) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const chatbotService = new ChatbotService(client);
    const organizationId = getOrganizationId(request);
    const chatbotId = params.chatbotId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(chatbotId)) {
      return errorResponse('Invalid chatbot ID format');
    }

    // Check if we want analytics included
    const { searchParams } = new URL(request.url);
    const include_analytics = searchParams.get('include_analytics') === 'true';
    const include_deployments = searchParams.get('include_deployments') === 'true';

    let chatbot;
    if (include_analytics) {
      chatbot = await chatbotService.getByIdWithAnalytics(chatbotId, organizationId);
    } else {
      chatbot = await chatbotService.getById(chatbotId, organizationId);
    }

    if (!chatbot) {
      return errorResponse('Chatbot not found', 404);
    }

    // Add deployment information if requested
    if (include_deployments) {
      const deployments = await chatbotService.getDeployments(chatbotId, organizationId);
      chatbot.deployments = deployments;
    }

    return successResponse(chatbot);

  } catch (error: any) {
    console.error('Chatbot GET error:', error);
    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

/**
 * PUT /api/v1/chatbots/[chatbotId]
 * Update chatbot configuration
 */
async function handlePUT(
  request: NextRequest,
  { params }: { params: { chatbotId: string } }
) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const chatbotService = new ChatbotService(client);
    const organizationId = getOrganizationId(request);
    const chatbotId = params.chatbotId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(chatbotId)) {
      return errorResponse('Invalid chatbot ID format');
    }

    // Parse request body
    let requestData;
    try {
      requestData = await request.json();
    } catch {
      return errorResponse('Invalid JSON in request body');
    }

    // Validate enums if provided
    if (requestData.model_provider && !['bedrock', 'openai', 'anthropic'].includes(requestData.model_provider)) {
      return errorResponse('Invalid model_provider. Must be one of: bedrock, openai, anthropic');
    }

    if (requestData.status && !['active', 'inactive', 'training', 'error'].includes(requestData.status)) {
      return errorResponse('Invalid status. Must be one of: active, inactive, training, error');
    }

    // Validate configuration if provided
    if (requestData.configuration) {
      const config = requestData.configuration;

      if (config.temperature && (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2)) {
        return errorResponse('temperature must be a number between 0 and 2');
      }

      if (config.max_tokens && (typeof config.max_tokens !== 'number' || config.max_tokens < 1)) {
        return errorResponse('max_tokens must be a positive number');
      }

      if (config.top_p && (typeof config.top_p !== 'number' || config.top_p < 0 || config.top_p > 1)) {
        return errorResponse('top_p must be a number between 0 and 1');
      }
    }

    // Update chatbot
    const chatbot = await chatbotService.update(chatbotId, requestData, organizationId);

    return successResponse(chatbot);

  } catch (error: any) {
    console.error('Chatbot PUT error:', error);

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
 * DELETE /api/v1/chatbots/[chatbotId]
 * Delete chatbot instance
 */
async function handleDELETE(
  request: NextRequest,
  { params }: { params: { chatbotId: string } }
) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const chatbotService = new ChatbotService(client);
    const organizationId = getOrganizationId(request);
    const chatbotId = params.chatbotId;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(chatbotId)) {
      return errorResponse('Invalid chatbot ID format');
    }

    // Check for force delete parameter
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // Delete chatbot
    await chatbotService.delete(chatbotId, organizationId, force);

    return successResponse({
      message: 'Chatbot deleted successfully'
    });

  } catch (error: any) {
    console.error('Chatbot DELETE error:', error);

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
export const GET = withChatbotMonitoring(handleGET, 'chatbots_get_by_id');
export const PUT = withChatbotMonitoring(handlePUT, 'chatbots_update');
export const DELETE = withChatbotMonitoring(handleDELETE, 'chatbots_delete');