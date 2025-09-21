import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { getConfig } from '@/lib/config';

export async function GET() {
  const config = getConfig();
  const client = new Client({
    connectionString: config.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Check if the chatbot_instances table exists
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'chatbot_instances'
      );
    `;

    const tableExists = await client.query(tableCheckQuery);

    if (!tableExists.rows[0].exists) {
      return NextResponse.json({
        success: false,
        error: 'chatbot_instances table does not exist',
        debug: 'Table missing from database schema'
      }, { status: 500 });
    }

    // Try a simple select
    const simpleQuery = `SELECT COUNT(*) FROM chatbot_instances;`;
    const countResult = await client.query(simpleQuery);

    return NextResponse.json({
      success: true,
      data: {
        table_exists: true,
        chatbot_count: countResult.rows[0].count,
        message: 'Debug check passed'
      }
    });

  } catch (error: any) {
    console.error('Debug chatbots error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      debug: 'Error in debug endpoint'
    }, { status: 500 });
  } finally {
    await client.end();
  }
}