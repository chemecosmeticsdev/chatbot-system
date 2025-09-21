import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { getConfig } from '@/lib/config';
import { withChatbotMonitoring } from '@/lib/monitoring/api-wrapper';

/**
 * Cost Analytics API Routes
 *
 * Handles detailed cost tracking and budget analysis.
 * Routes: GET /api/v1/analytics/costs
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
 * GET /api/v1/analytics/costs
 * Get detailed cost analytics and budget tracking
 */
async function handleGET(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const organizationId = getOrganizationId(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const time_range = searchParams.get('time_range') || '30d';
    const chatbot_id = searchParams.get('chatbot_id') || undefined;
    const breakdown_by = searchParams.get('breakdown_by') || 'model'; // model, chatbot, platform, time
    const include_projections = searchParams.get('include_projections') === 'true';

    // Validate parameters
    if (!['7d', '30d', '90d', '1y'].includes(time_range)) {
      return errorResponse('time_range must be one of: 7d, 30d, 90d, 1y');
    }

    if (!['model', 'chatbot', 'platform', 'time'].includes(breakdown_by)) {
      return errorResponse('breakdown_by must be one of: model, chatbot, platform, time');
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
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        intervalSize = '1 day';
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        intervalSize = '1 day';
        break;
      case '90d':
        startTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        intervalSize = '1 week';
        break;
      case '1y':
        startTime = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        intervalSize = '1 month';
        break;
      default:
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        intervalSize = '1 day';
    }

    const costs: any = {
      breakdown_by,
      time_range,
      start_time: startTime.toISOString(),
      end_time: now.toISOString(),
      interval_size: intervalSize
    };

    let baseCondition = `
      cs.organization_id = $1
      AND m.created_at >= $2
      AND m.created_at <= $3
      AND m.cost_usd IS NOT NULL
    `;
    const baseParams = [organizationId, startTime, now];

    if (chatbot_id) {
      baseCondition += ' AND cs.chatbot_id = $4';
      baseParams.push(chatbot_id);
    }

    // Overall cost summary
    const summaryQuery = `
      SELECT
        SUM(m.cost_usd) as total_cost,
        AVG(m.cost_usd) as avg_cost_per_message,
        COUNT(*) as total_messages,
        SUM(m.input_tokens) as total_input_tokens,
        SUM(m.output_tokens) as total_output_tokens,
        SUM(m.input_tokens + m.output_tokens) as total_tokens,
        ROUND(SUM(m.cost_usd) / NULLIF(SUM(m.input_tokens + m.output_tokens), 0) * 1000, 6) as cost_per_1k_tokens
      FROM messages m
      JOIN conversation_sessions cs ON m.session_id = cs.id
      JOIN chatbot_instances ci ON cs.chatbot_id = ci.id
      WHERE ${baseCondition}
    `;

    const summaryResult = await client.query(summaryQuery, baseParams);
    costs.summary = summaryResult.rows[0];

    // Breakdown analysis
    switch (breakdown_by) {
      case 'model':
        const modelQuery = `
          SELECT
            ci.model_provider,
            ci.model_name,
            SUM(m.cost_usd) as total_cost,
            AVG(m.cost_usd) as avg_cost_per_message,
            COUNT(*) as message_count,
            SUM(m.input_tokens) as total_input_tokens,
            SUM(m.output_tokens) as total_output_tokens,
            ROUND(SUM(m.cost_usd) / NULLIF(SUM(m.input_tokens + m.output_tokens), 0) * 1000, 6) as cost_per_1k_tokens
          FROM messages m
          JOIN conversation_sessions cs ON m.session_id = cs.id
          JOIN chatbot_instances ci ON cs.chatbot_id = ci.id
          WHERE ${baseCondition}
          GROUP BY ci.model_provider, ci.model_name
          ORDER BY total_cost DESC
        `;

        const modelResult = await client.query(modelQuery, baseParams);
        costs.breakdown = modelResult.rows;
        break;

      case 'chatbot':
        const chatbotQuery = `
          SELECT
            ci.id as chatbot_id,
            ci.name as chatbot_name,
            ci.model_provider,
            ci.model_name,
            SUM(m.cost_usd) as total_cost,
            AVG(m.cost_usd) as avg_cost_per_message,
            COUNT(*) as message_count,
            COUNT(DISTINCT cs.id) as conversation_count,
            SUM(m.input_tokens) as total_input_tokens,
            SUM(m.output_tokens) as total_output_tokens
          FROM messages m
          JOIN conversation_sessions cs ON m.session_id = cs.id
          JOIN chatbot_instances ci ON cs.chatbot_id = ci.id
          WHERE ${baseCondition}
          GROUP BY ci.id, ci.name, ci.model_provider, ci.model_name
          ORDER BY total_cost DESC
        `;

        const chatbotResult = await client.query(chatbotQuery, baseParams);
        costs.breakdown = chatbotResult.rows;
        break;

      case 'platform':
        const platformQuery = `
          SELECT
            cs.platform,
            SUM(m.cost_usd) as total_cost,
            AVG(m.cost_usd) as avg_cost_per_message,
            COUNT(*) as message_count,
            COUNT(DISTINCT cs.id) as conversation_count,
            COUNT(DISTINCT cs.user_id) as unique_users
          FROM messages m
          JOIN conversation_sessions cs ON m.session_id = cs.id
          WHERE ${baseCondition}
          GROUP BY cs.platform
          ORDER BY total_cost DESC
        `;

        const platformResult = await client.query(platformQuery, baseParams);
        costs.breakdown = platformResult.rows;
        break;

      case 'time':
        const timeQuery = `
          SELECT
            date_trunc('${intervalSize}', m.created_at) as time_bucket,
            SUM(m.cost_usd) as total_cost,
            AVG(m.cost_usd) as avg_cost_per_message,
            COUNT(*) as message_count,
            SUM(m.input_tokens) as total_input_tokens,
            SUM(m.output_tokens) as total_output_tokens,
            COUNT(DISTINCT cs.id) as conversation_count
          FROM messages m
          JOIN conversation_sessions cs ON m.session_id = cs.id
          WHERE ${baseCondition}
          GROUP BY time_bucket
          ORDER BY time_bucket
        `;

        const timeResult = await client.query(timeQuery, baseParams);
        costs.time_series = timeResult.rows;
        break;
    }

    // Cost projections (if requested)
    if (include_projections) {
      const daysInPeriod = Math.floor((now.getTime() - startTime.getTime()) / (24 * 60 * 60 * 1000));
      const dailyAvgCost = parseFloat(costs.summary.total_cost || 0) / daysInPeriod;

      costs.projections = {
        daily_average: dailyAvgCost.toFixed(4),
        weekly_projection: (dailyAvgCost * 7).toFixed(2),
        monthly_projection: (dailyAvgCost * 30).toFixed(2),
        yearly_projection: (dailyAvgCost * 365).toFixed(2)
      };

      // Budget alerts (example thresholds)
      const monthlyProjection = dailyAvgCost * 30;
      costs.budget_alerts = {
        current_monthly_projection: monthlyProjection.toFixed(2),
        alerts: []
      };

      if (monthlyProjection > 1000) {
        costs.budget_alerts.alerts.push({
          level: 'high',
          message: 'Monthly projection exceeds $1000',
          suggested_action: 'Review high-cost models and optimize usage'
        });
      } else if (monthlyProjection > 500) {
        costs.budget_alerts.alerts.push({
          level: 'medium',
          message: 'Monthly projection exceeds $500',
          suggested_action: 'Monitor usage and consider cost optimization'
        });
      }
    }

    costs.generated_at = now.toISOString();

    return successResponse(costs);

  } catch (error: any) {
    console.error('Cost analytics error:', error);
    return errorResponse(error.message, 500);
  } finally {
    await client.end();
  }
}

// Export Sentry-monitored route handler
export const GET = withChatbotMonitoring(handleGET, 'analytics_costs');