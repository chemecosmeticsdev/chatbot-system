import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { getConfigSafe } from '@/lib/config';

function createDatabaseClient(): Client {
  const config = getConfigSafe();
  return new Client({
    connectionString: config.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

export async function GET(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    await client.connect();

    // Simple query to list chatbots
    const result = await client.query(`
      SELECT
        id,
        name,
        status,
        llm_provider,
        llm_model,
        created_at
      FROM chatbot_instances
      ORDER BY created_at DESC
      LIMIT 10
    `);

    return NextResponse.json({
      success: true,
      data: {
        chatbots: result.rows,
        count: result.rows.length
      }
    });

  } catch (error: any) {
    console.error('Chatbot simple API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    await client.end();
  }
}