import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { ChatbotService } from '@/lib/chatbot/service';
import { getConfigSafe } from '@/lib/config';
import { withChatbotMonitoring } from '@/lib/monitoring/api-wrapper';

/**
 * Chatbots API Routes
 *
 * Handles CRUD operations for chatbot instances and management operations.
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
 * GET /api/v1/chatbots
 * List chatbots with filtering and pagination
 */
async function handleGET(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const chatbotService = new ChatbotService(client);
    const organizationId = getOrganizationId(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || undefined;
    const model_provider = searchParams.get('model_provider') || undefined;
    const environment = searchParams.get('environment') || undefined;
    const search = searchParams.get('search') || undefined;

    // Validate pagination
    if (page < 1) {
      return errorResponse('Page must be a positive integer');
    }

    if (limit < 1 || limit > 100) {
      return errorResponse('Limit must be between 1 and 100');
    }

    // Validate status enum
    if (status && !['active', 'inactive', 'training', 'error'].includes(status)) {
      return errorResponse('Invalid status. Must be one of: active, inactive, training, error');
    }

    // Validate model provider enum
    if (model_provider && !['bedrock', 'openai', 'anthropic'].includes(model_provider)) {
      return errorResponse('Invalid model_provider. Must be one of: bedrock, openai, anthropic');
    }

    // Validate environment enum
    if (environment && !['development', 'staging', 'production'].includes(environment)) {
      return errorResponse('Invalid environment. Must be one of: development, staging, production');
    }

    const filters = { status, model_provider, environment, search };
    const result = await chatbotService.list(organizationId, filters, page, limit);

    return successResponse(result);

  } catch (error: any) {
    console.error('Chatbots GET error:', error);
    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

/**
 * POST /api/v1/chatbots
 * Create a new chatbot instance
 */
async function handlePOST(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const chatbotService = new ChatbotService(client);
    const organizationId = getOrganizationId(request);

    // Parse request body
    let requestData;
    try {
      requestData = await request.json();
    } catch {
      return errorResponse('Invalid JSON in request body');
    }

    // Validate required fields
    if (!requestData.name) {
      return errorResponse('name is required');
    }

    if (!requestData.model_provider) {
      return errorResponse('model_provider is required');
    }

    // Set default model if not provided (Nova Micro for cost efficiency)
    if (!requestData.model_name) {
      requestData.model_name = requestData.model_provider === 'bedrock' ? 'amazon.nova-micro-v1:0' :
                              requestData.model_provider === 'openai' ? 'gpt-3.5-turbo' :
                              'claude-3-haiku-20240307';
    }

    if (!requestData.system_prompt) {
      return errorResponse('system_prompt is required');
    }

    // Validate enums
    if (!['bedrock', 'openai', 'anthropic'].includes(requestData.model_provider)) {
      return errorResponse('Invalid model_provider. Must be one of: bedrock, openai, anthropic. Recommended: Use bedrock with Amazon Nova models for best performance and cost efficiency.');
    }

    // Validate model_name against supported models for the provider
    const SUPPORTED_MODELS = {
      bedrock: [
        // Amazon Nova models (recommended defaults)
        'amazon.nova-micro-v1:0',
        'amazon.nova-lite-v1:0',
        'amazon.nova-pro-v1:0',
        // Legacy Claude models (backward compatibility)
        'anthropic.claude-3-haiku-20240307-v1:0',
        'anthropic.claude-3-sonnet-20240229-v1:0',
        'anthropic.claude-3-opus-20240229-v1:0',
        'anthropic.claude-3-5-sonnet-20240620-v1:0',
        // Legacy Titan models
        'amazon.titan-text-lite-v1',
        'amazon.titan-text-express-v1'
      ],
      openai: [
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k',
        'gpt-4',
        'gpt-4-turbo',
        'gpt-4o'
      ],
      anthropic: [
        'claude-3-haiku-20240307',
        'claude-3-sonnet-20240229',
        'claude-3-opus-20240229',
        'claude-3-5-sonnet-20240620'
      ]
    };

    const providerModels = SUPPORTED_MODELS[requestData.model_provider as keyof typeof SUPPORTED_MODELS];
    if (!providerModels.includes(requestData.model_name)) {
      const recommendedModel = requestData.model_provider === 'bedrock' ? 'amazon.nova-micro-v1:0' : providerModels[0];
      return errorResponse(`Invalid model_name '${requestData.model_name}' for provider '${requestData.model_provider}'. Supported models: ${providerModels.join(', ')}. Recommended: ${recommendedModel}`);
    }

    // Validate configuration structure
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

    // Create chatbot
    const chatbot = await chatbotService.create(requestData, organizationId);

    return successResponse(chatbot, 201);

  } catch (error: any) {
    console.error('Chatbots POST error:', error);

    // Handle validation errors
    if (error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('Invalid') ||
        error.message.includes('already exists')) {
      return errorResponse(error.message, 400);
    }

    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

// Export Sentry-monitored route handlers
export const GET = withChatbotMonitoring(handleGET, 'chatbots_list');
export const POST = withChatbotMonitoring(handlePOST, 'chatbots_create');