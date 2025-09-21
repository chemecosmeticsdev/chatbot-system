import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { getConfig } from '@/lib/config';

export async function GET() {
  try {
    const config = getConfig();
    const client = new Client({
      connectionString: config.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Get existing chatbot with organization_id
    const chatbotResult = await client.query(`
      SELECT id, name, organization_id, created_at
      FROM chatbot_instances
      ORDER BY created_at DESC
      LIMIT 1
    `);

    // Get all organizations
    const orgResult = await client.query(`
      SELECT id, name, created_at
      FROM organizations
      ORDER BY created_at DESC
    `);

    await client.end();

    return NextResponse.json({
      success: true,
      data: {
        existing_chatbot: chatbotResult.rows[0] || null,
        organizations: orgResult.rows
      }
    });
  } catch (error: any) {
    console.error('Organization check error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}