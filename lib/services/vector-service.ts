/**
 * Vector Service
 *
 * Handles document chunking, embedding generation, and vector storage
 * Integrates with AWS Bedrock for embeddings and Neon for vector storage
 */

import { Client } from 'pg';
import { getBedrockClient } from '@/lib/aws';
import { v4 as uuidv4 } from 'uuid';
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
  created_at: string;
}

export interface ChunkingOptions {
  chunk_size?: number;
  chunk_overlap?: number;
  preserve_paragraphs?: boolean;
}

export interface EmbeddingResult {
  success: boolean;
  chunks?: DocumentChunk[];
  error?: string;
  total_chunks?: number;
  total_tokens?: number;
}

export class VectorService {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Process document for vector storage (chunk + embed + store)
   */
  async processDocumentForVector(
    documentId: string,
    extractedText: string,
    options: ChunkingOptions = {}
  ): Promise<EmbeddingResult> {
    try {
      // Step 1: Chunk the document
      const chunks = this.chunkDocument(extractedText, options);

      // Step 2: Generate embeddings for each chunk
      const chunksWithEmbeddings = await this.generateEmbeddings(chunks);

      // Step 3: Store chunks and embeddings in database
      const storedChunks = await this.storeChunks(documentId, chunksWithEmbeddings);

      return {
        success: true,
        chunks: storedChunks,
        total_chunks: storedChunks.length,
        total_tokens: this.estimateTokenCount(extractedText)
      };

    } catch (error) {
      console.error('Vector processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Chunk document text into manageable pieces
   */
  private chunkDocument(
    text: string,
    options: ChunkingOptions = {}
  ): Array<{ content: string; metadata: Record<string, any> }> {
    const {
      chunk_size = 1000,
      chunk_overlap = 200,
      preserve_paragraphs = true
    } = options;

    const chunks: Array<{ content: string; metadata: Record<string, any> }> = [];

    if (preserve_paragraphs) {
      // Split by paragraphs first, then chunk if necessary
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

      let currentChunk = '';
      let chunkIndex = 0;

      for (const paragraph of paragraphs) {
        const trimmedParagraph = paragraph.trim();

        // If adding this paragraph would exceed chunk size, save current chunk
        if (currentChunk.length + trimmedParagraph.length > chunk_size && currentChunk.length > 0) {
          chunks.push({
            content: currentChunk.trim(),
            metadata: {
              chunk_index: chunkIndex,
              type: 'paragraph_grouped',
              length: currentChunk.trim().length
            }
          });

          // Start new chunk with overlap if specified
          if (chunk_overlap > 0 && currentChunk.length > chunk_overlap) {
            currentChunk = currentChunk.slice(-chunk_overlap) + '\n\n' + trimmedParagraph;
          } else {
            currentChunk = trimmedParagraph;
          }
          chunkIndex++;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
        }
      }

      // Add remaining content as final chunk
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            chunk_index: chunkIndex,
            type: 'paragraph_grouped',
            length: currentChunk.trim().length
          }
        });
      }
    } else {
      // Simple character-based chunking
      let startIndex = 0;
      let chunkIndex = 0;

      while (startIndex < text.length) {
        let endIndex = Math.min(startIndex + chunk_size, text.length);

        // Try to break at word boundary
        if (endIndex < text.length) {
          const lastSpace = text.lastIndexOf(' ', endIndex);
          if (lastSpace > startIndex + chunk_size * 0.8) {
            endIndex = lastSpace;
          }
        }

        const content = text.slice(startIndex, endIndex).trim();

        if (content) {
          chunks.push({
            content,
            metadata: {
              chunk_index: chunkIndex,
              type: 'character_based',
              start_index: startIndex,
              end_index: endIndex,
              length: content.length
            }
          });
        }

        startIndex = Math.max(endIndex - chunk_overlap, startIndex + 1);
        chunkIndex++;
      }
    }

    return chunks;
  }

  /**
   * Generate embeddings using AWS Bedrock
   */
  private async generateEmbeddings(
    chunks: Array<{ content: string; metadata: Record<string, any> }>
  ): Promise<Array<{ content: string; metadata: Record<string, any>; embedding: number[] }>> {
    const bedrock = getBedrockClient();
    const chunksWithEmbeddings = [];

    for (const chunk of chunks) {
      try {
        const input = {
          modelId: 'amazon.titan-embed-text-v2:0',
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            inputText: chunk.content,
            dimensions: 512,
            normalize: true
          })
        };

        const command = new InvokeModelCommand(input);
        const response = await bedrock.send(command);

        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const embedding = responseBody.embedding;

        if (embedding && Array.isArray(embedding)) {
          chunksWithEmbeddings.push({
            ...chunk,
            embedding
          });
        } else {
          console.warn(`Failed to get embedding for chunk ${chunk.metadata.chunk_index}`);
          // Still include chunk without embedding for storage
          chunksWithEmbeddings.push({
            ...chunk,
            embedding: []
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error generating embedding for chunk ${chunk.metadata.chunk_index}:`, error);
        // Include chunk without embedding
        chunksWithEmbeddings.push({
          ...chunk,
          embedding: []
        });
      }
    }

    return chunksWithEmbeddings;
  }

  /**
   * Store chunks and embeddings in database
   */
  private async storeChunks(
    documentId: string,
    chunks: Array<{ content: string; metadata: Record<string, any>; embedding: number[] }>
  ): Promise<DocumentChunk[]> {
    const storedChunks: DocumentChunk[] = [];

    // Delete existing chunks for this document
    await this.client.query(
      'DELETE FROM document_chunks WHERE document_id = $1',
      [documentId]
    );

    for (const chunk of chunks) {
      const chunkId = uuidv4();

      try {
        const query = `
          INSERT INTO document_chunks (
            id, document_id, chunk_index, content, metadata, embedding, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
          RETURNING *
        `;

        const values = [
          chunkId,
          documentId,
          chunk.metadata.chunk_index,
          chunk.content,
          JSON.stringify(chunk.metadata),
          chunk.embedding.length > 0 ? JSON.stringify(chunk.embedding) : null
        ];

        const result = await this.client.query(query, values);

        if (result.rows[0]) {
          storedChunks.push({
            id: result.rows[0].id,
            document_id: result.rows[0].document_id,
            chunk_index: result.rows[0].chunk_index,
            content: result.rows[0].content,
            metadata: result.rows[0].metadata,
            embedding: chunk.embedding,
            created_at: result.rows[0].created_at
          });
        }

      } catch (error) {
        console.error(`Error storing chunk ${chunk.metadata.chunk_index}:`, error);
      }
    }

    return storedChunks;
  }

  /**
   * Search similar chunks using vector similarity
   */
  async searchSimilarChunks(
    queryText: string,
    limit: number = 10,
    threshold: number = 0.7,
    organizationId?: string
  ): Promise<Array<DocumentChunk & {
    similarity: number;
    document_title?: string;
    filename?: string;
  }>> {
    try {
      // Generate embedding for query
      const bedrock = getBedrockClient();
      const input = {
        modelId: 'amazon.titan-embed-text-v2:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          inputText: queryText,
          dimensions: 512,
          normalize: true
        })
      };

      const command = new InvokeModelCommand(input);
      const response = await bedrock.send(command);

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const queryEmbedding = responseBody.embedding;

      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }

      // Search for similar chunks using cosine similarity
      let query = `
        SELECT
          dc.*,
          d.filename,
          d.title as document_title,
          1 - (dc.embedding <=> $1::vector) as similarity
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE dc.embedding IS NOT NULL
          AND 1 - (dc.embedding <=> $1::vector) >= $2
      `;

      const queryParams = [JSON.stringify(queryEmbedding), threshold];

      if (organizationId) {
        query += ` AND d.organization_id = $3`;
        queryParams.push(organizationId);
      }

      query += `
        ORDER BY similarity DESC
        LIMIT $${queryParams.length + 1}
      `;
      queryParams.push(limit);

      const result = await this.client.query(query, queryParams);

      return result.rows.map(row => ({
        id: row.id,
        document_id: row.document_id,
        chunk_index: row.chunk_index,
        content: row.content,
        metadata: row.metadata,
        created_at: row.created_at,
        similarity: row.similarity,
        document_title: row.document_title,
        filename: row.filename
      }));

    } catch (error) {
      console.error('Vector search error:', error);
      return [];
    }
  }

  /**
   * Estimate token count for text
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Get document chunks by document ID
   */
  async getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    const query = `
      SELECT * FROM document_chunks
      WHERE document_id = $1
      ORDER BY chunk_index
    `;

    const result = await this.client.query(query, [documentId]);

    return result.rows.map(row => ({
      id: row.id,
      document_id: row.document_id,
      chunk_index: row.chunk_index,
      content: row.content,
      metadata: row.metadata,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      created_at: row.created_at
    }));
  }
}

export default VectorService;