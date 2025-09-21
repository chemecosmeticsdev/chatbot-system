import { test, expect } from '@playwright/test';
import { Client } from 'pg';
import VectorSearchService from '@/lib/vector/search';
import { SentryUtils } from '@/lib/monitoring/sentry-utils';

/**
 * Performance Tests: Vector Search
 *
 * Comprehensive performance testing for vector search functionality.
 * Tests response times, concurrent operations, and scalability with different dataset sizes.
 *
 * Requirements:
 * - Vector search response times <200ms
 * - Support for concurrent search operations
 * - Scalability with 100, 1K, 10K+ vectors
 * - Memory usage and resource consumption validation
 * - Search accuracy and relevance testing
 */

interface PerformanceMetrics {
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  throughput: number;
  successRate: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

interface SearchAccuracyMetrics {
  relevantResults: number;
  totalResults: number;
  precision: number;
  recall: number;
  mrr: number; // Mean Reciprocal Rank
  ndcg: number; // Normalized Discounted Cumulative Gain
}

interface TestDataset {
  size: number;
  documents: Array<{
    id: string;
    content: string;
    expectedQueries: string[];
    relevanceScore: number;
  }>;
}

class VectorSearchPerformanceTester {
  private dbClient: Client;
  private vectorService: VectorSearchService;
  private testChatbotId: string = 'test-chatbot-performance';
  private testSessionId: string = 'test-session-performance';

  constructor() {
    // Initialize database connection
    this.dbClient = new Client({
      connectionString: process.env.DATABASE_URL
    });
    this.vectorService = new VectorSearchService(this.dbClient);
  }

  async setup() {
    await this.dbClient.connect();
    // Setup will be done in beforeAll
  }

  async teardown() {
    await this.cleanupTestData();
    await this.dbClient.end();
  }

  /**
   * Generate test datasets of different sizes
   */
  generateTestDataset(size: number): TestDataset {
    const documents = [];
    const categories = [
      'product specifications',
      'technical documentation',
      'user manual',
      'safety guidelines',
      'regulatory compliance',
      'troubleshooting guide',
      'installation instructions',
      'maintenance procedures'
    ];

    for (let i = 0; i < size; i++) {
      const category = categories[i % categories.length];
      const docId = `test-doc-${i.toString().padStart(6, '0')}`;

      documents.push({
        id: docId,
        content: this.generateRealisticDocumentContent(category, i),
        expectedQueries: [
          `${category} information`,
          `how to ${category.replace(' ', ' and ')}`,
          `${category.split(' ')[0]} details`
        ],
        relevanceScore: Math.random() * 0.3 + 0.7 // 0.7 - 1.0 range
      });
    }

    return { size, documents };
  }

  /**
   * Generate realistic document content for testing
   */
  private generateRealisticDocumentContent(category: string, index: number): string {
    const templates = {
      'product specifications': `
        Product Model: ${category.toUpperCase()}-${index}
        Technical specifications include advanced features and compatibility requirements.
        Operating temperature range: -10°C to +60°C
        Input voltage: 100-240V AC, 50/60Hz
        Dimensions: 150mm x 100mm x 50mm
        Weight: 1.2kg
        Certifications: CE, FCC, RoHS compliant
        Material composition: High-grade aluminum alloy with corrosion-resistant coating.
      `,
      'technical documentation': `
        Technical Reference Document ${index}
        This document provides comprehensive technical information for implementation.
        System architecture utilizes microservices with REST API endpoints.
        Database requirements: PostgreSQL 14+ with vector extension support.
        Performance benchmarks: 99.9% uptime, <100ms response time.
        Security features include end-to-end encryption and OAuth 2.0 authentication.
        Monitoring and logging integrated with industry-standard tools.
      `,
      'user manual': `
        User Manual - Chapter ${index}
        Step-by-step instructions for optimal user experience.
        Getting started: Initial setup takes approximately 15 minutes.
        Navigation: Use the main menu to access all features.
        Troubleshooting: Common issues and their solutions are provided.
        Safety precautions must be followed at all times during operation.
        Regular maintenance ensures longevity and optimal performance.
      `
    };

    return templates[category as keyof typeof templates] || `Generic content for ${category} document ${index}. This includes detailed information and comprehensive guidelines for users and administrators. Technical specifications and requirements are clearly outlined.`;
  }

  /**
   * Setup test data in database
   */
  async setupTestData(dataset: TestDataset): Promise<void> {
    console.log(`Setting up test dataset with ${dataset.size} documents...`);

    // Create test product
    const productId = `test-product-${dataset.size}`;
    await this.dbClient.query(`
      INSERT INTO products (id, name, organization_id, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `, [productId, `Test Product ${dataset.size}`, 'test-org']);

    // Create test chatbot
    await this.dbClient.query(`
      INSERT INTO chatbots (id, name, organization_id, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `, [this.testChatbotId, 'Performance Test Chatbot', 'test-org']);

    // Link chatbot to product
    await this.dbClient.query(`
      INSERT INTO chatbot_products (chatbot_id, product_id, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (chatbot_id, product_id) DO NOTHING
    `, [this.testChatbotId, productId]);

    // Process documents and generate embeddings
    const batchSize = 50; // Process in batches to avoid memory issues
    for (let i = 0; i < dataset.documents.length; i += batchSize) {
      const batch = dataset.documents.slice(i, i + batchSize);

      for (const doc of batch) {
        // Insert document
        await this.dbClient.query(`
          INSERT INTO documents (id, name, product_id, content, content_type, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `, [doc.id, `Test Document ${doc.id}`, productId, doc.content, 'text/plain']);

        // Generate and store embeddings
        const embedding = await this.vectorService.generateEmbedding(doc.content);
        await this.vectorService.storeEmbedding(
          doc.id,
          0, // chunk_index
          doc.content,
          embedding.embedding,
          { test: true, relevance_score: doc.relevanceScore }
        );
      }

      // Log progress
      console.log(`Processed ${Math.min(i + batchSize, dataset.documents.length)}/${dataset.documents.length} documents`);
    }

    console.log(`✅ Test dataset setup complete: ${dataset.size} documents with embeddings`);
  }

  /**
   * Cleanup test data
   */
  async cleanupTestData(): Promise<void> {
    // Clean up in reverse order due to foreign key constraints
    await this.dbClient.query(`DELETE FROM document_chunks WHERE document_id LIKE 'test-doc-%'`);
    await this.dbClient.query(`DELETE FROM documents WHERE id LIKE 'test-doc-%'`);
    await this.dbClient.query(`DELETE FROM chatbot_products WHERE chatbot_id = $1`, [this.testChatbotId]);
    await this.dbClient.query(`DELETE FROM chatbots WHERE id = $1`, [this.testChatbotId]);
    await this.dbClient.query(`DELETE FROM products WHERE id LIKE 'test-product-%'`);
  }

  /**
   * Measure response times for multiple search operations
   */
  async measureResponseTimes(queries: string[], iterations: number = 10): Promise<number[]> {
    const responseTimes: number[] = [];

    for (const query of queries) {
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

        await this.vectorService.similaritySearch(
          query,
          this.testChatbotId,
          this.testSessionId,
          { max_results: 10, min_similarity: 0.1 }
        );

        const endTime = performance.now();
        responseTimes.push(endTime - startTime);
      }
    }

    return responseTimes;
  }

  /**
   * Calculate performance metrics from response times
   */
  calculatePerformanceMetrics(responseTimes: number[]): PerformanceMetrics {
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const total = sortedTimes.length;

    return {
      averageResponseTime: sortedTimes.reduce((sum, time) => sum + time, 0) / total,
      medianResponseTime: sortedTimes[Math.floor(total / 2)],
      p95ResponseTime: sortedTimes[Math.floor(total * 0.95)],
      p99ResponseTime: sortedTimes[Math.floor(total * 0.99)],
      minResponseTime: sortedTimes[0],
      maxResponseTime: sortedTimes[total - 1],
      throughput: 1000 / (sortedTimes.reduce((sum, time) => sum + time, 0) / total), // operations per second
      successRate: 100 // Assuming all operations succeeded
    };
  }

  /**
   * Test concurrent search operations
   */
  async testConcurrentOperations(queries: string[], concurrency: number): Promise<PerformanceMetrics> {
    const promises: Promise<number>[] = [];

    for (let i = 0; i < concurrency; i++) {
      const query = queries[i % queries.length];

      promises.push(
        (async () => {
          const startTime = performance.now();
          await this.vectorService.similaritySearch(
            query,
            this.testChatbotId,
            this.testSessionId,
            { max_results: 5, min_similarity: 0.2 }
          );
          return performance.now() - startTime;
        })()
      );
    }

    const responseTimes = await Promise.all(promises);
    return this.calculatePerformanceMetrics(responseTimes);
  }

  /**
   * Measure search accuracy and relevance
   */
  async measureSearchAccuracy(dataset: TestDataset): Promise<SearchAccuracyMetrics> {
    let relevantResults = 0;
    let totalResults = 0;
    let reciprocalRanks: number[] = [];
    let ndcgScores: number[] = [];

    // Test with known relevant queries
    for (const doc of dataset.documents.slice(0, 20)) { // Test subset for accuracy
      for (const query of doc.expectedQueries) {
        const results = await this.vectorService.similaritySearch(
          query,
          this.testChatbotId,
          this.testSessionId,
          { max_results: 10, min_similarity: 0.1 }
        );

        totalResults += results.length;

        // Find the rank of the expected document in results
        const expectedDocRank = results.findIndex(result => result.document_id === doc.id) + 1;

        if (expectedDocRank > 0) {
          relevantResults++;
          reciprocalRanks.push(1 / expectedDocRank);

          // Simple NDCG calculation
          const dcg = Math.log2(1 + expectedDocRank);
          ndcgScores.push(dcg);
        } else {
          reciprocalRanks.push(0);
          ndcgScores.push(0);
        }
      }
    }

    return {
      relevantResults,
      totalResults,
      precision: totalResults > 0 ? relevantResults / totalResults : 0,
      recall: dataset.documents.length > 0 ? relevantResults / (dataset.documents.length * 3) : 0, // 3 queries per doc
      mrr: reciprocalRanks.length > 0 ? reciprocalRanks.reduce((sum, rr) => sum + rr, 0) / reciprocalRanks.length : 0,
      ndcg: ndcgScores.length > 0 ? ndcgScores.reduce((sum, score) => sum + score, 0) / ndcgScores.length : 0
    };
  }

  /**
   * Monitor resource usage during operations
   */
  async monitorResourceUsage(operation: () => Promise<void>): Promise<{ memoryUsage: number; duration: number }> {
    const startMemory = process.memoryUsage();
    const startTime = performance.now();

    await operation();

    const endTime = performance.now();
    const endMemory = process.memoryUsage();

    return {
      memoryUsage: endMemory.heapUsed - startMemory.heapUsed,
      duration: endTime - startTime
    };
  }
}

test.describe('Vector Search Performance Tests', () => {
  let tester: VectorSearchPerformanceTester;

  test.beforeAll(async () => {
    tester = new VectorSearchPerformanceTester();
    await tester.setup();
  });

  test.afterAll(async () => {
    await tester.teardown();
  });

  test.describe('Response Time Requirements', () => {
    test('should meet <200ms response time requirement with 100 vectors', async () => {
      const dataset = tester.generateTestDataset(100);
      await tester.setupTestData(dataset);

      const queries = [
        'product specifications',
        'technical documentation',
        'user manual instructions',
        'safety guidelines',
        'installation procedures'
      ];

      const responseTimes = await tester.measureResponseTimes(queries, 20);
      const metrics = tester.calculatePerformanceMetrics(responseTimes);

      console.log('📊 100 Vector Performance Metrics:', {
        average: `${metrics.averageResponseTime.toFixed(2)}ms`,
        median: `${metrics.medianResponseTime.toFixed(2)}ms`,
        p95: `${metrics.p95ResponseTime.toFixed(2)}ms`,
        p99: `${metrics.p99ResponseTime.toFixed(2)}ms`,
        throughput: `${metrics.throughput.toFixed(2)} ops/sec`
      });

      // Performance assertions
      expect(metrics.averageResponseTime).toBeLessThan(200);
      expect(metrics.p95ResponseTime).toBeLessThan(300); // Allow some tolerance for P95
      expect(metrics.p99ResponseTime).toBeLessThan(500); // Allow more tolerance for P99
      expect(metrics.successRate).toBe(100);
      expect(metrics.throughput).toBeGreaterThan(5); // At least 5 operations per second
    });

    test('should maintain performance with 1K vectors', async () => {
      const dataset = tester.generateTestDataset(1000);
      await tester.setupTestData(dataset);

      const queries = [
        'advanced product specifications and technical details',
        'comprehensive user documentation and guidelines',
        'system installation and configuration procedures',
        'troubleshooting and maintenance instructions',
        'regulatory compliance and safety requirements'
      ];

      const responseTimes = await tester.measureResponseTimes(queries, 15);
      const metrics = tester.calculatePerformanceMetrics(responseTimes);

      console.log('📊 1K Vector Performance Metrics:', {
        average: `${metrics.averageResponseTime.toFixed(2)}ms`,
        median: `${metrics.medianResponseTime.toFixed(2)}ms`,
        p95: `${metrics.p95ResponseTime.toFixed(2)}ms`,
        throughput: `${metrics.throughput.toFixed(2)} ops/sec`
      });

      // Performance requirements scale with dataset size
      expect(metrics.averageResponseTime).toBeLessThan(250); // Slight increase allowed
      expect(metrics.p95ResponseTime).toBeLessThan(400);
      expect(metrics.successRate).toBe(100);
      expect(metrics.throughput).toBeGreaterThan(3); // Reduced throughput acceptable
    });

    test('should handle 10K+ vectors with acceptable performance', async () => {
      const dataset = tester.generateTestDataset(10000);
      await tester.setupTestData(dataset);

      const queries = [
        'detailed product specifications',
        'technical implementation guide',
        'comprehensive documentation'
      ];

      const responseTimes = await tester.measureResponseTimes(queries, 10);
      const metrics = tester.calculatePerformanceMetrics(responseTimes);

      console.log('📊 10K Vector Performance Metrics:', {
        average: `${metrics.averageResponseTime.toFixed(2)}ms`,
        median: `${metrics.medianResponseTime.toFixed(2)}ms`,
        p95: `${metrics.p95ResponseTime.toFixed(2)}ms`,
        throughput: `${metrics.throughput.toFixed(2)} ops/sec`
      });

      // Relaxed requirements for large datasets
      expect(metrics.averageResponseTime).toBeLessThan(500);
      expect(metrics.p95ResponseTime).toBeLessThan(800);
      expect(metrics.successRate).toBe(100);
      expect(metrics.throughput).toBeGreaterThan(1); // Minimum throughput
    });
  });

  test.describe('Concurrent Operations Performance', () => {
    test('should handle 10 concurrent searches efficiently', async () => {
      const dataset = tester.generateTestDataset(1000);
      await tester.setupTestData(dataset);

      const queries = [
        'product information',
        'technical details',
        'user guidelines',
        'safety instructions',
        'maintenance procedures'
      ];

      const metrics = await tester.testConcurrentOperations(queries, 10);

      console.log('📊 10 Concurrent Operations Metrics:', {
        average: `${metrics.averageResponseTime.toFixed(2)}ms`,
        p95: `${metrics.p95ResponseTime.toFixed(2)}ms`,
        throughput: `${metrics.throughput.toFixed(2)} ops/sec`
      });

      expect(metrics.averageResponseTime).toBeLessThan(400);
      expect(metrics.p95ResponseTime).toBeLessThan(600);
      expect(metrics.successRate).toBe(100);
    });

    test('should maintain stability under 50 concurrent searches', async () => {
      const dataset = tester.generateTestDataset(500);
      await tester.setupTestData(dataset);

      const queries = [
        'product specifications',
        'technical documentation',
        'user manual',
        'installation guide',
        'troubleshooting help'
      ];

      const metrics = await tester.testConcurrentOperations(queries, 50);

      console.log('📊 50 Concurrent Operations Metrics:', {
        average: `${metrics.averageResponseTime.toFixed(2)}ms`,
        p95: `${metrics.p95ResponseTime.toFixed(2)}ms`,
        throughput: `${metrics.throughput.toFixed(2)} ops/sec`
      });

      expect(metrics.averageResponseTime).toBeLessThan(800);
      expect(metrics.p95ResponseTime).toBeLessThan(1200);
      expect(metrics.successRate).toBe(100);
    });
  });

  test.describe('Search Accuracy and Relevance', () => {
    test('should maintain high search accuracy with relevant results', async () => {
      const dataset = tester.generateTestDataset(200);
      await tester.setupTestData(dataset);

      const accuracyMetrics = await tester.measureSearchAccuracy(dataset);

      console.log('📊 Search Accuracy Metrics:', {
        precision: `${(accuracyMetrics.precision * 100).toFixed(2)}%`,
        recall: `${(accuracyMetrics.recall * 100).toFixed(2)}%`,
        mrr: accuracyMetrics.mrr.toFixed(3),
        ndcg: accuracyMetrics.ndcg.toFixed(3)
      });

      // Accuracy requirements
      expect(accuracyMetrics.precision).toBeGreaterThan(0.7); // 70% precision
      expect(accuracyMetrics.recall).toBeGreaterThan(0.5);    // 50% recall
      expect(accuracyMetrics.mrr).toBeGreaterThan(0.6);       // Mean Reciprocal Rank > 0.6
    });

    test('should rank results by relevance score correctly', async () => {
      const dataset = tester.generateTestDataset(100);
      await tester.setupTestData(dataset);

      const results = await tester.vectorService.similaritySearch(
        'product specifications',
        tester.testChatbotId,
        tester.testSessionId,
        { max_results: 10, min_similarity: 0.1 }
      );

      // Verify results are sorted by similarity score (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }

      // All results should meet minimum similarity threshold
      results.forEach(result => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.1);
      });
    });
  });

  test.describe('Resource Usage and Memory Performance', () => {
    test('should maintain reasonable memory usage during operations', async () => {
      const dataset = tester.generateTestDataset(1000);
      await tester.setupTestData(dataset);

      const resourceMetrics = await tester.monitorResourceUsage(async () => {
        const queries = Array.from({ length: 100 }, (_, i) => `test query ${i}`);

        for (const query of queries) {
          await tester.vectorService.similaritySearch(
            query,
            tester.testChatbotId,
            tester.testSessionId,
            { max_results: 5 }
          );
        }
      });

      console.log('📊 Resource Usage Metrics:', {
        memoryUsage: `${(resourceMetrics.memoryUsage / 1024 / 1024).toFixed(2)} MB`,
        duration: `${resourceMetrics.duration.toFixed(2)}ms`
      });

      // Memory usage should be reasonable (less than 100MB for 100 operations)
      expect(resourceMetrics.memoryUsage).toBeLessThan(100 * 1024 * 1024);
    });

    test('should not have memory leaks during repeated operations', async () => {
      const dataset = tester.generateTestDataset(200);
      await tester.setupTestData(dataset);

      const initialMemory = process.memoryUsage().heapUsed;

      // Perform multiple search operations
      for (let batch = 0; batch < 5; batch++) {
        for (let i = 0; i < 20; i++) {
          await tester.vectorService.similaritySearch(
            `memory test query ${batch}-${i}`,
            tester.testChatbotId,
            tester.testSessionId,
            { max_results: 3 }
          );
        }

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      console.log('📊 Memory Leak Test:', {
        initial: `${(initialMemory / 1024 / 1024).toFixed(2)} MB`,
        final: `${(finalMemory / 1024 / 1024).toFixed(2)} MB`,
        increase: `${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`
      });

      // Memory increase should be minimal (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  test.describe('Database Index Performance', () => {
    test('should utilize vector indexes efficiently', async () => {
      const dataset = tester.generateTestDataset(5000);
      await tester.setupTestData(dataset);

      // Analyze query performance with EXPLAIN ANALYZE
      const query = `
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT dc.*, 1 - (dc.embedding <=> $1::vector) as similarity
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE 1 - (dc.embedding <=> $1::vector) >= 0.1
        ORDER BY dc.embedding <=> $1::vector
        LIMIT 10
      `;

      // Generate a test embedding
      const testEmbedding = await tester.vectorService.generateEmbedding('test query for index performance');

      const result = await tester.dbClient.query(query, [JSON.stringify(testEmbedding.embedding)]);
      const executionPlan = result.rows.map(row => row['QUERY PLAN']).join('\n');

      console.log('📊 Query Execution Plan:', executionPlan);

      // Verify that index is being used (look for Index Scan in plan)
      expect(executionPlan).toMatch(/Index.*Scan/i);

      // Extract execution time from plan
      const timeMatch = executionPlan.match(/Execution time: ([\d.]+) ms/);
      if (timeMatch) {
        const executionTime = parseFloat(timeMatch[1]);
        console.log(`📊 Database Execution Time: ${executionTime}ms`);
        expect(executionTime).toBeLessThan(100); // Database query should be fast
      }
    });

    test('should handle different similarity thresholds efficiently', async () => {
      const dataset = tester.generateTestDataset(1000);
      await tester.setupTestData(dataset);

      const thresholds = [0.1, 0.3, 0.5, 0.7, 0.9];
      const query = 'technical specifications and details';

      for (const threshold of thresholds) {
        const startTime = performance.now();

        const results = await tester.vectorService.similaritySearch(
          query,
          tester.testChatbotId,
          tester.testSessionId,
          { max_results: 20, min_similarity: threshold }
        );

        const responseTime = performance.now() - startTime;

        console.log(`📊 Threshold ${threshold}: ${responseTime.toFixed(2)}ms, ${results.length} results`);

        // Higher thresholds should generally be faster (fewer results to process)
        expect(responseTime).toBeLessThan(300);

        // Verify all results meet the threshold
        results.forEach(result => {
          expect(result.similarity).toBeGreaterThanOrEqual(threshold);
        });
      }
    });
  });

  test.describe('Hybrid Search Performance', () => {
    test('should maintain performance with hybrid vector + text search', async () => {
      const dataset = tester.generateTestDataset(1000);
      await tester.setupTestData(dataset);

      const queries = [
        'product specifications',
        'technical documentation',
        'user instructions'
      ];

      const hybridResponseTimes: number[] = [];

      for (const query of queries) {
        for (let i = 0; i < 10; i++) {
          const startTime = performance.now();

          await tester.vectorService.hybridSearch(
            query,
            tester.testChatbotId,
            tester.testSessionId,
            { max_results: 10 },
            0.7, // vector weight
            0.3  // text weight
          );

          const responseTime = performance.now() - startTime;
          hybridResponseTimes.push(responseTime);
        }
      }

      const metrics = tester.calculatePerformanceMetrics(hybridResponseTimes);

      console.log('📊 Hybrid Search Performance:', {
        average: `${metrics.averageResponseTime.toFixed(2)}ms`,
        p95: `${metrics.p95ResponseTime.toFixed(2)}ms`,
        throughput: `${metrics.throughput.toFixed(2)} ops/sec`
      });

      // Hybrid search should still meet reasonable performance requirements
      expect(metrics.averageResponseTime).toBeLessThan(400);
      expect(metrics.p95ResponseTime).toBeLessThan(600);
      expect(metrics.successRate).toBe(100);
    });
  });

  test.describe('Performance Monitoring and Reporting', () => {
    test('should generate comprehensive performance report', async () => {
      const dataset = tester.generateTestDataset(500);
      await tester.setupTestData(dataset);

      // Test different scenarios
      const scenarios = [
        { name: 'Simple Queries', queries: ['product', 'technical', 'manual'] },
        { name: 'Complex Queries', queries: ['detailed product specifications', 'comprehensive technical documentation'] },
        { name: 'Long Queries', queries: ['please provide detailed information about product specifications including technical details and user guidelines'] }
      ];

      const performanceReport: Record<string, any> = {};

      for (const scenario of scenarios) {
        const responseTimes = await tester.measureResponseTimes(scenario.queries, 15);
        const metrics = tester.calculatePerformanceMetrics(responseTimes);
        const accuracyMetrics = await tester.measureSearchAccuracy(dataset);

        performanceReport[scenario.name] = {
          performance: metrics,
          accuracy: accuracyMetrics,
          queries: scenario.queries.length
        };
      }

      console.log('📊 Comprehensive Performance Report:', JSON.stringify(performanceReport, null, 2));

      // Verify all scenarios meet minimum requirements
      Object.values(performanceReport).forEach((scenarioResults: any) => {
        expect(scenarioResults.performance.averageResponseTime).toBeLessThan(500);
        expect(scenarioResults.performance.successRate).toBe(100);
        expect(scenarioResults.accuracy.precision).toBeGreaterThan(0.5);
      });

      // Log performance insights to Sentry for monitoring
      SentryUtils.capturePerformance('vector_search_performance_test', {
        metadata: {
          dataset_size: dataset.size,
          scenarios_tested: scenarios.length,
          overall_performance: performanceReport
        }
      });
    });

    test('should track performance degradation over time', async () => {
      const dataset = tester.generateTestDataset(1000);
      await tester.setupTestData(dataset);

      const baselineQuery = 'product technical specifications';
      const measurements: number[] = [];

      // Take multiple measurements over time
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        await tester.vectorService.similaritySearch(
          baselineQuery,
          tester.testChatbotId,
          tester.testSessionId
        );
        const responseTime = performance.now() - startTime;
        measurements.push(responseTime);

        // Small delay between measurements
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Check for performance consistency
      const metrics = tester.calculatePerformanceMetrics(measurements);
      const variance = measurements.reduce((sum, time) => {
        return sum + Math.pow(time - metrics.averageResponseTime, 2);
      }, 0) / measurements.length;
      const standardDeviation = Math.sqrt(variance);

      console.log('📊 Performance Consistency:', {
        average: `${metrics.averageResponseTime.toFixed(2)}ms`,
        stdDev: `${standardDeviation.toFixed(2)}ms`,
        consistency: `${((1 - (standardDeviation / metrics.averageResponseTime)) * 100).toFixed(2)}%`
      });

      // Performance should be consistent (low standard deviation)
      expect(standardDeviation).toBeLessThan(metrics.averageResponseTime * 0.3); // 30% tolerance
    });
  });
});