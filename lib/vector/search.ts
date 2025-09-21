/**
 * Vector Search Service
 *
 * Handles vector similarity search operations using pgvector.
 * Supports embedding generation, similarity search, and hybrid search.
 */

import { Client } from 'pg';
import { withDatabaseMonitoring, withExternalApiMonitoring } from '@/lib/monitoring/api-wrapper';
import { SentryUtils, VectorSearchError } from '@/lib/monitoring/sentry-utils';

export interface VectorSearchResult {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
  similarity_score: number;
  metadata: Record<string, any>;
  document_name?: string;
  product_id?: string;
}

export interface SearchFilters {
  product_ids?: string[];
  document_ids?: string[];
  content_types?: string[];
  min_similarity?: number;
  max_results?: number;
  limit?: number;
  similarity_threshold?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
  input_tokens?: number;
}

export interface HybridSearchResult extends VectorSearchResult {
  text_score?: number;
  combined_score?: number;
  rank_type: 'vector' | 'text' | 'hybrid';
}

export class VectorSearchService {
  private client: Client;
  private defaultModel: string = 'amazon.titan-embed-text-v2:0';
  private defaultDimensions: number = 1536;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Generate embedding for text using AWS Bedrock
   */
  async generateEmbedding(
    text: string,
    model: string = this.defaultModel
  ): Promise<EmbeddingResult> {
    return withExternalApiMonitoring(
      async () => {
        const startTime = Date.now();

        try {
          // This is a placeholder for AWS Bedrock integration
          // In a real implementation, this would call AWS Bedrock's embedding API
          const mockEmbedding = await this.mockEmbeddingGeneration(text, model);

          const duration = Date.now() - startTime;

          // Log successful embedding generation
          SentryUtils.addBreadcrumb('Vector embedding generated', {
            model,
            text_length: text.length,
            dimensions: mockEmbedding.length,
            duration_ms: duration
          });

          return {
            embedding: mockEmbedding,
            model,
            dimensions: mockEmbedding.length,
            input_tokens: Math.ceil(text.length / 4) // Rough token estimation
          };
        } catch (error) {
          throw new VectorSearchError(
            `Failed to generate embedding: ${(error as Error).message}`,
            { model, text_length: text.length }
          );
        }
      },
      {
        service: 'aws_bedrock',
        endpoint: 'invoke_model',
        additionalData: {
          model,
          text_length: text.length
        }
      }
    );
  }

  /**
   * Mock embedding generation (replace with actual AWS Bedrock call)
   */
  private async mockEmbeddingGeneration(text: string, model: string): Promise<number[]> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate mock embedding vector
    const dimensions = model.includes('v2') ? 1536 : 1024;
    const embedding = new Array(dimensions).fill(0).map(() => (Math.random() - 0.5) * 2);

    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  /**
   * Store embedding in database
   */
  async storeEmbedding(
    documentId: string,
    chunkIndex: number,
    content: string,
    embedding: number[],
    metadata: Record<string, any> = {}
  ): Promise<string> {
    return withDatabaseMonitoring(
      async () => {
        const query = `
          INSERT INTO document_chunks (
            document_id, chunk_index, content, embedding, metadata
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `;

        const values = [
          documentId,
          chunkIndex,
          content,
          JSON.stringify(embedding),
          JSON.stringify(metadata)
        ];

        const result = await this.client.query(query, values);

        if (result.rows.length === 0) {
          throw new VectorSearchError('Failed to store embedding');
        }

        const embeddingId = result.rows[0].id;

        // Log successful storage
        SentryUtils.addBreadcrumb('Vector embedding stored', {
          document_id: documentId,
          chunk_index: chunkIndex,
          embedding_id: embeddingId,
          content_length: content.length,
          embedding_dimensions: embedding.length
        });

        return embeddingId;
      },
      {
        operation: 'storeEmbedding',
        table: 'document_chunks',
        additionalData: {
          document_id: documentId,
          chunk_index: chunkIndex,
          content_length: content.length
        }
      }
    );
  }

  /**
   * Perform vector similarity search
   */
  async similaritySearch(
    query: string,
    chatbotId: string,
    sessionId: string,
    filters: SearchFilters = {}
  ): Promise<VectorSearchResult[]> {
    const startTime = Date.now();

    try {
      // Generate embedding for the query
      const embeddingResult = await this.generateEmbedding(query);

      // Perform the search
      const results = await this.vectorSearch(
        embeddingResult.embedding,
        chatbotId,
        filters
      );

      const duration = Date.now() - startTime;

      // Log successful search
      SentryUtils.captureVectorSearch({
        chatbotId,
        sessionId,
        query,
        resultsCount: results.length,
        searchTime: duration,
        success: true
      });

      return results;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log search failure
      SentryUtils.captureVectorSearch({
        chatbotId,
        sessionId,
        query,
        resultsCount: 0,
        searchTime: duration,
        success: false,
        errorMessage: (error as Error).message
      });

      throw error;
    }
  }

  /**
   * Internal vector search using pgvector
   */
  private async vectorSearch(
    queryEmbedding: number[],
    chatbotId: string,
    filters: SearchFilters = {}
  ): Promise<VectorSearchResult[]> {
    return withDatabaseMonitoring(
      async () => {
        let whereConditions = ['1=1']; // Base condition
        let queryParams: any[] = [JSON.stringify(queryEmbedding)];
        let paramIndex = 2;

        // Apply chatbot-specific filtering (through products)
        if (chatbotId) {
          whereConditions.push(`d.id IN (
            SELECT DISTINCT pd.document_id
            FROM product_documents pd
            JOIN chatbot_products cp ON pd.product_id = cp.product_id
            WHERE cp.chatbot_id = $${paramIndex}
          )`);
          queryParams.push(chatbotId);
          paramIndex++;
        }

        // Apply filters
        if (filters.product_ids && filters.product_ids.length > 0) {
          const placeholders = filters.product_ids.map((_, idx) => `$${paramIndex + idx}`).join(', ');
          whereConditions.push(`d.product_id IN (${placeholders})`);
          queryParams.push(...filters.product_ids);
          paramIndex += filters.product_ids.length;
        }

        if (filters.document_ids && filters.document_ids.length > 0) {
          const placeholders = filters.document_ids.map((_, idx) => `$${paramIndex + idx}`).join(', ');
          whereConditions.push(`dc.document_id IN (${placeholders})`);
          queryParams.push(...filters.document_ids);
          paramIndex += filters.document_ids.length;
        }

        if (filters.content_types && filters.content_types.length > 0) {
          const placeholders = filters.content_types.map((_, idx) => `$${paramIndex + idx}`).join(', ');
          whereConditions.push(`d.content_type IN (${placeholders})`);
          queryParams.push(...filters.content_types);
          paramIndex += filters.content_types.length;
        }

        const minSimilarity = filters.min_similarity || 0.1;
        const maxResults = Math.min(filters.max_results || 10, 50); // Cap at 50 results

        const query = `
          SELECT
            dc.id,
            dc.document_id,
            dc.chunk_index,
            dc.content,
            1 - (dc.embedding <=> $1::vector) as similarity,
            dc.metadata,
            d.name as document_name,
            d.product_id
          FROM document_chunks dc
          JOIN documents d ON dc.document_id = d.id
          WHERE ${whereConditions.join(' AND ')}
            AND 1 - (dc.embedding <=> $1::vector) >= $${paramIndex}
          ORDER BY dc.embedding <=> $1::vector
          LIMIT $${paramIndex + 1}
        `;

        queryParams.push(minSimilarity, maxResults);

        const result = await this.client.query(query, queryParams);

        return result.rows.map(row => ({
          id: row.id,
          document_id: row.document_id,
          chunk_index: row.chunk_index,
          content: row.content,
          similarity: parseFloat(row.similarity),
          similarity_score: parseFloat(row.similarity), // Same as similarity
          metadata: row.metadata || {},
          document_name: row.document_name,
          product_id: row.product_id
        }));
      },
      {
        operation: 'vectorSearch',
        table: 'document_chunks',
        additionalData: {
          chatbot_id: chatbotId,
          filters,
          embedding_dimensions: queryEmbedding.length
        }
      }
    );
  }

  /**
   * Hybrid search combining vector similarity and text search
   */
  async hybridSearch(
    query: string,
    chatbotId: string,
    sessionId: string,
    filters: SearchFilters = {},
    vectorWeight: number = 0.7,
    textWeight: number = 0.3
  ): Promise<HybridSearchResult[]> {
    const startTime = Date.now();

    try {
      // Run vector search and text search in parallel
      const [vectorResults, textResults] = await Promise.all([
        this.similaritySearch(query, chatbotId, sessionId, filters),
        this.textSearch(query, chatbotId, filters)
      ]);

      // Combine and rank results
      const hybridResults = this.combineSearchResults(
        vectorResults,
        textResults,
        vectorWeight,
        textWeight
      );

      const duration = Date.now() - startTime;

      // Log successful hybrid search
      SentryUtils.addBreadcrumb('Hybrid search completed', {
        chatbot_id: chatbotId,
        session_id: sessionId,
        query,
        vector_results: vectorResults.length,
        text_results: textResults.length,
        hybrid_results: hybridResults.length,
        duration_ms: duration
      });

      return hybridResults;
    } catch (error) {
      const duration = Date.now() - startTime;

      throw new VectorSearchError(
        `Hybrid search failed: ${(error as Error).message}`,
        {
          chatbot_id: chatbotId,
          session_id: sessionId,
          query,
          duration_ms: duration
        }
      );
    }
  }

  /**
   * Text-based search using PostgreSQL full-text search
   */
  private async textSearch(
    query: string,
    chatbotId: string,
    filters: SearchFilters = {}
  ): Promise<VectorSearchResult[]> {
    return withDatabaseMonitoring(
      async () => {
        let whereConditions = ['1=1'];
        let queryParams: any[] = [query];
        let paramIndex = 2;

        // Apply chatbot-specific filtering
        if (chatbotId) {
          whereConditions.push(`d.id IN (
            SELECT DISTINCT pd.document_id
            FROM product_documents pd
            JOIN chatbot_products cp ON pd.product_id = cp.product_id
            WHERE cp.chatbot_id = $${paramIndex}
          )`);
          queryParams.push(chatbotId);
          paramIndex++;
        }

        // Apply other filters similar to vector search
        if (filters.product_ids && filters.product_ids.length > 0) {
          const placeholders = filters.product_ids.map((_, idx) => `$${paramIndex + idx}`).join(', ');
          whereConditions.push(`d.product_id IN (${placeholders})`);
          queryParams.push(...filters.product_ids);
          paramIndex += filters.product_ids.length;
        }

        const maxResults = Math.min(filters.max_results || 10, 50);

        const searchQuery = `
          SELECT
            dc.id,
            dc.document_id,
            dc.chunk_index,
            dc.content,
            ts_rank(to_tsvector('english', dc.content), plainto_tsquery('english', $1)) as similarity,
            dc.metadata,
            d.name as document_name,
            d.product_id
          FROM document_chunks dc
          JOIN documents d ON dc.document_id = d.id
          WHERE ${whereConditions.join(' AND ')}
            AND to_tsvector('english', dc.content) @@ plainto_tsquery('english', $1)
          ORDER BY similarity DESC
          LIMIT $${paramIndex}
        `;

        queryParams.push(maxResults);

        const result = await this.client.query(searchQuery, queryParams);

        return result.rows.map(row => ({
          id: row.id,
          document_id: row.document_id,
          chunk_index: row.chunk_index,
          content: row.content,
          similarity: parseFloat(row.similarity),
          similarity_score: parseFloat(row.similarity), // Same as similarity
          metadata: row.metadata || {},
          document_name: row.document_name,
          product_id: row.product_id
        }));
      },
      {
        operation: 'textSearch',
        table: 'document_chunks',
        additionalData: {
          chatbot_id: chatbotId,
          query,
          filters
        }
      }
    );
  }

  /**
   * Combine vector and text search results
   */
  private combineSearchResults(
    vectorResults: VectorSearchResult[],
    textResults: VectorSearchResult[],
    vectorWeight: number,
    textWeight: number
  ): HybridSearchResult[] {
    const combinedMap = new Map<string, HybridSearchResult>();

    // Process vector results
    vectorResults.forEach((result, index) => {
      const normalizedScore = (vectorResults.length - index) / vectorResults.length;
      combinedMap.set(result.id, {
        ...result,
        text_score: 0,
        combined_score: normalizedScore * vectorWeight,
        rank_type: 'vector'
      });
    });

    // Process text results and combine
    textResults.forEach((result, index) => {
      const normalizedScore = (textResults.length - index) / textResults.length;
      const existing = combinedMap.get(result.id);

      if (existing) {
        // Combine scores
        existing.text_score = normalizedScore;
        existing.combined_score = (existing.combined_score || 0) + (normalizedScore * textWeight);
        existing.rank_type = 'hybrid';
      } else {
        // Add new text-only result
        combinedMap.set(result.id, {
          ...result,
          text_score: normalizedScore,
          combined_score: normalizedScore * textWeight,
          rank_type: 'text'
        });
      }
    });

    // Sort by combined score and return
    return Array.from(combinedMap.values())
      .sort((a, b) => (b.combined_score || 0) - (a.combined_score || 0))
      .slice(0, 20); // Limit final results
  }

  /**
   * Get similar documents based on a document ID
   */
  async findSimilarDocuments(
    documentId: string,
    chatbotId: string,
    limit: number = 5
  ): Promise<VectorSearchResult[]> {
    return withDatabaseMonitoring(
      async () => {
        // Get average embedding for the document
        const avgEmbeddingQuery = `
          SELECT AVG(embedding) as avg_embedding
          FROM document_chunks
          WHERE document_id = $1
        `;

        const avgResult = await this.client.query(avgEmbeddingQuery, [documentId]);

        if (avgResult.rows.length === 0 || !avgResult.rows[0].avg_embedding) {
          return [];
        }

        // Use the average embedding to find similar documents
        return this.vectorSearch(
          avgResult.rows[0].avg_embedding,
          chatbotId,
          {
            max_results: limit + 5, // Get extra to filter out the same document
            min_similarity: 0.3
          }
        ).then(results =>
          results
            .filter(result => result.document_id !== documentId)
            .slice(0, limit)
        );
      },
      {
        operation: 'findSimilarDocuments',
        table: 'document_chunks',
        additionalData: {
          document_id: documentId,
          chatbot_id: chatbotId,
          limit
        }
      }
    );
  }

  /**
   * Batch process documents for embedding generation
   */
  async batchProcessEmbeddings(
    documents: Array<{ id: string; content: string; metadata?: Record<string, any> }>,
    organizationId: string
  ): Promise<{ processed: number; failed: number; errors: string[] }> {
    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const doc of documents) {
      try {
        const chunks = this.chunkDocument(doc.content);

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const embedding = await this.generateEmbedding(chunk);

          await this.storeEmbedding(
            doc.id,
            i,
            chunk,
            embedding.embedding,
            { ...doc.metadata, chunk_size: chunk.length }
          );
        }

        results.processed++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Document ${doc.id}: ${(error as Error).message}`);
      }
    }

    // Log batch processing results
    SentryUtils.addBreadcrumb('Batch embedding processing completed', {
      organization_id: organizationId,
      total_documents: documents.length,
      processed: results.processed,
      failed: results.failed,
      error_count: results.errors.length
    });

    return results;
  }

  /**
   * Chunk document content for embedding
   */
  private chunkDocument(content: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();

      if (currentChunk.length + trimmedSentence.length + 1 <= chunkSize) {
        currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);

          // Create overlap for next chunk
          const words = currentChunk.split(' ');
          const overlapWords = words.slice(-Math.floor(overlap / 6)); // Rough word estimate
          currentChunk = overlapWords.join(' ') + ' ' + trimmedSentence;
        } else {
          // Sentence is too long, split it
          currentChunk = trimmedSentence.substring(0, chunkSize);
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Get search analytics (placeholder implementation)
   */
  async getSearchAnalytics(sessionId: string, chatbotId?: string, includeDetails?: boolean): Promise<any> {
    // TODO: Implement actual analytics
    return {
      total_searches: 0,
      unique_queries: 0,
      avg_response_time: 0,
      success_rate: 1.0,
      popular_queries: []
    };
  }

  /**
   * Get chatbot-specific search analytics (placeholder implementation)
   */
  async getChatbotSearchAnalytics(chatbotId: string, organizationId: string, timeRange?: string, includeDetails?: boolean): Promise<any> {
    // TODO: Implement actual chatbot analytics
    return {
      chatbot_id: chatbotId,
      total_searches: 0,
      unique_queries: 0,
      avg_response_time: 0,
      success_rate: 1.0,
      popular_queries: []
    };
  }

  /**
   * Get search suggestions (placeholder implementation)
   */
  async getSearchSuggestions(query: string, organizationId: string, options?: any): Promise<string[]> {
    // TODO: Implement actual search suggestions
    return [];
  }
}

export default VectorSearchService;