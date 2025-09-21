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

    // Get chunk count and sample chunks
    const countQuery = `SELECT COUNT(*) FROM document_chunks;`;
    const countResult = await client.query(countQuery);

    const sampleQuery = `
      SELECT
        dc.id, dc.document_id, dc.chunk_index, dc.chunk_type,
        LEFT(dc.chunk_text, 100) as text_preview,
        dc.token_count, dc.confidence_score,
        d.title, d.filename
      FROM document_chunks dc
      JOIN documents d ON dc.document_id = d.id
      ORDER BY dc.created_at DESC
      LIMIT 10;
    `;
    const sampleResult = await client.query(sampleQuery);

    // Check for any DEPA related chunks
    const depaQuery = `
      SELECT
        dc.id, dc.chunk_index, dc.chunk_type,
        LEFT(dc.chunk_text, 100) as text_preview,
        d.title, d.filename
      FROM document_chunks dc
      JOIN documents d ON dc.document_id = d.id
      WHERE d.title ILIKE '%depa%' OR d.filename ILIKE '%depa%' OR dc.chunk_text ILIKE '%depa%'
      ORDER BY dc.chunk_index;
    `;
    const depaResult = await client.query(depaQuery);

    return NextResponse.json({
      success: true,
      data: {
        total_chunks: countResult.rows[0].count,
        sample_chunks: sampleResult.rows,
        depa_chunks: depaResult.rows,
        depa_chunk_count: depaResult.rows.length,
        message: 'Chunk debug data retrieved successfully'
      }
    });

  } catch (error: any) {
    console.error('Debug chunks error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      debug: 'Error in debug chunks endpoint'
    }, { status: 500 });
  } finally {
    await client.end();
  }
}