/**
 * Performance Validation Service Tests
 *
 * Comprehensive test suite for performance validation functionality
 * including unit tests, integration tests, and mock scenarios.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PerformanceValidationService } from './performance-validation';
import { VectorSearchService } from '@/lib/vector/search';
import { VectorOptimizationService } from '@/lib/vector/optimization';
import { Pool, Client } from 'pg';

// Mock dependencies
jest.mock('@/lib/vector/search');
jest.mock('@/lib/vector/optimization');
jest.mock('@/lib/neon');
jest.mock('@/lib/monitoring/sentry-utils');

const MockVectorSearchService = VectorSearchService as jest.MockedClass<typeof VectorSearchService>;
const MockVectorOptimizationService = VectorOptimizationService as jest.MockedClass<typeof VectorOptimizationService>;

describe('PerformanceValidationService', () => {
  let performanceService: PerformanceValidationService;
  let mockPool: jest.Mocked<Pool>;
  let mockVectorService: jest.Mocked<VectorSearchService>;
  let mockOptimizationService: any;

  beforeEach(() => {
    // Setup mock pool
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
      options: {}
    } as any;

    // Setup mock services
    mockVectorService = {
      similaritySearch: jest.fn(),
      generateEmbedding: jest.fn(),
      hybridSearch: jest.fn()
    } as any;

    mockOptimizationService = {
      analyzeIndexPerformance: jest.fn(() => Promise.resolve([])),
      optimizeVectorIndexes: jest.fn(() => Promise.resolve([])),
      runMaintenanceRoutines: jest.fn(() => Promise.resolve({ success: true })),
      getHealthCheck: jest.fn(() => Promise.resolve({ status: 'healthy' })),
      startPerformanceMonitoring: jest.fn(() => {}),
      stopPerformanceMonitoring: jest.fn(() => {}),
      getPerformanceHistory: jest.fn(() => []),
      optimizeQuery: jest.fn(() => Promise.resolve('')),
      batchOptimization: jest.fn(() => Promise.resolve([]))
    };

    // Create service instance
    performanceService = new PerformanceValidationService(mockPool);

    // Inject mocked services
    (performanceService as any).vectorService = mockVectorService;
    (performanceService as any).optimizationService = mockOptimizationService;
  });

  afterEach(() => {
    jest.clearAllMocks();
    performanceService.stopPerformanceMonitoring();
  });

  describe('validateSearchPerformance', () => {
    it('should validate performance within 200ms requirement', async () => {
      // Mock fast search responses
      mockVectorService.similaritySearch.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 150)); // 150ms response
        return [
          {
            id: '1',
            document_id: 'doc1',
            chunk_index: 0,
            content: 'test content',
            similarity: 0.9,
            similarity_score: 0.9,
            metadata: {}
          }
        ];
      });

      const result = await performanceService.validateSearchPerformance(
        ['test query 1', 'test query 2'],
        'test-chatbot',
        'test-session'
      );

      expect(result.overall_compliance).toBe(true);
      expect(result.avg_response_time_ms).toBeLessThan(200);
      expect(result.results).toHaveLength(2);
      expect(result.recommendations).toHaveLength(0);
    });

    it('should detect performance violations', async () => {
      // Mock slow search responses
      mockVectorService.similaritySearch.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 300)); // 300ms response
        return [{
          id: '1',
          document_id: 'doc1',
          chunk_index: 0,
          content: 'test content',
          similarity: 0.9,
          similarity_score: 0.9,
          metadata: {}
        }];
      });

      const result = await performanceService.validateSearchPerformance(
        ['slow query'],
        'test-chatbot',
        'test-session'
      );

      expect(result.overall_compliance).toBe(false);
      expect(result.avg_response_time_ms).toBeGreaterThan(200);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0]).toContain('Performance does not meet <200ms requirement');
    });

    it('should handle search failures gracefully', async () => {
      // Mock search failure
      mockVectorService.similaritySearch.mockRejectedValue(new Error('Search failed'));

      await expect(
        performanceService.validateSearchPerformance(
          ['failing query'],
          'test-chatbot',
          'test-session'
        )
      ).rejects.toThrow('Performance validation failed');
    });

    it('should trigger optimization when performance degrades', async () => {
      // Mock slow responses
      mockVectorService.similaritySearch.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 400));
        return [];
      });

      await performanceService.validateSearchPerformance(
        ['slow query'],
        'test-chatbot',
        'test-session'
      );

      // Optimization should be triggered
      expect(mockOptimizationService.analyzeIndexPerformance).toHaveBeenCalled();
      expect(mockOptimizationService.optimizeVectorIndexes).toHaveBeenCalled();
      expect(mockOptimizationService.runMaintenanceRoutines).toHaveBeenCalled();
    });
  });

  describe('runPerformanceBenchmark', () => {
    beforeEach(() => {
      // Mock database statistics
      (mockPool.query as jest.MockedFunction<any>).mockImplementation(async (query: string) => {
        if (query.includes('COUNT(*)')) {
          return {
            rows: [{ vector_count: '1000', embedding_dimensions: '1536' }]
          };
        }
        if (query.includes('cache_hit_ratio')) {
          return {
            rows: [{ cache_hit_ratio: '85.5' }]
          };
        }
        if (query.includes('index_efficiency')) {
          return {
            rows: [{ index_efficiency: '92.3' }]
          };
        }
        return { rows: [] };
      });

      // Mock fast vector searches for benchmarks
      mockVectorService.similaritySearch.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 120));
        return [{
          id: '1',
          document_id: 'doc1',
          chunk_index: 0,
          content: 'benchmark content',
          similarity: 0.9,
          similarity_score: 0.9,
          metadata: {}
        }];
      });
    });

    it('should run benchmarks for different dataset sizes', async () => {
      const benchmarks = await performanceService.runPerformanceBenchmark(['small', 'medium']);

      expect(benchmarks).toHaveLength(2);
      expect(benchmarks[0].dataset_size).toBe(1000); // small
      expect(benchmarks[1].dataset_size).toBe(10000); // medium

      benchmarks.forEach(benchmark => {
        expect(benchmark.avg_response_time_ms).toBeLessThan(200);
        expect(benchmark.meets_requirement).toBe(true);
        expect(benchmark.vector_count).toBe(1000);
        expect(benchmark.embedding_dimensions).toBe(1536);
      });
    });

    it('should include memory profiling when requested', async () => {
      const benchmarks = await performanceService.runPerformanceBenchmark(['small'], true);

      expect(benchmarks[0].memory_usage_mb).toBeGreaterThan(0);
    });

    it('should detect performance regression trends', async () => {
      // First benchmark - good performance
      mockVectorService.similaritySearch.mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return [{ id: '1', document_id: 'doc1', chunk_index: 0, content: 'content', similarity: 0.9, similarity_score: 0.9, metadata: {} }];
      });

      const firstBenchmarks = await performanceService.runPerformanceBenchmark(['small']);

      // Second benchmark - degraded performance
      mockVectorService.similaritySearch.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 250));
        return [{ id: '1', document_id: 'doc1', chunk_index: 0, content: 'content', similarity: 0.9, similarity_score: 0.9, metadata: {} }];
      });

      const secondBenchmarks = await performanceService.runPerformanceBenchmark(['small']);

      expect(firstBenchmarks[0].avg_response_time_ms).toBeLessThan(150);
      expect(secondBenchmarks[0].avg_response_time_ms).toBeGreaterThan(200);
      expect(secondBenchmarks[0].meets_requirement).toBe(false);
    });
  });

  describe('validateUnderLoad', () => {
    beforeEach(() => {
      // Mock variable response times for load testing
      let callCount = 0;
      mockVectorService.similaritySearch.mockImplementation(async () => {
        callCount++;
        const delay = 100 + (callCount % 3) * 50; // Variable delays: 100ms, 150ms, 200ms
        await new Promise(resolve => setTimeout(resolve, delay));

        // Simulate occasional failures
        if (callCount % 20 === 0) {
          throw new Error('Load test simulated failure');
        }

        return [{
          id: `result-${callCount}`,
          document_id: 'doc1',
          chunk_index: 0,
          content: 'load test content',
          similarity: 0.8,
          similarity_score: 0.8,
          metadata: {}
        }];
      });
    });

    it('should validate performance under concurrent load', async () => {
      const loadConfig = {
        concurrent_users: 3,
        test_duration_seconds: 5,
        queries_per_user: 5,
        ramp_up_seconds: 1,
        dataset_size: 'small' as const,
        query_complexity: 'simple' as const
      };

      const result = await performanceService.validateUnderLoad(loadConfig);

      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.avg_response_time_ms).toBeLessThan(300);
      expect(result.throughput_qps).toBeGreaterThan(0);
      expect(result.error_rate).toBeLessThan(0.1); // Less than 10% error rate
    });

    it('should measure P95 and P99 response times', async () => {
      const loadConfig = {
        concurrent_users: 2,
        test_duration_seconds: 3,
        queries_per_user: 10,
        ramp_up_seconds: 1,
        dataset_size: 'small' as const,
        query_complexity: 'moderate' as const
      };

      const result = await performanceService.validateUnderLoad(loadConfig);

      expect(result.p95_response_time_ms).toBeGreaterThan(result.avg_response_time_ms);
      expect(result.p95_response_time_ms).toBeLessThan(500); // Should be reasonable
    });

    it('should detect when requirements are not met under load', async () => {
      // Mock very slow responses
      mockVectorService.similaritySearch.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 600)); // Very slow
        return [{
          id: '1',
          document_id: 'doc1',
          chunk_index: 0,
          content: 'slow content',
          similarity: 0.8,
          similarity_score: 0.8,
          metadata: {}
        }];
      });

      const loadConfig = {
        concurrent_users: 2,
        test_duration_seconds: 2,
        queries_per_user: 3,
        ramp_up_seconds: 1,
        dataset_size: 'small' as const,
        query_complexity: 'simple' as const
      };

      const result = await performanceService.validateUnderLoad(loadConfig);

      expect(result.meets_requirements).toBe(false);
      expect(result.avg_response_time_ms).toBeGreaterThan(200);
    });
  });

  describe('generatePerformanceReport', () => {
    beforeEach(() => {
      // Add some test data to the service
      const testResults = [
        {
          test_id: 'test1',
          test_type: 'single_query' as const,
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          query: 'test query 1',
          response_time_ms: 150,
          result_count: 5,
          success: true,
          metadata: {}
        },
        {
          test_id: 'test2',
          test_type: 'single_query' as const,
          timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
          query: 'test query 2',
          response_time_ms: 180,
          result_count: 3,
          success: true,
          metadata: {}
        },
        {
          test_id: 'test3',
          test_type: 'single_query' as const,
          timestamp: new Date(Date.now() - 900000), // 15 minutes ago
          query: 'test query 3',
          response_time_ms: 250,
          result_count: 0,
          success: false,
          error_message: 'Test failure',
          metadata: {}
        }
      ];

      // Inject test data
      (performanceService as any).testResults = testResults;
    });

    it('should generate comprehensive performance report', async () => {
      const report = await performanceService.generatePerformanceReport(1); // Last 1 day

      expect(report.report_id).toMatch(/^perf-report-\d+$/);
      expect(report.summary.total_queries).toBe(3);
      expect(report.summary.avg_response_time_ms).toBeCloseTo(165); // (150 + 180) / 2
      expect(report.summary.requirement_compliance_rate).toBeCloseTo(1.0); // 2/2 successful tests under 200ms
      expect(report.summary.critical_issues).toBe(0);
    });

    it('should analyze performance trends', async () => {
      // Add benchmark data with improving trend
      const benchmarks = [
        {
          benchmark_id: 'bench1',
          timestamp: new Date(Date.now() - 7200000), // 2 hours ago
          dataset_size: 1000,
          vector_count: 1000,
          embedding_dimensions: 1536,
          avg_response_time_ms: 200,
          p50_response_time_ms: 190,
          p95_response_time_ms: 250,
          p99_response_time_ms: 300,
          throughput_qps: 8,
          memory_usage_mb: 100,
          cache_hit_ratio: 0.8,
          index_efficiency: 0.9,
          meets_requirement: false
        },
        {
          benchmark_id: 'bench2',
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          dataset_size: 1000,
          vector_count: 1000,
          embedding_dimensions: 1536,
          avg_response_time_ms: 180,
          p50_response_time_ms: 170,
          p95_response_time_ms: 220,
          p99_response_time_ms: 280,
          throughput_qps: 10,
          memory_usage_mb: 95,
          cache_hit_ratio: 0.85,
          index_efficiency: 0.92,
          meets_requirement: true
        },
        {
          benchmark_id: 'bench3',
          timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
          dataset_size: 1000,
          vector_count: 1000,
          embedding_dimensions: 1536,
          avg_response_time_ms: 160,
          p50_response_time_ms: 150,
          p95_response_time_ms: 200,
          p99_response_time_ms: 250,
          throughput_qps: 12,
          memory_usage_mb: 90,
          cache_hit_ratio: 0.9,
          index_efficiency: 0.95,
          meets_requirement: true
        }
      ];

      (performanceService as any).benchmarks = benchmarks;

      const report = await performanceService.generatePerformanceReport(1);

      expect(report.summary.performance_trend).toBe('improving');
      expect(report.detailed_metrics).toHaveLength(3);
    });

    it('should include optimization recommendations', async () => {
      const report = await performanceService.generatePerformanceReport(1, true);

      expect(report.recommendations).toBeDefined();
      expect(report.optimization_opportunities).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(Array.isArray(report.optimization_opportunities)).toBe(true);
    });
  });

  describe('Performance Monitoring', () => {
    it('should start and stop monitoring', async () => {
      await performanceService.startPerformanceMonitoring(30);

      // Monitoring should be active
      expect((performanceService as any).monitoringActive).toBe(true);
      expect((performanceService as any).monitoringInterval).toBeDefined();

      performanceService.stopPerformanceMonitoring();

      // Monitoring should be stopped
      expect((performanceService as any).monitoringActive).toBe(false);
      expect((performanceService as any).monitoringInterval).toBeNull();
    });

    it('should prevent starting monitoring twice', async () => {
      await performanceService.startPerformanceMonitoring(60);

      await expect(
        performanceService.startPerformanceMonitoring(60)
      ).rejects.toThrow('Performance monitoring is already active');

      performanceService.stopPerformanceMonitoring();
    });
  });

  describe('Optimization Integration', () => {
    it('should trigger optimization when needed', async () => {
      // Add test results that exceed thresholds
      const poorResults = Array.from({ length: 10 }, (_, i) => ({
        test_id: `poor-test-${i}`,
        test_type: 'single_query' as const,
        timestamp: new Date(),
        query: `poor query ${i}`,
        response_time_ms: 300 + i * 10, // All above 300ms
        result_count: 1,
        success: true,
        metadata: {}
      }));

      (performanceService as any).testResults = poorResults;

      const optimizationTriggered = await performanceService.optimizeIfNeeded();

      expect(optimizationTriggered).toBe(true);
      expect(mockOptimizationService.analyzeIndexPerformance).toHaveBeenCalled();
      expect(mockOptimizationService.optimizeVectorIndexes).toHaveBeenCalled();
      expect(mockOptimizationService.runMaintenanceRoutines).toHaveBeenCalled();
    });

    it('should not trigger optimization when performance is good', async () => {
      // Add test results that meet requirements
      const goodResults = Array.from({ length: 10 }, (_, i) => ({
        test_id: `good-test-${i}`,
        test_type: 'single_query' as const,
        timestamp: new Date(),
        query: `good query ${i}`,
        response_time_ms: 150 + i * 5, // All under 200ms
        result_count: 3,
        success: true,
        metadata: {}
      }));

      (performanceService as any).testResults = goodResults;

      const optimizationTriggered = await performanceService.optimizeIfNeeded();

      expect(optimizationTriggered).toBe(false);
      expect(mockOptimizationService.optimizeVectorIndexes).not.toHaveBeenCalled();
    });

    it('should handle optimization failures gracefully', async () => {
      // Mock optimization failure
      mockOptimizationService.optimizeVectorIndexes.mockRejectedValue(new Error('Optimization failed'));

      // Add poor results to trigger optimization
      const poorResults = [{
        test_id: 'poor-test',
        test_type: 'single_query' as const,
        timestamp: new Date(),
        query: 'poor query',
        response_time_ms: 400,
        result_count: 1,
        success: true,
        metadata: {}
      }];

      (performanceService as any).testResults = poorResults;

      await expect(
        performanceService.optimizeIfNeeded()
      ).rejects.toThrow('Optimization check failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      (mockPool.query as jest.MockedFunction<any>).mockRejectedValue(new Error('Database connection failed'));

      await expect(
        performanceService.validateSearchPerformance(['test query'])
      ).rejects.toThrow('Performance validation failed');
    });

    it('should handle vector service errors', async () => {
      mockVectorService.similaritySearch.mockRejectedValue(new Error('Vector search failed'));

      await expect(
        performanceService.validateSearchPerformance(['test query'])
      ).rejects.toThrow('Performance validation failed');
    });

    it('should handle optimization service errors', async () => {
      mockOptimizationService.optimizeVectorIndexes.mockRejectedValue(new Error('Optimization failed'));

      // Create conditions that would trigger optimization
      const poorResults = [{
        test_id: 'poor-test',
        test_type: 'single_query' as const,
        timestamp: new Date(),
        query: 'poor query',
        response_time_ms: 400,
        result_count: 1,
        success: true,
        metadata: {}
      }];

      (performanceService as any).testResults = poorResults;

      await expect(
        performanceService.optimizeIfNeeded()
      ).rejects.toThrow('Optimization check failed');
    });
  });
});