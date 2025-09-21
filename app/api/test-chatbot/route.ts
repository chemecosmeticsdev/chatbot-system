import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { getConfigSafe } from '@/lib/config';

export async function GET() {
  try {
    // Test database connection
    const config = getConfigSafe();
    const client = new Client({
      connectionString: config.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Test chatbot_instances table exists and query
    const result = await client.query('SELECT COUNT(*) as count FROM chatbot_instances');
    await client.end();

    return NextResponse.json({
      success: true,
      message: 'Chatbot table test successful',
      data: {
        chatbot_count: result.rows[0].count,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Chatbot test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}