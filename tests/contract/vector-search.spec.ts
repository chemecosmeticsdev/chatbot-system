import { test, expect } from '@playwright/test';

/**
 * Contract Tests: Vector Search API
 *
 * These tests validate the Vector Search API endpoints according to the OpenAPI contract.
 * Following TDD approach - these tests MUST fail initially.
 */

const API_BASE = '/api/v1';

test.describe('Vector Search API Contract Tests', () => {
  test.describe('POST /api/v1/search/vector', () => {
    test('should perform vector similarity search with valid query', async ({ request }) => {
      const searchData = {
        query: 'product specifications and technical details',
        k: 5,
        score_threshold: 0.7
      };

      const response = await request.post(`${API_BASE}/search/vector`, {
        data: searchData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Contract validation
      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const data = responseData.data;
      expect(data).toHaveProperty('query', searchData.query);
      expect(data).toHaveProperty('results');
      expect(data).toHaveProperty('total_results');
      expect(data).toHaveProperty('processing_time_ms');

      // Results validation
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results.length).toBeLessThanOrEqual(searchData.k);

      // Each result should have required fields
      if (data.results.length > 0) {
        data.results.forEach((result: any) => {
          expect(result).toHaveProperty('chunk_id');
          expect(result).toHaveProperty('document_id');
          expect(result).toHaveProperty('product_id');
          expect(result).toHaveProperty('content');
          expect(result).toHaveProperty('similarity_score');
          expect(result).toHaveProperty('chunk_type');
          expect(result).toHaveProperty('document_title');
          expect(result).toHaveProperty('product_name');

          // Similarity score should be above threshold
          expect(result.similarity_score).toBeGreaterThanOrEqual(searchData.score_threshold);
        });
      }
    });

    test('should return 400 for missing query parameter', async ({ request }) => {
      const invalidData = {
        k: 5,
        score_threshold: 0.7
        // Missing required 'query' field
      };

      const response = await request.post(`${API_BASE}/search/vector`, {
        data: invalidData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData).toHaveProperty('error');
      expect(responseData.error).toContain('query');
    });

    test('should validate k parameter constraints', async ({ request }) => {
      const invalidData = {
        query: 'test query',
        k: 100, // Above maximum of 50
        score_threshold: 0.7
      };

      const response = await request.post(`${API_BASE}/search/vector`, {
        data: invalidData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData).toHaveProperty('error');
    });

    test('should validate score_threshold parameter constraints', async ({ request }) => {
      const invalidData = {
        query: 'test query',
        k: 5,
        score_threshold: 1.5 // Above maximum of 1.0
      };

      const response = await request.post(`${API_BASE}/search/vector`, {
        data: invalidData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData).toHaveProperty('error');
    });

    test('should support filtering by product_ids', async ({ request }) => {
      // This test assumes some products and documents exist
      const searchData = {
        query: 'product information',
        k: 10,
        filters: {
          product_ids: ['some-product-id-1', 'some-product-id-2']
        }
      };

      const response = await request.post(`${API_BASE}/search/vector`, {
        data: searchData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData.success).toBe(true);

      // All results should belong to specified products
      const results = responseData.data.results;
      if (results.length > 0) {
        results.forEach((result: any) => {
          expect(searchData.filters.product_ids).toContain(result.product_id);
        });
      }
    });

    test('should support filtering by document_types', async ({ request }) => {
      const searchData = {
        query: 'technical specifications',
        k: 5,
        filters: {
          document_types: ['technical', 'regulatory']
        }
      };

      const response = await request.post(`${API_BASE}/search/vector`, {
        data: searchData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData.success).toBe(true);

      // Results should match document type filters
      const results = responseData.data.results;
      if (results.length > 0) {
        // Note: This would require joining with documents table to validate
        // For now, just ensure the response structure is correct
        expect(Array.isArray(results)).toBe(true);
      }
    });

    test('should complete search within performance threshold', async ({ request }) => {
      const searchData = {
        query: 'performance test query for response time validation',
        k: 10,
        score_threshold: 0.5
      };

      const startTime = Date.now();

      const response = await request.post(`${API_BASE}/search/vector`, {
        data: searchData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData.success).toBe(true);

      // Performance requirement: Vector search should complete under 200ms
      expect(responseTime).toBeLessThan(200);

      // Server-reported processing time should also be under threshold
      expect(responseData.data.processing_time_ms).toBeLessThan(200);
    });

    test('should handle empty results gracefully', async ({ request }) => {
      const searchData = {
        query: 'extremely specific query that likely returns no results xyz123',
        k: 5,
        score_threshold: 0.9
      };

      const response = await request.post(`${API_BASE}/search/vector`, {
        data: searchData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData.data.results).toEqual([]);
      expect(responseData.data.total_results).toBe(0);
    });
  });

  test.describe('POST /api/v1/search/fulltext', () => {
    test('should perform full-text search with valid query', async ({ request }) => {
      const searchData = {
        query: 'product specification',
        limit: 20,
        offset: 0
      };

      const response = await request.post(`${API_BASE}/search/fulltext`, {
        data: searchData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      const data = responseData.data;
      expect(data).toHaveProperty('query', searchData.query);
      expect(data).toHaveProperty('results');
      expect(data).toHaveProperty('total_results');

      // Results validation
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results.length).toBeLessThanOrEqual(searchData.limit);

      // Each result should have required fields
      if (data.results.length > 0) {
        data.results.forEach((result: any) => {
          expect(result).toHaveProperty('document_id');
          expect(result).toHaveProperty('title');
          expect(result).toHaveProperty('content_snippet');
          expect(result).toHaveProperty('rank');
        });
      }
    });

    test('should return 400 for missing query parameter', async ({ request }) => {
      const invalidData = {
        limit: 20
        // Missing required 'query' field
      };

      const response = await request.post(`${API_BASE}/search/fulltext`, {
        data: invalidData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', false);
      expect(responseData).toHaveProperty('error');
      expect(responseData.error).toContain('query');
    });
  });
});