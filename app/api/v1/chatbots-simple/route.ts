import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { getConfig } from '@/lib/config';

// Simple database client without monitoring wrappers
function createDatabaseClient(): Client {
  const config = getConfig();
  return new Client({
    connectionString: config.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

// Get organization ID from request - use existing organization from database
function getOrganizationId(request: NextRequest): string {
  return 'bf5e7b6e-f44c-4393-9fc4-8be04af5be45';
}

/**
 * GET /api/v1/chatbots-simple
 * Simple chatbot listing without complex monitoring
 */
export async function GET(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const organizationId = getOrganizationId(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Validate pagination
    if (page < 1) {
      return NextResponse.json({
        success: false,
        error: 'Page must be a positive integer'
      }, { status: 400 });
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json({
        success: false,
        error: 'Limit must be between 1 and 100'
      }, { status: 400 });
    }

    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) FROM chatbot_instances
      WHERE organization_id = $1
    `;
    const countResult = await client.query(countQuery, [organizationId]);
    const total = parseInt(countResult.rows[0].count);

    // Get chatbots
    const query = `
      SELECT
        id, organization_id, name, description, status,
        llm_provider, llm_model, system_prompt, model_config,
        rag_enabled, retrieval_k, score_threshold, context_window,
        welcome_message, fallback_message, performance_metrics,
        created_at, updated_at, created_by
      FROM chatbot_instances
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await client.query(query, [organizationId, limit, offset]);

    return NextResponse.json({
      success: true,
      data: {
        chatbots: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error: any) {
    console.error('Simple chatbots GET error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      debug: 'Error in simple chatbots endpoint'
    }, { status: 500 });
  } finally {
    await client.end();
  }
}

/**
 * POST /api/v1/chatbots-simple
 * Simple chatbot creation without complex monitoring
 */
export async function POST(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    await client.connect();
    const organizationId = getOrganizationId(request);

    // Parse request body
    let requestData;
    try {
      requestData = await request.json();
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    // Validate required fields
    if (!requestData.name) {
      return NextResponse.json({
        success: false,
        error: 'name is required'
      }, { status: 400 });
    }

    if (!requestData.system_prompt) {
      return NextResponse.json({
        success: false,
        error: 'system_prompt is required'
      }, { status: 400 });
    }

    // Set defaults - using actual table structure
    const chatbotData = {
      organization_id: organizationId,
      name: requestData.name,
      description: requestData.description || null,
      status: 'draft',
      llm_provider: requestData.llm_provider || 'bedrock',
      llm_model: requestData.llm_model || 'amazon.nova-micro-v1:0',
      system_prompt: requestData.system_prompt,
      model_config: JSON.stringify({
        temperature: requestData.temperature || 0.7,
        max_tokens: requestData.max_tokens || 1000,
        top_p: requestData.top_p || 0.9
      }),
      rag_enabled: requestData.rag_enabled !== undefined ? requestData.rag_enabled : false,
      retrieval_k: requestData.retrieval_k || 5,
      score_threshold: requestData.score_threshold || 0.7,
      context_window: requestData.context_window || 4000,
      welcome_message: requestData.welcome_message || 'Hello! How can I help you today?',
      fallback_message: requestData.fallback_message || 'I\'m sorry, I didn\'t understand that. Can you please rephrase?',
      performance_metrics: JSON.stringify({}),
      created_by: null
    };

    const insertQuery = `
      INSERT INTO chatbot_instances (
        organization_id, name, description, status, llm_provider, llm_model,
        system_prompt, model_config, rag_enabled, retrieval_k, score_threshold,
        context_window, welcome_message, fallback_message, performance_metrics, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      chatbotData.organization_id,
      chatbotData.name,
      chatbotData.description,
      chatbotData.status,
      chatbotData.llm_provider,
      chatbotData.llm_model,
      chatbotData.system_prompt,
      chatbotData.model_config,
      chatbotData.rag_enabled,
      chatbotData.retrieval_k,
      chatbotData.score_threshold,
      chatbotData.context_window,
      chatbotData.welcome_message,
      chatbotData.fallback_message,
      chatbotData.performance_metrics,
      chatbotData.created_by
    ];

    const result = await client.query(insertQuery, values);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Chatbot created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Simple chatbots POST error:', error);

    // Handle specific database errors
    if (error.message.includes('foreign key constraint')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid organization ID or missing organization',
        debug: error.message
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: error.message,
      debug: 'Error in simple chatbots creation'
    }, { status: 500 });
  } finally {
    await client.end();
  }
}