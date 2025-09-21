import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { getConfig } from '@/lib/config';

/**
 * Test RAG Search Functionality
 *
 * Tests vector similarity search against processed document chunks:
 * 1. Query existing document chunks
 * 2. Perform similarity search (simulated)
 * 3. Retrieve relevant chunks for chatbot context
 * 4. Test knowledge base integration
 */

function createDatabaseClient(): Client {
  const config = getConfig();
  return new Client({
    connectionString: config.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

// Simulate vector similarity search
function simulateVectorSearch(query: string, chunks: any[]): Array<{
  chunk: any;
  similarity_score: number;
  relevance_reason: string;
}> {
  const queryLower = query.toLowerCase();

  return chunks.map(chunk => {
    let score = 0;
    let reasons = [];

    // Check for keyword matches
    const content = chunk.chunk_text.toLowerCase();
    if (content.includes('depa')) score += 0.3;
    if (content.includes('digital')) score += 0.2;
    if (content.includes('thailand')) score += 0.2;
    if (content.includes('economy')) score += 0.2;
    if (content.includes('agency')) score += 0.1;

    // Query-specific scoring
    if (queryLower.includes('depa') && content.includes('depa')) {
      score += 0.3;
      reasons.push('DEPA keyword match');
    }
    if (queryLower.includes('digital') && content.includes('digital')) {
      score += 0.2;
      reasons.push('Digital keyword match');
    }
    if (queryLower.includes('thailand') && content.includes('thailand')) {
      score += 0.2;
      reasons.push('Thailand keyword match');
    }
    if (queryLower.includes('contact') && chunk.chunk_type === 'ingredient_level') {
      score += 0.4;
      reasons.push('Contact information match');
    }
    if (queryLower.includes('vision') && chunk.chunk_type === 'product_level' && content.includes('vision')) {
      score += 0.4;
      reasons.push('Vision statement match');
    }

    // Add some randomness for realistic simulation
    score += Math.random() * 0.1;

    return {
      chunk,
      similarity_score: Math.min(score, 1.0),
      relevance_reason: reasons.join(', ') || 'General content relevance'
    };
  }).sort((a, b) => b.similarity_score - a.similarity_score);
}

// Generate chatbot response based on retrieved chunks
function generateChatbotResponse(query: string, relevantChunks: any[]): {
  response: string;
  sources: string[];
  confidence: number;
} {
  if (relevantChunks.length === 0) {
    return {
      response: "I don't have specific information about that topic in my knowledge base.",
      sources: [],
      confidence: 0.1
    };
  }

  const topChunk = relevantChunks[0];
  let response = '';
  let sources = [];

  if (query.toLowerCase().includes('contact') || query.toLowerCase().includes('phone') || query.toLowerCase().includes('email')) {
    const contactChunk = relevantChunks.find(r => r.chunk.chunk_type === 'ingredient_level');
    if (contactChunk) {
      response = `For DEPA contact information: ${contactChunk.chunk.chunk_text}`;
      sources.push('DEPA Contact Information');
    }
  } else if (query.toLowerCase().includes('vision') || query.toLowerCase().includes('goal')) {
    const visionChunk = relevantChunks.find(r => r.chunk.chunk_text.toLowerCase().includes('vision'));
    if (visionChunk) {
      response = `DEPA's vision: ${visionChunk.chunk.chunk_text}`;
      sources.push('DEPA Vision Statement');
    }
  } else if (query.toLowerCase().includes('what is depa') || query.toLowerCase().includes('about depa')) {
    response = `The Digital Economy Promotion Agency (DEPA) is a government agency established to drive Thailand's digital transformation. DEPA accelerates the development of Thailand's digital economy through strategic initiatives, technology adoption, and digital skills development.`;
    sources.push('DEPA Overview');
  } else {
    // General response based on top chunk
    response = `Based on DEPA information: ${topChunk.chunk.chunk_text.substring(0, 200)}${topChunk.chunk.chunk_text.length > 200 ? '...' : ''}`;
    sources.push(`DEPA ${topChunk.chunk.chunk_type} section`);
  }

  return {
    response,
    sources,
    confidence: topChunk.similarity_score
  };
}

export async function POST(request: NextRequest) {
  const client = createDatabaseClient();

  try {
    await client.connect();

    // Parse request body for query
    let requestData;
    try {
      requestData = await request.json();
    } catch {
      requestData = { query: 'What is DEPA?' }; // Default query
    }

    const query = requestData.query || 'What is DEPA?';

    // Step 1: Get all document chunks (simulating vector search)
    const chunksQuery = `
      SELECT
        dc.id, dc.document_id, dc.chunk_index, dc.chunk_text, dc.chunk_type,
        dc.token_count, dc.confidence_score, dc.metadata, dc.created_at,
        d.title as document_title, d.filename
      FROM document_chunks dc
      JOIN documents d ON dc.document_id = d.id
      WHERE d.title LIKE '%DEPA%' OR d.filename LIKE '%depa%'
      ORDER BY dc.chunk_index
    `;

    const chunksResult = await client.query(chunksQuery);
    const chunks = chunksResult.rows;

    if (chunks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No DEPA document chunks found in knowledge base',
        suggestion: 'Run document processing test first to create chunks'
      }, { status: 404 });
    }

    // Step 2: Simulate vector similarity search
    const searchResults = simulateVectorSearch(query, chunks);
    const topResults = searchResults.slice(0, 3); // Top 3 most relevant

    // Step 3: Generate chatbot response
    const chatbotResponse = generateChatbotResponse(query, topResults);

    // Step 4: Return comprehensive RAG results
    return NextResponse.json({
      success: true,
      message: 'RAG search completed successfully',
      data: {
        query: query,
        knowledge_base_stats: {
          total_chunks_searched: chunks.length,
          relevant_chunks_found: topResults.length,
          search_method: 'simulated_vector_similarity'
        },
        search_results: topResults.map(result => ({
          chunk_id: result.chunk.id,
          document_id: result.chunk.document_id,
          chunk_type: result.chunk.chunk_type,
          similarity_score: result.similarity_score,
          relevance_reason: result.relevance_reason,
          content_preview: result.chunk.chunk_text.substring(0, 150) +
                          (result.chunk.chunk_text.length > 150 ? '...' : ''),
          document_title: result.chunk.document_title,
          filename: result.chunk.filename,
          metadata: result.chunk.metadata
        })),
        chatbot_response: {
          answer: chatbotResponse.response,
          confidence: chatbotResponse.confidence,
          sources: chatbotResponse.sources,
          response_quality: chatbotResponse.confidence > 0.7 ? 'high' :
                          chatbotResponse.confidence > 0.4 ? 'medium' : 'low'
        },
        rag_metrics: {
          retrieval_time: '~50ms (simulated)',
          generation_time: '~200ms (simulated)',
          total_processing_time: '~250ms',
          chunks_used_in_response: topResults.length,
          knowledge_coverage: chunks.length > 0 ? 'available' : 'limited'
        }
      }
    });

  } catch (error: any) {
    console.error('RAG search test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  } finally {
    await client.end();
  }
}