import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { getConfig } from '@/lib/config';
import { v4 as uuidv4 } from 'uuid';

function createDatabaseClient(): Client {
  const config = getConfig();
  return new Client({
    connectionString: config.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

function getOrganizationId(request: NextRequest): string {
  // Use the existing organization ID from the database
  return 'bf5e7b6e-f44c-4393-9fc4-8be04af5be45';
}

export async function POST(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    await client.connect();

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

    // Set defaults
    const chatbotData = {
      id: uuidv4(),
      organization_id: getOrganizationId(request),
      name: requestData.name,
      description: requestData.description || null,
      status: 'draft',
      llm_provider: requestData.llm_provider || 'bedrock',
      llm_model: requestData.llm_model || 'amazon.nova-micro-v1:0',
      system_prompt: requestData.system_prompt,
      model_config: requestData.model_config || {
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9
      },
      rag_enabled: requestData.rag_enabled || false,
      retrieval_k: requestData.retrieval_k || 5,
      score_threshold: requestData.score_threshold || 0.7,
      context_window: requestData.context_window || 4000,
      welcome_message: requestData.welcome_message || 'Hello! How can I help you today?',
      fallback_message: requestData.fallback_message || 'I\'m sorry, I didn\'t understand that. Can you please rephrase?',
      performance_metrics: {},
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null
    };

    // Insert into database
    const insertQuery = `
      INSERT INTO chatbot_instances (
        id, organization_id, name, description, status, llm_provider, llm_model,
        system_prompt, model_config, rag_enabled, retrieval_k, score_threshold,
        context_window, welcome_message, fallback_message, performance_metrics,
        created_at, updated_at, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) RETURNING *
    `;

    const values = [
      chatbotData.id,
      chatbotData.organization_id,
      chatbotData.name,
      chatbotData.description,
      chatbotData.status,
      chatbotData.llm_provider,
      chatbotData.llm_model,
      chatbotData.system_prompt,
      JSON.stringify(chatbotData.model_config),
      chatbotData.rag_enabled,
      chatbotData.retrieval_k,
      chatbotData.score_threshold,
      chatbotData.context_window,
      chatbotData.welcome_message,
      chatbotData.fallback_message,
      JSON.stringify(chatbotData.performance_metrics),
      chatbotData.created_at,
      chatbotData.updated_at,
      chatbotData.created_by
    ];

    const result = await client.query(insertQuery, values);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Chatbot created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Chatbot creation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    await client.end();
  }
}