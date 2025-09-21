import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { getConfig } from '@/lib/config';
import { withChatbotMonitoring } from '@/lib/monitoring/api-wrapper';

/**
 * Analytics API Routes
 *
 * Handles comprehensive analytics and reporting for the chatbot platform.
 * Provides overview metrics, performance data, and usage statistics.
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
 * GET /api/v1/analytics
 * Get comprehensive analytics overview
 */
async function handleGET(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const organizationId = getOrganizationId(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const time_range = searchParams.get('time_range') || '24h'; // 1h, 24h, 7d, 30d
    const chatbot_id = searchParams.get('chatbot_id') || undefined;
    const include_costs = searchParams.get('include_costs') === 'true';
    const include_performance = searchParams.get('include_performance') === 'true';

    // Validate time range
    if (!['1h', '24h', '7d', '30d'].includes(time_range)) {
      return errorResponse('time_range must be one of: 1h, 24h, 7d, 30d');
    }

    // Validate UUID format for chatbot_id if provided
    if (chatbot_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(chatbot_id)) {
        return errorResponse('Invalid chatbot_id format');
      }
    }

    // Calculate time range
    const now = new Date();
    let startTime: Date;
    switch (time_range) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Build analytics queries
    const analytics: any = {
      time_range,
      start_time: startTime.toISOString(),
      end_time: now.toISOString(),
      organization_id: organizationId
    };

    // Basic conversation metrics
    let conversationQuery = `
      SELECT
        COUNT(*) as total_conversations,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_conversations,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_conversations,
        COUNT(CASE WHEN status = 'abandoned' THEN 1 END) as abandoned_conversations,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT platform) as platforms_used
      FROM conversation_sessions
      WHERE organization_id = $1
        AND created_at >= $2
        AND created_at <= $3
    `;
    const conversationParams = [organizationId, startTime, now];

    if (chatbot_id) {
      conversationQuery += ' AND chatbot_id = $4';
      conversationParams.push(chatbot_id);
    }

    const conversationResult = await client.query(conversationQuery, conversationParams);
    analytics.conversations = conversationResult.rows[0];

    // Message metrics
    let messageQuery = `
      SELECT
        COUNT(*) as total_messages,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as user_messages,
        COUNT(CASE WHEN role = 'assistant' THEN 1 END) as assistant_messages,
        AVG(token_count) as avg_token_count,
        SUM(token_count) as total_tokens,
        AVG(response_time_ms) as avg_response_time
      FROM messages m
      JOIN conversation_sessions cs ON m.session_id = cs.id
      WHERE cs.organization_id = $1
        AND m.created_at >= $2
        AND m.created_at <= $3
    `;
    const messageParams = [organizationId, startTime, now];

    if (chatbot_id) {
      messageQuery += ' AND cs.chatbot_id = $4';
      messageParams.push(chatbot_id);
    }

    const messageResult = await client.query(messageQuery, messageParams);
    analytics.messages = messageResult.rows[0];

    // Document processing metrics
    let documentQuery = `
      SELECT
        COUNT(*) as total_documents,
        COUNT(CASE WHEN processing_stage = 'completed' THEN 1 END) as processed_documents,
        COUNT(CASE WHEN processing_stage = 'failed' THEN 1 END) as failed_documents,
        COUNT(CASE WHEN processing_stage = 'processing' THEN 1 END) as processing_documents,
        AVG(file_size) as avg_file_size,
        SUM(file_size) as total_file_size
      FROM documents
      WHERE organization_id = $1
        AND created_at >= $2
        AND created_at <= $3
    `;

    const documentResult = await client.query(documentQuery, [organizationId, startTime, now]);
    analytics.documents = documentResult.rows[0];

    // Chatbot metrics
    let chatbotQuery = `
      SELECT
        COUNT(*) as total_chatbots,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_chatbots,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_chatbots,
        COUNT(CASE WHEN status = 'training' THEN 1 END) as training_chatbots,
        COUNT(DISTINCT model_provider) as model_providers_used
      FROM chatbot_instances
      WHERE organization_id = $1
        AND created_at >= $2
        AND created_at <= $3
    `;

    if (chatbot_id) {
      chatbotQuery += ' AND id = $4';
    }

    const chatbotResult = await client.query(chatbotQuery,
      chatbot_id ? [organizationId, startTime, now, chatbot_id] : [organizationId, startTime, now]
    );
    analytics.chatbots = chatbotResult.rows[0];

    // Platform distribution
    let platformQuery = `
      SELECT
        platform,
        COUNT(*) as conversation_count,
        COUNT(DISTINCT user_id) as unique_users
      FROM conversation_sessions
      WHERE organization_id = $1
        AND created_at >= $2
        AND created_at <= $3
    `;
    const platformParams = [organizationId, startTime, now];

    if (chatbot_id) {
      platformQuery += ' AND chatbot_id = $4';
      platformParams.push(chatbot_id);
    }

    platformQuery += ' GROUP BY platform ORDER BY conversation_count DESC';

    const platformResult = await client.query(platformQuery, platformParams);
    analytics.platform_distribution = platformResult.rows;

    // Performance metrics (if requested)
    if (include_performance) {
      const perfQuery = `
        SELECT
          AVG(response_time_ms) as avg_response_time,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as median_response_time,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
          MIN(response_time_ms) as min_response_time,
          MAX(response_time_ms) as max_response_time
        FROM messages m
        JOIN conversation_sessions cs ON m.session_id = cs.id
        WHERE cs.organization_id = $1
          AND m.created_at >= $2
          AND m.created_at <= $3
          AND m.response_time_ms IS NOT NULL
      `;

      const perfResult = await client.query(perfQuery, [organizationId, startTime, now]);
      analytics.performance = perfResult.rows[0];
    }

    // Cost metrics (if requested)
    if (include_costs) {
      const costQuery = `
        SELECT
          SUM(cost_usd) as total_cost,
          AVG(cost_usd) as avg_cost_per_message,
          SUM(input_tokens) as total_input_tokens,
          SUM(output_tokens) as total_output_tokens
        FROM messages m
        JOIN conversation_sessions cs ON m.session_id = cs.id
        WHERE cs.organization_id = $1
          AND m.created_at >= $2
          AND m.created_at <= $3
          AND m.cost_usd IS NOT NULL
      `;

      const costResult = await client.query(costQuery, [organizationId, startTime, now]);
      analytics.costs = costResult.rows[0];
    }

    // Add summary calculations
    analytics.summary = {
      total_conversations: parseInt(analytics.conversations.total_conversations || 0),
      total_messages: parseInt(analytics.messages.total_messages || 0),
      unique_users: parseInt(analytics.conversations.unique_users || 0),
      avg_messages_per_conversation: analytics.conversations.total_conversations > 0 ?
        (analytics.messages.total_messages / analytics.conversations.total_conversations).toFixed(2) : 0,
      completion_rate: analytics.conversations.total_conversations > 0 ?
        ((analytics.conversations.completed_conversations / analytics.conversations.total_conversations) * 100).toFixed(2) + '%' : '0%'
    };

    analytics.generated_at = now.toISOString();

    return successResponse(analytics);

  } catch (error: any) {
    console.error('Analytics GET error:', error);
    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

// Export Sentry-monitored route handler
export const GET = withChatbotMonitoring(handleGET, 'analytics_overview');