import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { getConfigSafe } from '@/lib/config';
import { withChatbotMonitoring } from '@/lib/monitoring/api-wrapper';

/**
 * Performance Analytics API Routes
 *
 * Handles detailed performance metrics and monitoring data.
 * Routes: GET /api/v1/analytics/performance
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
 * GET /api/v1/analytics/performance
 * Get detailed performance analytics
 */
async function handleGET(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const organizationId = getOrganizationId(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const time_range = searchParams.get('time_range') || '24h';
    const chatbot_id = searchParams.get('chatbot_id') || undefined;
    const metric_type = searchParams.get('metric_type') || 'response_time'; // response_time, token_usage, error_rate

    // Validate parameters
    if (!['1h', '24h', '7d', '30d'].includes(time_range)) {
      return errorResponse('time_range must be one of: 1h, 24h, 7d, 30d');
    }

    if (!['response_time', 'token_usage', 'error_rate', 'throughput'].includes(metric_type)) {
      return errorResponse('metric_type must be one of: response_time, token_usage, error_rate, throughput');
    }

    if (chatbot_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(chatbot_id)) {
        return errorResponse('Invalid chatbot_id format');
      }
    }

    // Calculate time range
    const now = new Date();
    let startTime: Date;
    let intervalSize: string;

    switch (time_range) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        intervalSize = '5 minutes';
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        intervalSize = '1 hour';
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        intervalSize = '6 hours';
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        intervalSize = '1 day';
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        intervalSize = '1 hour';
    }

    const performance: any = {
      metric_type,
      time_range,
      start_time: startTime.toISOString(),
      end_time: now.toISOString(),
      interval_size: intervalSize
    };

    let baseCondition = `
      cs.organization_id = $1
      AND m.created_at >= $2
      AND m.created_at <= $3
    `;
    const baseParams = [organizationId, startTime, now];

    if (chatbot_id) {
      baseCondition += ' AND cs.chatbot_id = $4';
      baseParams.push(chatbot_id);
    }

    switch (metric_type) {
      case 'response_time':
        // Response time metrics with time series
        const responseTimeQuery = `
          SELECT
            date_trunc('${intervalSize}', m.created_at) as time_bucket,
            AVG(m.response_time_ms) as avg_response_time,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.response_time_ms) as median_response_time,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY m.response_time_ms) as p95_response_time,
            PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY m.response_time_ms) as p99_response_time,
            MIN(m.response_time_ms) as min_response_time,
            MAX(m.response_time_ms) as max_response_time,
            COUNT(*) as message_count
          FROM messages m
          JOIN conversation_sessions cs ON m.session_id = cs.id
          WHERE ${baseCondition}
            AND m.response_time_ms IS NOT NULL
            AND m.role = 'assistant'
          GROUP BY time_bucket
          ORDER BY time_bucket
        `;

        const responseTimeResult = await client.query(responseTimeQuery, baseParams);
        performance.time_series = responseTimeResult.rows;

        // Overall statistics
        const overallStatsQuery = `
          SELECT
            AVG(m.response_time_ms) as avg_response_time,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.response_time_ms) as median_response_time,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY m.response_time_ms) as p95_response_time,
            PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY m.response_time_ms) as p99_response_time,
            MIN(m.response_time_ms) as min_response_time,
            MAX(m.response_time_ms) as max_response_time,
            STDDEV(m.response_time_ms) as stddev_response_time,
            COUNT(*) as total_responses
          FROM messages m
          JOIN conversation_sessions cs ON m.session_id = cs.id
          WHERE ${baseCondition}
            AND m.response_time_ms IS NOT NULL
            AND m.role = 'assistant'
        `;

        const overallResult = await client.query(overallStatsQuery, baseParams);
        performance.overall_stats = overallResult.rows[0];
        break;

      case 'token_usage':
        // Token usage metrics
        const tokenQuery = `
          SELECT
            date_trunc('${intervalSize}', m.created_at) as time_bucket,
            SUM(m.input_tokens) as total_input_tokens,
            SUM(m.output_tokens) as total_output_tokens,
            SUM(m.token_count) as total_tokens,
            AVG(m.token_count) as avg_tokens_per_message,
            COUNT(*) as message_count
          FROM messages m
          JOIN conversation_sessions cs ON m.session_id = cs.id
          WHERE ${baseCondition}
            AND m.token_count IS NOT NULL
          GROUP BY time_bucket
          ORDER BY time_bucket
        `;

        const tokenResult = await client.query(tokenQuery, baseParams);
        performance.time_series = tokenResult.rows;

        // Token efficiency metrics
        const tokenEfficiencyQuery = `
          SELECT
            SUM(m.input_tokens) as total_input_tokens,
            SUM(m.output_tokens) as total_output_tokens,
            SUM(m.token_count) as total_tokens,
            AVG(m.token_count) as avg_tokens_per_message,
            AVG(m.input_tokens) as avg_input_tokens,
            AVG(m.output_tokens) as avg_output_tokens,
            SUM(m.cost_usd) as total_cost,
            AVG(m.cost_usd) as avg_cost_per_message
          FROM messages m
          JOIN conversation_sessions cs ON m.session_id = cs.id
          WHERE ${baseCondition}
            AND m.token_count IS NOT NULL
        `;

        const tokenEffResult = await client.query(tokenEfficiencyQuery, baseParams);
        performance.overall_stats = tokenEffResult.rows[0];
        break;

      case 'error_rate':
        // Error rate metrics
        const errorQuery = `
          SELECT
            date_trunc('${intervalSize}', m.created_at) as time_bucket,
            COUNT(*) as total_messages,
            COUNT(CASE WHEN m.metadata::text LIKE '%error%' THEN 1 END) as error_messages,
            ROUND(
              COUNT(CASE WHEN m.metadata::text LIKE '%error%' THEN 1 END) * 100.0 / COUNT(*),
              2
            ) as error_rate_percent
          FROM messages m
          JOIN conversation_sessions cs ON m.session_id = cs.id
          WHERE ${baseCondition}
          GROUP BY time_bucket
          ORDER BY time_bucket
        `;

        const errorResult = await client.query(errorQuery, baseParams);
        performance.time_series = errorResult.rows;
        break;

      case 'throughput':
        // Throughput metrics
        const throughputQuery = `
          SELECT
            date_trunc('${intervalSize}', m.created_at) as time_bucket,
            COUNT(*) as message_count,
            COUNT(DISTINCT cs.id) as conversation_count,
            COUNT(DISTINCT cs.user_id) as unique_users,
            ROUND(COUNT(*)::numeric / EXTRACT(EPOCH FROM INTERVAL '${intervalSize}'), 2) as messages_per_second
          FROM messages m
          JOIN conversation_sessions cs ON m.session_id = cs.id
          WHERE ${baseCondition}
          GROUP BY time_bucket
          ORDER BY time_bucket
        `;

        const throughputResult = await client.query(throughputQuery, baseParams);
        performance.time_series = throughputResult.rows;
        break;
    }

    performance.generated_at = now.toISOString();

    return successResponse(performance);

  } catch (error: any) {
    console.error('Performance analytics error:', error);
    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

// Export Sentry-monitored route handler
export const GET = withChatbotMonitoring(handleGET, 'analytics_performance');