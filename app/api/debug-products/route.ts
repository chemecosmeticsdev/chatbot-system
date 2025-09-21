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

    // Get all products
    const productsQuery = `SELECT id, name, organization_id FROM products LIMIT 10;`;
    const productsResult = await client.query(productsQuery);

    // Get all organizations
    const orgsQuery = `SELECT id, name FROM organizations LIMIT 10;`;
    const orgsResult = await client.query(orgsQuery);

    return NextResponse.json({
      success: true,
      data: {
        products: productsResult.rows,
        organizations: orgsResult.rows,
        message: 'Debug data retrieved successfully'
      }
    });

  } catch (error: any) {
    console.error('Debug products error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      debug: 'Error in debug endpoint'
    }, { status: 500 });
  } finally {
    await client.end();
  }
}