/**
 * Performance Validation Service
 *
 * Comprehensive performance validation system that ensures vector search operations
 * meet the <200ms requirement. Provides automated testing, monitoring, and optimization
 * with real-time alerting and CI/CD integration.
 */

import { Pool, Client } from 'pg';
import { performance } from 'perf_hooks';
import { VectorSearchService, VectorSearchResult, SearchFilters } from '@/lib/vector/search';
import { VectorOptimizationService, PerformanceMonitoringData } from '@/lib/vector/optimization';
import { withDatabaseMonitoring } from '@/lib/monitoring/api-wrapper';
import { SentryUtils, VectorSearchError } from '@/lib/monitoring/sentry-utils';
import { getNeonPool } from '@/lib/neon';

export interface PerformanceTestResult {
  test_id: string;
  test_type: 'single_query' | 'load_test' | 'concurrent_test' | 'regression_test';
  timestamp: Date;
  query: string;
  response_time_ms: number;
  memory_usage_mb?: number;
  cpu_usage_percent?: number;
  result_count: number;
  success: boolean;
  error_message?: string;
  metadata: Record<string, any>;
}

export interface LoadTestConfiguration {
  concurrent_users: number;
  test_duration_seconds: number;
  queries_per_user: number;
  ramp_up_seconds: number;
  dataset_size: 'small' | 'medium' | 'large' | 'enterprise';
  query_complexity: 'simple' | 'moderate' | 'complex';
}

export interface PerformanceBenchmark {
  benchmark_id: string;
  timestamp: Date;
  dataset_size: number;
  vector_count: number;
  embedding_dimensions: number;
  avg_response_time_ms: number;
  p50_response_time_ms: number;
  p95_response_time_ms: number;
  p99_response_time_ms: number;
  throughput_qps: number;
  memory_usage_mb: number;
  cache_hit_ratio: number;
  index_efficiency: number;
  meets_requirement: boolean;
}

export interface PerformanceAlert {
  alert_id: string;
  severity: 'critical' | 'warning' | 'info';
  type: 'response_time' | 'throughput' | 'error_rate' | 'memory_usage' | 'regression';
  message: string;
  current_value: number;
  threshold_value: number;
  metadata: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
}

export interface OptimizationTrigger {
  trigger_id: string;
  trigger_type: 'performance_degradation' | 'threshold_breach' | 'regression_detected' | 'scheduled';
  conditions: {
    response_time_threshold?: number;
    error_rate_threshold?: number;
    memory_threshold_mb?: number;
    cache_hit_ratio_threshold?: number;
  };
  actions: string[];
  auto_execute: boolean;
  last_triggered?: Date;
}

export interface PerformanceReport {
  report_id: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    total_queries: number;
    avg_response_time_ms: number;
    requirement_compliance_rate: number;
    performance_trend: 'improving' | 'stable' | 'degrading';
    critical_issues: number;
  };
  detailed_metrics: PerformanceBenchmark[];
  alerts: PerformanceAlert[];
  recommendations: string[];
  optimization_opportunities: string[];
}

export class PerformanceValidationService {
  private pool: Pool;
  private vectorService: VectorSearchService;
  private optimizationService: VectorOptimizationService;
  private testResults: PerformanceTestResult[] = [];
  private benchmarks: PerformanceBenchmark[] = [];
  private alerts: PerformanceAlert[] = [];
  private monitoringActive: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  // Performance requirements
  private readonly TARGET_RESPONSE_TIME_MS = 200;
  private readonly CRITICAL_RESPONSE_TIME_MS = 500;
  private readonly MIN_THROUGHPUT_QPS = 10;
  private readonly MAX_MEMORY_USAGE_MB = 1024;
  private readonly MIN_CACHE_HIT_RATIO = 0.8;

  constructor(pool?: Pool) {
    this.pool = pool || getNeonPool();
    const client = new Client(this.pool.options);
    this.vectorService = new VectorSearchService(client);
    this.optimizationService = new VectorOptimizationService(this.pool);
  }

  /**
   * Validate current search performance against <200ms requirement
   */
  async validateSearchPerformance(
    testQueries: string[] = [
      'authentication setup guide',
      'database configuration',
      'user management',
      'API integration',
      'troubleshooting common issues'
    ],
    chatbotId: string = 'test-chatbot-id',
    sessionId: string = 'performance-test-session'
  ): Promise<{
    overall_compliance: boolean;
    avg_response_time_ms: number;
    results: PerformanceTestResult[];
    recommendations: string[];
  }> {
    const startTime = performance.now();
    const results: PerformanceTestResult[] = [];
    const recommendations: string[] = [];

    try {
      SentryUtils.addBreadcrumb('Performance validation started', {
        test_queries_count: testQueries.length,
        chatbot_id: chatbotId,
        target_response_time: this.TARGET_RESPONSE_TIME_MS
      });

      for (const query of testQueries) {
        const testResult = await this.performSingleQueryTest(query, chatbotId, sessionId);
        results.push(testResult);
      }

      const avgResponseTime = results.reduce((sum, r) => sum + r.response_time_ms, 0) / results.length;
      const successfulTests = results.filter(r => r.success).length;
      const complianceRate = results.filter(r => r.response_time_ms <= this.TARGET_RESPONSE_TIME_MS).length / results.length;
      const overallCompliance = complianceRate >= 0.95; // 95% of tests must meet requirement

      // Generate recommendations
      if (!overallCompliance) {
        recommendations.push('Performance does not meet <200ms requirement');

        if (avgResponseTime > this.TARGET_RESPONSE_TIME_MS) {
          recommendations.push('Consider index optimization or query rewriting');
        }

        if (successfulTests < results.length) {
          recommendations.push('Address query failures to improve reliability');
        }

        recommendations.push('Run optimization analysis for specific improvements');
      }

      // Log validation results
      SentryUtils.addBreadcrumb('Performance validation completed', {
        overall_compliance: overallCompliance,
        avg_response_time_ms: avgResponseTime,
        compliance_rate: complianceRate,
        successful_tests: successfulTests,
        total_tests: results.length
      });

      // Store results for historical tracking
      this.testResults.push(...results);
      this.trimTestResults();

      // Trigger optimization if performance is degraded
      if (!overallCompliance) {
        await this.triggerOptimization('performance_degradation', {
          avg_response_time: avgResponseTime,
          compliance_rate: complianceRate
        });
      }

      return {
        overall_compliance: overallCompliance,
        avg_response_time_ms: avgResponseTime,
        results,
        recommendations
      };

    } catch (error) {
      const duration = performance.now() - startTime;

      SentryUtils.captureError(error as Error, {
        chatbotId,
        sessionId,
        duration_ms: duration,
        test_queries_count: testQueries.length
      });

      throw new VectorSearchError(
        `Performance validation failed: ${(error as Error).message}`,
        { chatbot_id: chatbotId, duration_ms: duration }
      );
    }
  }

  /**
   * Run comprehensive performance benchmark suite
   */
  async runPerformanceBenchmark(
    datasetSizes: Array<'small' | 'medium' | 'large' | 'enterprise'> = ['small', 'medium', 'large'],
    includeMemoryProfiling: boolean = true
  ): Promise<PerformanceBenchmark[]> {
    const benchmarks: PerformanceBenchmark[] = [];

    try {
      SentryUtils.addBreadcrumb('Performance benchmark started', {
        dataset_sizes: datasetSizes,
        include_memory_profiling: includeMemoryProfiling
      });

      for (const datasetSize of datasetSizes) {
        const benchmark = await this.runDatasetBenchmark(datasetSize, includeMemoryProfiling);
        benchmarks.push(benchmark);
      }

      // Store benchmarks for historical comparison
      this.benchmarks.push(...benchmarks);
      this.trimBenchmarks();

      // Analyze trends and generate alerts
      await this.analyzeBenchmarkTrends(benchmarks);

      return benchmarks;

    } catch (error) {
      SentryUtils.captureError(error as Error, {
        additionalData: {
          dataset_sizes: datasetSizes,
          benchmarks_completed: benchmarks.length
        }
      });

      throw new VectorSearchError(
        `Performance benchmark failed: ${(error as Error).message}`,
        { dataset_sizes: datasetSizes }
      );
    }
  }

  /**
   * Validate performance under concurrent load
   */
  async validateUnderLoad(config: LoadTestConfiguration): Promise<{
    success: boolean;
    avg_response_time_ms: number;
    p95_response_time_ms: number;
    throughput_qps: number;
    error_rate: number;
    results: PerformanceTestResult[];
    meets_requirements: boolean;
  }> {
    const startTime = performance.now();
    const results: PerformanceTestResult[] = [];

    try {
      SentryUtils.addBreadcrumb('Load test started', config);

      // Generate test queries based on complexity
      const testQueries = this.generateTestQueries(config.query_complexity, config.queries_per_user);

      // Prepare concurrent user simulation
      const userPromises: Promise<PerformanceTestResult[]>[] = [];

      // Ramp up users gradually
      for (let user = 0; user < config.concurrent_users; user++) {
        const delay = (user / config.concurrent_users) * config.ramp_up_seconds * 1000;

        const userPromise = new Promise<PerformanceTestResult[]>((resolve) => {
          setTimeout(async () => {
            const userResults = await this.simulateUserLoad(
              `user-${user}`,
              testQueries,
              config.test_duration_seconds
            );
            resolve(userResults);
          }, delay);
        });

        userPromises.push(userPromise);
      }

      // Execute all user simulations
      const allUserResults = await Promise.all(userPromises);
      results.push(...allUserResults.flat());

      // Analyze results
      const successfulResults = results.filter(r => r.success);
      const responseTimes = successfulResults.map(r => r.response_time_ms).sort((a, b) => a - b);

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p95ResponseTime = responseTimes[p95Index] || 0;

      const totalDuration = (performance.now() - startTime) / 1000;
      const throughputQps = successfulResults.length / totalDuration;
      const errorRate = (results.length - successfulResults.length) / results.length;

      const meetsRequirements =
        avgResponseTime <= this.TARGET_RESPONSE_TIME_MS &&
        p95ResponseTime <= this.TARGET_RESPONSE_TIME_MS * 1.5 &&
        throughputQps >= this.MIN_THROUGHPUT_QPS &&
        errorRate <= 0.01; // 1% error rate

      // Log load test results
      SentryUtils.addBreadcrumb('Load test completed', {
        config,
        avg_response_time_ms: avgResponseTime,
        p95_response_time_ms: p95ResponseTime,
        throughput_qps: throughputQps,
        error_rate: errorRate,
        meets_requirements: meetsRequirements,
        total_queries: results.length,
        successful_queries: successfulResults.length
      });

      return {
        success: true,
        avg_response_time_ms: avgResponseTime,
        p95_response_time_ms: p95ResponseTime,
        throughput_qps: throughputQps,
        error_rate: errorRate,
        results,
        meets_requirements: meetsRequirements
      };

    } catch (error) {
      SentryUtils.captureError(error as Error, {
        load_test_config: config,
        results_count: results.length
      });

      throw new VectorSearchError(
        `Load test failed: ${(error as Error).message}`,
        { config }
      );
    }
  }

  /**
   * Generate detailed performance analysis report
   */
  async generatePerformanceReport(
    periodDays: number = 7,
    includeOptimizationRecommendations: boolean = true
  ): Promise<PerformanceReport> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (periodDays * 24 * 60 * 60 * 1000));

    try {
      // Filter data for the period
      const periodResults = this.testResults.filter(
        r => r.timestamp >= startDate && r.timestamp <= endDate
      );
      const periodBenchmarks = this.benchmarks.filter(
        b => b.timestamp >= startDate && b.timestamp <= endDate
      );
      const periodAlerts = this.alerts.filter(
        a => a.timestamp >= startDate && a.timestamp <= endDate
      );

      // Calculate summary metrics
      const successfulResults = periodResults.filter(r => r.success);
      const avgResponseTime = successfulResults.length > 0
        ? successfulResults.reduce((sum, r) => sum + r.response_time_ms, 0) / successfulResults.length
        : 0;

      const complianceRate = successfulResults.length > 0
        ? successfulResults.filter(r => r.response_time_ms <= this.TARGET_RESPONSE_TIME_MS).length / successfulResults.length
        : 0;

      // Analyze performance trend
      const trend = this.analyzePerformanceTrend(periodBenchmarks);

      // Count critical issues
      const criticalIssues = periodAlerts.filter(a => a.severity === 'critical').length;

      // Generate recommendations
      const recommendations = includeOptimizationRecommendations
        ? await this.generateOptimizationRecommendations(periodResults, periodBenchmarks)
        : [];

      const optimizationOpportunities = await this.identifyOptimizationOpportunities(periodBenchmarks);

      const report: PerformanceReport = {
        report_id: `perf-report-${Date.now()}`,
        period: { start: startDate, end: endDate },
        summary: {
          total_queries: periodResults.length,
          avg_response_time_ms: avgResponseTime,
          requirement_compliance_rate: complianceRate,
          performance_trend: trend,
          critical_issues: criticalIssues
        },
        detailed_metrics: periodBenchmarks,
        alerts: periodAlerts,
        recommendations,
        optimization_opportunities: optimizationOpportunities
      };

      SentryUtils.addBreadcrumb('Performance report generated', {
        report_id: report.report_id,
        period_days: periodDays,
        total_queries: periodResults.length,
        compliance_rate: complianceRate,
        critical_issues: criticalIssues
      });

      return report;

    } catch (error) {
      SentryUtils.captureError(error as Error, {
        period_days: periodDays,
        start_date: startDate,
        end_date: endDate
      });

      throw new VectorSearchError(
        `Failed to generate performance report: ${(error as Error).message}`,
        { period_days: periodDays }
      );
    }
  }

  /**
   * Start continuous performance monitoring
   */
  async startPerformanceMonitoring(intervalSeconds: number = 60): Promise<void> {
    if (this.monitoringActive) {
      throw new Error('Performance monitoring is already active');
    }

    this.monitoringActive = true;

    SentryUtils.addBreadcrumb('Performance monitoring started', {
      interval_seconds: intervalSeconds
    });

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performMonitoringCheck();
      } catch (error) {
        SentryUtils.captureError(error as Error, {
          monitoring_check: true
        });
      }
    }, intervalSeconds * 1000);
  }

  /**
   * Stop continuous performance monitoring
   */
  stopPerformanceMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.monitoringActive = false;

    SentryUtils.addBreadcrumb('Performance monitoring stopped');
  }

  /**
   * Trigger optimization when performance degrades
   */
  async optimizeIfNeeded(
    triggerConditions: OptimizationTrigger['conditions'] = {
      response_time_threshold: this.TARGET_RESPONSE_TIME_MS,
      error_rate_threshold: 0.05,
      memory_threshold_mb: this.MAX_MEMORY_USAGE_MB,
      cache_hit_ratio_threshold: this.MIN_CACHE_HIT_RATIO
    }
  ): Promise<boolean> {
    try {
      // Check current performance metrics
      const recentResults = this.testResults.slice(-10);
      if (recentResults.length === 0) {
        return false;
      }

      const avgResponseTime = recentResults.reduce((sum, r) => sum + r.response_time_ms, 0) / recentResults.length;
      const errorRate = recentResults.filter(r => !r.success).length / recentResults.length;

      // Check if optimization is needed
      const needsOptimization =
        avgResponseTime > (triggerConditions.response_time_threshold || this.TARGET_RESPONSE_TIME_MS) ||
        errorRate > (triggerConditions.error_rate_threshold || 0.05);

      if (needsOptimization) {
        SentryUtils.addBreadcrumb('Optimization triggered', {
          avg_response_time: avgResponseTime,
          error_rate: errorRate,
          trigger_conditions: triggerConditions
        });

        // Trigger various optimization strategies
        await this.optimizationService.optimizeIndexes();
        await this.optimizationService.updateStatistics();
        await this.optimizationService.optimizeMemoryUsage();

        return true;
      }

      return false;

    } catch (error) {
      SentryUtils.captureError(error as Error, {
        optimization_check: true,
        trigger_conditions: triggerConditions
      });

      throw new VectorSearchError(
        `Optimization check failed: ${(error as Error).message}`,
        { trigger_conditions: triggerConditions }
      );
    }
  }

  // Private helper methods

  private async performSingleQueryTest(
    query: string,
    chatbotId: string,
    sessionId: string
  ): Promise<PerformanceTestResult> {
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    const memoryBefore = process.memoryUsage();

    try {
      const results = await this.vectorService.similaritySearch(query, chatbotId, sessionId);
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      const memoryAfter = process.memoryUsage();
      const memoryUsage = (memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024;

      return {
        test_id: testId,
        test_type: 'single_query',
        timestamp: new Date(),
        query,
        response_time_ms: responseTime,
        memory_usage_mb: memoryUsage,
        result_count: results.length,
        success: true,
        metadata: {
          chatbot_id: chatbotId,
          session_id: sessionId,
          heap_used_mb: memoryAfter.heapUsed / 1024 / 1024
        }
      };

    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      return {
        test_id: testId,
        test_type: 'single_query',
        timestamp: new Date(),
        query,
        response_time_ms: responseTime,
        result_count: 0,
        success: false,
        error_message: (error as Error).message,
        metadata: {
          chatbot_id: chatbotId,
          session_id: sessionId
        }
      };
    }
  }

  private async runDatasetBenchmark(
    datasetSize: 'small' | 'medium' | 'large' | 'enterprise',
    includeMemoryProfiling: boolean
  ): Promise<PerformanceBenchmark> {
    const queries = this.generateBenchmarkQueries(datasetSize);
    const results: PerformanceTestResult[] = [];
    const startTime = performance.now();

    // Get dataset statistics
    const stats = await this.getDatasetStatistics();

    for (const query of queries) {
      const result = await this.performSingleQueryTest(
        query,
        'benchmark-chatbot',
        'benchmark-session'
      );
      results.push(result);
    }

    const responseTimes = results.filter(r => r.success).map(r => r.response_time_ms).sort((a, b) => a - b);
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

    const p50Index = Math.floor(responseTimes.length * 0.5);
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    const totalDuration = (performance.now() - startTime) / 1000;
    const throughput = results.length / totalDuration;

    const memoryUsage = includeMemoryProfiling
      ? results.reduce((sum, r) => sum + (r.memory_usage_mb || 0), 0) / results.length
      : 0;

    return {
      benchmark_id: `benchmark-${Date.now()}`,
      timestamp: new Date(),
      dataset_size: this.getDatasetSizeNumber(datasetSize),
      vector_count: stats.vector_count,
      embedding_dimensions: stats.embedding_dimensions,
      avg_response_time_ms: avgResponseTime,
      p50_response_time_ms: responseTimes[p50Index] || 0,
      p95_response_time_ms: responseTimes[p95Index] || 0,
      p99_response_time_ms: responseTimes[p99Index] || 0,
      throughput_qps: throughput,
      memory_usage_mb: memoryUsage,
      cache_hit_ratio: await this.getCacheHitRatio(),
      index_efficiency: await this.getIndexEfficiency(),
      meets_requirement: avgResponseTime <= this.TARGET_RESPONSE_TIME_MS
    };
  }

  private async simulateUserLoad(
    userId: string,
    queries: string[],
    durationSeconds: number
  ): Promise<PerformanceTestResult[]> {
    const results: PerformanceTestResult[] = [];
    const endTime = Date.now() + (durationSeconds * 1000);

    let queryIndex = 0;
    while (Date.now() < endTime) {
      const query = queries[queryIndex % queries.length];
      const result = await this.performSingleQueryTest(
        query,
        'load-test-chatbot',
        `load-test-${userId}`
      );

      result.metadata.user_id = userId;
      results.push(result);

      queryIndex++;

      // Add small random delay to simulate real user behavior
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
    }

    return results;
  }

  private generateTestQueries(complexity: 'simple' | 'moderate' | 'complex', count: number): string[] {
    const simpleQueries = [
      'help',
      'login',
      'password',
      'user account',
      'documentation'
    ];

    const moderateQueries = [
      'how to set up authentication',
      'database connection troubleshooting',
      'user role management guide',
      'API integration best practices',
      'error handling documentation'
    ];

    const complexQueries = [
      'comprehensive guide for implementing multi-factor authentication with role-based access control',
      'detailed troubleshooting steps for database connection failures in production environment',
      'best practices for API rate limiting and error handling in microservices architecture',
      'step-by-step instructions for setting up automated backup and disaster recovery procedures',
      'performance optimization strategies for high-traffic applications with real-time requirements'
    ];

    const sourceQueries = complexity === 'simple' ? simpleQueries
      : complexity === 'moderate' ? moderateQueries
      : complexQueries;

    const queries: string[] = [];
    for (let i = 0; i < count; i++) {
      queries.push(sourceQueries[i % sourceQueries.length]);
    }

    return queries;
  }

  private generateBenchmarkQueries(datasetSize: string): string[] {
    const baseQueries = [
      'authentication setup',
      'database configuration',
      'user management',
      'API documentation',
      'troubleshooting guide',
      'security best practices',
      'performance optimization',
      'deployment guide',
      'error handling',
      'backup procedures'
    ];

    const multiplier = datasetSize === 'small' ? 1
      : datasetSize === 'medium' ? 3
      : datasetSize === 'large' ? 5
      : 10;

    const queries: string[] = [];
    for (let i = 0; i < baseQueries.length * multiplier; i++) {
      queries.push(baseQueries[i % baseQueries.length]);
    }

    return queries;
  }

  private getDatasetSizeNumber(size: string): number {
    switch (size) {
      case 'small': return 1000;
      case 'medium': return 10000;
      case 'large': return 100000;
      case 'enterprise': return 1000000;
      default: return 1000;
    }
  }

  private async getDatasetStatistics(): Promise<{
    vector_count: number;
    embedding_dimensions: number;
  }> {
    try {
      const result = await this.pool.query(`
        SELECT
          COUNT(*) as vector_count,
          COALESCE(array_length(embedding::vector, 1), 0) as embedding_dimensions
        FROM document_chunks
        WHERE embedding IS NOT NULL
        LIMIT 1
      `);

      return {
        vector_count: parseInt(result.rows[0]?.vector_count || '0'),
        embedding_dimensions: parseInt(result.rows[0]?.embedding_dimensions || '1536')
      };
    } catch (error) {
      return { vector_count: 0, embedding_dimensions: 1536 };
    }
  }

  private async getCacheHitRatio(): Promise<number> {
    try {
      const result = await this.pool.query(`
        SELECT
          CASE
            WHEN blks_read + blks_hit = 0 THEN 0
            ELSE ROUND(blks_hit * 100.0 / (blks_hit + blks_read), 2)
          END as cache_hit_ratio
        FROM pg_stat_user_tables
        WHERE relname = 'document_chunks'
      `);

      return parseFloat(result.rows[0]?.cache_hit_ratio || '0') / 100;
    } catch (error) {
      return 0.8; // Default assumption
    }
  }

  private async getIndexEfficiency(): Promise<number> {
    try {
      const result = await this.pool.query(`
        SELECT
          CASE
            WHEN idx_scan + seq_scan = 0 THEN 0
            ELSE ROUND(idx_scan * 100.0 / (idx_scan + seq_scan), 2)
          END as index_efficiency
        FROM pg_stat_user_tables
        WHERE relname = 'document_chunks'
      `);

      return parseFloat(result.rows[0]?.index_efficiency || '0') / 100;
    } catch (error) {
      return 0.9; // Default assumption
    }
  }

  private async triggerOptimization(
    triggerType: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      SentryUtils.addBreadcrumb('Optimization triggered', {
        trigger_type: triggerType,
        metadata
      });

      // Trigger optimization service
      await this.optimizationService.optimizeIndexes();
      await this.optimizationService.updateStatistics();

    } catch (error) {
      SentryUtils.captureError(error as Error, {
        optimization_trigger: triggerType,
        metadata
      });
    }
  }

  private async performMonitoringCheck(): Promise<void> {
    try {
      // Perform a quick performance test
      const testResult = await this.performSingleQueryTest(
        'monitoring health check',
        'monitoring-chatbot',
        'monitoring-session'
      );

      // Check for alerts
      if (testResult.response_time_ms > this.TARGET_RESPONSE_TIME_MS) {
        await this.generateAlert({
          severity: testResult.response_time_ms > this.CRITICAL_RESPONSE_TIME_MS ? 'critical' : 'warning',
          type: 'response_time',
          message: `Response time exceeded threshold: ${testResult.response_time_ms}ms`,
          current_value: testResult.response_time_ms,
          threshold_value: this.TARGET_RESPONSE_TIME_MS,
          metadata: { test_id: testResult.test_id }
        });
      }

      if (!testResult.success) {
        await this.generateAlert({
          severity: 'critical',
          type: 'error_rate',
          message: `Query failed: ${testResult.error_message}`,
          current_value: 1,
          threshold_value: 0,
          metadata: { test_id: testResult.test_id, error: testResult.error_message }
        });
      }

    } catch (error) {
      await this.generateAlert({
        severity: 'critical',
        type: 'error_rate',
        message: `Monitoring check failed: ${(error as Error).message}`,
        current_value: 1,
        threshold_value: 0,
        metadata: { error: (error as Error).message }
      });
    }
  }

  private async generateAlert(alert: Omit<PerformanceAlert, 'alert_id' | 'timestamp' | 'resolved'>): Promise<void> {
    const fullAlert: PerformanceAlert = {
      alert_id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
      ...alert
    };

    this.alerts.push(fullAlert);
    this.trimAlerts();

    // Send to Sentry
    SentryUtils.captureError(new Error(fullAlert.message), {
      alert_id: fullAlert.alert_id,
      severity: fullAlert.severity,
      type: fullAlert.type,
      current_value: fullAlert.current_value,
      threshold_value: fullAlert.threshold_value,
      metadata: fullAlert.metadata
    });
  }

  private async analyzeBenchmarkTrends(benchmarks: PerformanceBenchmark[]): Promise<void> {
    if (benchmarks.length < 2) return;

    const latest = benchmarks[benchmarks.length - 1];
    const previous = benchmarks[benchmarks.length - 2];

    const responseTimeChange = ((latest.avg_response_time_ms - previous.avg_response_time_ms) / previous.avg_response_time_ms) * 100;
    const throughputChange = ((latest.throughput_qps - previous.throughput_qps) / previous.throughput_qps) * 100;

    // Generate regression alerts
    if (responseTimeChange > 20) {
      await this.generateAlert({
        severity: 'warning',
        type: 'regression',
        message: `Response time regression detected: ${responseTimeChange.toFixed(1)}% increase`,
        current_value: latest.avg_response_time_ms,
        threshold_value: previous.avg_response_time_ms,
        metadata: {
          benchmark_comparison: true,
          response_time_change_percent: responseTimeChange
        }
      });
    }

    if (throughputChange < -10) {
      await this.generateAlert({
        severity: 'warning',
        type: 'regression',
        message: `Throughput regression detected: ${Math.abs(throughputChange).toFixed(1)}% decrease`,
        current_value: latest.throughput_qps,
        threshold_value: previous.throughput_qps,
        metadata: {
          benchmark_comparison: true,
          throughput_change_percent: throughputChange
        }
      });
    }
  }

  private analyzePerformanceTrend(benchmarks: PerformanceBenchmark[]): 'improving' | 'stable' | 'degrading' {
    if (benchmarks.length < 3) return 'stable';

    const recentBenchmarks = benchmarks.slice(-3);
    const responseTimes = recentBenchmarks.map(b => b.avg_response_time_ms);

    const firstHalf = responseTimes.slice(0, Math.floor(responseTimes.length / 2));
    const secondHalf = responseTimes.slice(Math.floor(responseTimes.length / 2));

    const avgFirst = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;

    const changePercent = ((avgSecond - avgFirst) / avgFirst) * 100;

    if (changePercent < -5) return 'improving';
    if (changePercent > 5) return 'degrading';
    return 'stable';
  }

  private async generateOptimizationRecommendations(
    results: PerformanceTestResult[],
    benchmarks: PerformanceBenchmark[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Analyze recent performance
    const avgResponseTime = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.response_time_ms, 0) / results.length;

    if (avgResponseTime > this.TARGET_RESPONSE_TIME_MS) {
      recommendations.push('Consider index optimization to improve query performance');
      recommendations.push('Review query patterns and implement caching for frequent searches');
    }

    const errorRate = results.filter(r => !r.success).length / results.length;
    if (errorRate > 0.01) {
      recommendations.push('Investigate and resolve query failure causes');
      recommendations.push('Implement better error handling and retry mechanisms');
    }

    // Analyze memory usage trends
    const highMemoryResults = results.filter(r => (r.memory_usage_mb || 0) > 100);
    if (highMemoryResults.length > results.length * 0.1) {
      recommendations.push('Optimize memory usage for vector operations');
      recommendations.push('Consider implementing memory-efficient embedding strategies');
    }

    // Analyze benchmark trends
    if (benchmarks.length > 1) {
      const latest = benchmarks[benchmarks.length - 1];
      if (!latest.meets_requirement) {
        recommendations.push('Critical: Performance does not meet <200ms requirement');
        recommendations.push('Immediate index optimization and query tuning required');
      }

      if (latest.cache_hit_ratio < this.MIN_CACHE_HIT_RATIO) {
        recommendations.push('Improve cache hit ratio through query optimization');
        recommendations.push('Consider increasing cache size or implementing smarter caching strategies');
      }
    }

    return recommendations;
  }

  private async identifyOptimizationOpportunities(benchmarks: PerformanceBenchmark[]): Promise<string[]> {
    const opportunities: string[] = [];

    if (benchmarks.length === 0) return opportunities;

    const latest = benchmarks[benchmarks.length - 1];

    if (latest.index_efficiency < 0.9) {
      opportunities.push('Index efficiency can be improved through rebuild or parameter tuning');
    }

    if (latest.throughput_qps < this.MIN_THROUGHPUT_QPS) {
      opportunities.push('Throughput optimization through connection pooling and query optimization');
    }

    if (latest.p95_response_time_ms > this.TARGET_RESPONSE_TIME_MS * 2) {
      opportunities.push('P95 response time optimization through outlier query analysis');
    }

    if (latest.memory_usage_mb > this.MAX_MEMORY_USAGE_MB * 0.8) {
      opportunities.push('Memory usage optimization to prevent performance degradation');
    }

    return opportunities;
  }

  private trimTestResults(): void {
    if (this.testResults.length > 10000) {
      this.testResults = this.testResults.slice(-5000);
    }
  }

  private trimBenchmarks(): void {
    if (this.benchmarks.length > 1000) {
      this.benchmarks = this.benchmarks.slice(-500);
    }
  }

  private trimAlerts(): void {
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500);
    }
  }
}

export default PerformanceValidationService;