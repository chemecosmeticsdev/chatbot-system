import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { getConfig } from '@/lib/config';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create DEPA Document Chunks
 *
 * Manually create DEPA document chunks for testing RAG functionality
 */

function createDatabaseClient(): Client {
  const config = getConfig();
  return new Client({
    connectionString: config.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

// DEPA content chunks based on our document processing test
const depaChunks = [
  {
    chunk_text: "DEPA Overview - Digital Economy Promotion Agency",
    chunk_type: "product_level",
    chunk_index: 0,
    token_count: 8,
    metadata: {
      type: "header",
      section: "title",
      language: "en",
      source: "depa_overview_pdf"
    }
  },
  {
    chunk_text: "Thailand's Digital Economy Development",
    chunk_type: "product_level",
    chunk_index: 1,
    token_count: 5,
    metadata: {
      type: "content",
      section: "description",
      language: "en",
      source: "depa_overview_pdf"
    }
  },
  {
    chunk_text: "The Digital Economy Promotion Agency (DEPA) is a government agency established to drive Thailand's digital transformation. Our mission is to accelerate the development of Thailand's digital economy through strategic initiatives, technology adoption, and digital skills development.",
    chunk_type: "product_level",
    chunk_index: 2,
    token_count: 50,
    metadata: {
      type: "content",
      section: "description",
      language: "en",
      source: "depa_overview_pdf"
    }
  },
  {
    chunk_text: "Key Initiatives:\n1. Digital Infrastructure Development\n2. Digital Skills and Talent Development\n3. Digital Innovation and Startup Support\n4. Digital Government Services\n5. Cybersecurity Enhancement",
    chunk_type: "formulation_level",
    chunk_index: 3,
    token_count: 35,
    metadata: {
      type: "list",
      section: "initiatives",
      language: "en",
      source: "depa_overview_pdf"
    }
  },
  {
    chunk_text: "Strategic Goals:\n- Increase digital economy contribution to GDP\n- Enhance digital literacy among Thai citizens\n- Support digital transformation of traditional industries\n- Promote innovation and entrepreneurship\n- Strengthen Thailand's position as a regional digital hub",
    chunk_type: "formulation_level",
    chunk_index: 4,
    token_count: 45,
    metadata: {
      type: "list",
      section: "initiatives",
      language: "en",
      source: "depa_overview_pdf"
    }
  },
  {
    chunk_text: "Programs and Services:\n- Digital skills training programs\n- Startup incubation and acceleration\n- Digital transformation consulting\n- Research and development support\n- Public-private partnership facilitation",
    chunk_type: "formulation_level",
    chunk_index: 5,
    token_count: 35,
    metadata: {
      type: "content",
      section: "description",
      language: "en",
      source: "depa_overview_pdf"
    }
  },
  {
    chunk_text: "Contact Information:\nWebsite: www.depa.or.th\nEmail: info@depa.or.th\nPhone: +66 2 123 4567",
    chunk_type: "ingredient_level",
    chunk_index: 6,
    token_count: 20,
    metadata: {
      type: "contact",
      section: "contact",
      language: "en",
      source: "depa_overview_pdf"
    }
  },
  {
    chunk_text: "Vision: To position Thailand as a leading digital economy in ASEAN by 2027.",
    chunk_type: "product_level",
    chunk_index: 7,
    token_count: 15,
    metadata: {
      type: "vision",
      section: "vision",
      language: "en",
      source: "depa_overview_pdf"
    }
  }
];

// Generate mock embeddings (1536-dimensional vectors for AWS Titan Text v2)
function generateMockEmbedding(): number[] {
  return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
}

export async function POST(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    await client.connect();

    // First check if we have a DEPA document, if not create one
    const organizationId = 'bf5e7b6e-f44c-4393-9fc4-8be04af5be45';
    const productId = '599763d2-2bac-446e-ba30-ff8b751cf3a9';

    // Check for existing DEPA document
    const existingDocQuery = `
      SELECT id FROM documents
      WHERE title ILIKE '%depa%' OR filename ILIKE '%depa%'
      LIMIT 1
    `;
    const existingDoc = await client.query(existingDocQuery);

    let documentId;
    if (existingDoc.rows.length > 0) {
      documentId = existingDoc.rows[0].id;
    } else {
      // Create DEPA document
      documentId = uuidv4();
      const createDocQuery = `
        INSERT INTO documents (
          id, organization_id, product_id, title, filename, s3_key,
          mime_type, file_size, processing_status, extracted_metadata, document_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `;

      await client.query(createDocQuery, [
        documentId,
        organizationId,
        productId,
        'DEPA Overview Test Document',
        'depa_overview.pdf',
        `documents/${organizationId}/${documentId}/depa_overview.pdf`,
        'application/pdf',
        254880,
        'completed',
        JSON.stringify({
          test_document: true,
          source: 'manual_chunk_creation',
          created_for: 'rag_testing'
        }),
        'technical'
      ]);
    }

    // Clear existing DEPA chunks to avoid duplicates
    await client.query(`
      DELETE FROM document_chunks
      WHERE document_id = $1
    `, [documentId]);

    // Insert DEPA chunks
    let insertedChunks = [];
    for (const chunk of depaChunks) {
      const crypto = require('crypto');
      const contentHash = crypto.createHash('sha256').update(chunk.chunk_text).digest('hex');
      const embedding = generateMockEmbedding();

      const insertQuery = `
        INSERT INTO document_chunks (
          id, document_id, chunk_index, chunk_text, chunk_type,
          token_count, confidence_score, metadata,
          embedding, search_vector, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, to_tsvector('english', $4), $10)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        uuidv4(),
        documentId,
        chunk.chunk_index,
        chunk.chunk_text,
        chunk.chunk_type,
        chunk.token_count,
        0.95, // confidence_score
        JSON.stringify({
          ...chunk.metadata,
          processing_method: 'manual_creation',
          created_for: 'rag_testing'
        }),
        JSON.stringify(embedding),
        new Date()
      ]);

      insertedChunks.push(result.rows[0]);
    }

    return NextResponse.json({
      success: true,
      message: 'DEPA chunks created successfully',
      data: {
        document_id: documentId,
        chunks_created: insertedChunks.length,
        chunk_types: depaChunks.reduce((acc, chunk) => {
          acc[chunk.chunk_type] = (acc[chunk.chunk_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        chunks: insertedChunks.map(chunk => ({
          id: chunk.id,
          chunk_index: chunk.chunk_index,
          chunk_type: chunk.chunk_type,
          text_preview: chunk.chunk_text.substring(0, 100) +
                       (chunk.chunk_text.length > 100 ? '...' : ''),
          token_count: chunk.token_count
        }))
      }
    });

  } catch (error: any) {
    console.error('Create DEPA chunks error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  } finally {
    await client.end();
  }
}