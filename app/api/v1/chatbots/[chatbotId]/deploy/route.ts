import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { ChatbotService } from '@/lib/chatbot/service';
import { getConfig } from '@/lib/config';
import { withChatbotMonitoring } from '@/lib/monitoring/api-wrapper';

/**
 * Chatbot Deployment API Routes
 *
 * Handles deployment operations for chatbot instances.
 * Routes: POST /api/v1/chatbots/[chatbotId]/deploy
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
 * POST /api/v1/chatbots/[chatbotId]/deploy
 * Deploy chatbot to specified environment
 */
async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const chatbotService = new ChatbotService(client);
    const organizationId = getOrganizationId(request);
    const resolvedParams = await params;
    const chatbotId = resolvedParams.chatbotId;

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

    // Validate required fields
    if (!requestData.environment) {
      return errorResponse('environment is required');
    }

    // Validate environment enum
    if (!['development', 'staging', 'production'].includes(requestData.environment)) {
      return errorResponse('Invalid environment. Must be one of: development, staging, production');
    }

    // Check if chatbot exists and is ready for deployment
    const chatbot = await chatbotService.getById(chatbotId, organizationId);
    if (!chatbot) {
      return errorResponse('Chatbot not found', 404);
    }

    if (chatbot.status !== 'active' && chatbot.status !== 'inactive') {
      return errorResponse('Chatbot must be in active or inactive status to deploy', 409);
    }

    // Deploy chatbot
    const deployment = await chatbotService.deploy(
      chatbotId,
      requestData.environment,
      organizationId
    );

    return successResponse({
      message: 'Chatbot deployment initiated successfully',
      deployment,
      estimated_completion: new Date(Date.now() + (requestData.deployment_timeout || 300) * 1000).toISOString()
    });

  } catch (error: any) {
    console.error('Chatbot deployment error:', error);

    if (error.message.includes('not found')) {
      return errorResponse(error.message, 404);
    }

    if (error.message.includes('already deployed') ||
        error.message.includes('deployment in progress') ||
        error.message.includes('Cannot deploy')) {
      return errorResponse(error.message, 409);
    }

    if (error.message.includes('quota exceeded') || error.message.includes('rate limit')) {
      return errorResponse(error.message, 429);
    }

    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

// Export Sentry-monitored route handler
export const POST = withChatbotMonitoring(handlePOST, 'chatbots_deploy');