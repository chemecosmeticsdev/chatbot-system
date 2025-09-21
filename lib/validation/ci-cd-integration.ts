/**
 * CI/CD Performance Integration
 *
 * Integrates performance validation with CI/CD pipelines to ensure
 * deployment quality and prevent performance regressions.
 */

import { PerformanceValidationService, PerformanceBenchmark, PerformanceTestResult } from './performance-validation';
import { SentryUtils, VectorSearchError } from '@/lib/monitoring/sentry-utils';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface CICDPerformanceConfig {
  target_response_time_ms: number;
  max_acceptable_regression_percent: number;
  min_throughput_qps: number;
  max_error_rate_percent: number;
  test_duration_seconds: number;
  concurrent_users: number;
  baseline_comparison_enabled: boolean;
  fail_on_regression: boolean;
}

export interface PerformanceBaseline {
  commit_hash: string;
  branch: string;
  timestamp: Date;
  avg_response_time_ms: number;
  p95_response_time_ms: number;
  p99_response_time_ms: number;
  throughput_qps: number;
  error_rate: number;
  memory_usage_mb: number;
  test_count: number;
}

export interface CICDTestResult {
  pipeline_id: string;
  commit_hash: string;
  branch: string;
  timestamp: Date;
  performance_tests_passed: boolean;
  regression_detected: boolean;
  baseline_comparison?: {
    baseline: PerformanceBaseline;
    current: PerformanceBaseline;
    regression_percent: number;
  };
  detailed_results: PerformanceTestResult[];
  benchmarks: PerformanceBenchmark[];
  blocking_issues: string[];
  warnings: string[];
  recommendations: string[];
}

export interface DeploymentGate {
  gate_id: string;
  gate_type: 'performance' | 'regression' | 'error_rate' | 'memory' | 'throughput';
  threshold_value: number;
  current_value: number;
  passed: boolean;
  blocking: boolean;
  message: string;
}

export class CICDPerformanceIntegration {
  private performanceService: PerformanceValidationService;
  private config: CICDPerformanceConfig;
  private baselinePath: string;

  constructor(
    performanceService: PerformanceValidationService,
    config: Partial<CICDPerformanceConfig> = {}
  ) {
    this.performanceService = performanceService;
    this.config = {
      target_response_time_ms: 200,
      max_acceptable_regression_percent: 10,
      min_throughput_qps: 10,
      max_error_rate_percent: 1,
      test_duration_seconds: 30,
      concurrent_users: 5,
      baseline_comparison_enabled: true,
      fail_on_regression: true,
      ...config
    };
    this.baselinePath = join(process.cwd(), '.performance-baseline.json');
  }

  /**
   * Run performance validation for CI/CD pipeline
   */
  async runCICDPerformanceValidation(
    pipelineId: string,
    commitHash: string,
    branch: string
  ): Promise<CICDTestResult> {
    const startTime = Date.now();

    try {
      SentryUtils.addBreadcrumb('CI/CD performance validation started', {
        pipeline_id: pipelineId,
        commit_hash: commitHash,
        branch: branch,
        config: this.config
      });

      // Run comprehensive performance tests
      const validationResult = await this.performanceService.validateSearchPerformance();
      const loadTestResult = await this.performanceService.validateUnderLoad({
        concurrent_users: this.config.concurrent_users,
        test_duration_seconds: this.config.test_duration_seconds,
        queries_per_user: 10,
        ramp_up_seconds: 5,
        dataset_size: 'medium',
        query_complexity: 'moderate'
      });

      const benchmarks = await this.performanceService.runPerformanceBenchmark(['medium']);

      // Create current baseline
      const currentBaseline: PerformanceBaseline = {
        commit_hash: commitHash,
        branch: branch,
        timestamp: new Date(),
        avg_response_time_ms: validationResult.avg_response_time_ms,
        p95_response_time_ms: loadTestResult.p95_response_time_ms,
        p99_response_time_ms: benchmarks[0]?.p99_response_time_ms || 0,
        throughput_qps: loadTestResult.throughput_qps,
        error_rate: loadTestResult.error_rate,
        memory_usage_mb: benchmarks[0]?.memory_usage_mb || 0,
        test_count: validationResult.results.length + loadTestResult.results.length
      };

      // Check against baseline if enabled
      let baselineComparison: CICDTestResult['baseline_comparison'];
      let regressionDetected = false;

      if (this.config.baseline_comparison_enabled) {
        const previousBaseline = this.loadBaseline();
        if (previousBaseline) {
          const regressionPercent = this.calculateRegressionPercent(previousBaseline, currentBaseline);
          regressionDetected = Math.abs(regressionPercent) > this.config.max_acceptable_regression_percent;

          baselineComparison = {
            baseline: previousBaseline,
            current: currentBaseline,
            regression_percent: regressionPercent
          };
        }
      }

      // Analyze deployment gates
      const deploymentGates = this.evaluateDeploymentGates(currentBaseline, loadTestResult);
      const blockingIssues = deploymentGates.filter(gate => !gate.passed && gate.blocking).map(gate => gate.message);
      const warnings = deploymentGates.filter(gate => !gate.passed && !gate.blocking).map(gate => gate.message);

      // Determine if tests passed
      const performanceTestsPassed =
        validationResult.overall_compliance &&
        loadTestResult.meets_requirements &&
        blockingIssues.length === 0 &&
        (!this.config.fail_on_regression || !regressionDetected);

      // Generate recommendations
      const recommendations = [
        ...validationResult.recommendations,
        ...this.generateCICDRecommendations(currentBaseline, baselineComparison)
      ];

      const result: CICDTestResult = {
        pipeline_id: pipelineId,
        commit_hash: commitHash,
        branch: branch,
        timestamp: new Date(),
        performance_tests_passed: performanceTestsPassed,
        regression_detected: regressionDetected,
        baseline_comparison: baselineComparison,
        detailed_results: [...validationResult.results, ...loadTestResult.results],
        benchmarks,
        blocking_issues: blockingIssues,
        warnings,
        recommendations
      };

      // Save baseline for future comparisons
      if (performanceTestsPassed && branch === 'main') {
        this.saveBaseline(currentBaseline);
      }

      // Generate CI/CD artifacts
      await this.generateCICDArtifacts(result);

      const duration = Date.now() - startTime;

      SentryUtils.addBreadcrumb('CI/CD performance validation completed', {
        pipeline_id: pipelineId,
        commit_hash: commitHash,
        performance_tests_passed: performanceTestsPassed,
        regression_detected: regressionDetected,
        blocking_issues: blockingIssues.length,
        warnings: warnings.length,
        duration_ms: duration
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      SentryUtils.captureError(error as Error, {
        pipeline_id: pipelineId,
        commit_hash: commitHash,
        branch: branch,
        duration_ms: duration
      });

      throw new VectorSearchError(
        `CI/CD performance validation failed: ${(error as Error).message}`,
        { pipeline_id: pipelineId, commit_hash: commitHash }
      );
    }
  }

  /**
   * Generate performance budget check for deployment
   */
  async checkPerformanceBudget(
    currentMetrics: {
      response_time_ms: number;
      throughput_qps: number;
      error_rate: number;
      memory_usage_mb: number;
    }
  ): Promise<{
    budget_passed: boolean;
    violations: Array<{
      metric: string;
      budget: number;
      actual: number;
      violation_percent: number;
    }>;
  }> {
    const budgets = {
      response_time_ms: this.config.target_response_time_ms,
      throughput_qps: this.config.min_throughput_qps,
      error_rate: this.config.max_error_rate_percent / 100,
      memory_usage_mb: 512 // 512MB budget
    };

    const violations: Array<{
      metric: string;
      budget: number;
      actual: number;
      violation_percent: number;
    }> = [];

    // Check response time budget
    if (currentMetrics.response_time_ms > budgets.response_time_ms) {
      violations.push({
        metric: 'response_time_ms',
        budget: budgets.response_time_ms,
        actual: currentMetrics.response_time_ms,
        violation_percent: ((currentMetrics.response_time_ms - budgets.response_time_ms) / budgets.response_time_ms) * 100
      });
    }

    // Check throughput budget
    if (currentMetrics.throughput_qps < budgets.throughput_qps) {
      violations.push({
        metric: 'throughput_qps',
        budget: budgets.throughput_qps,
        actual: currentMetrics.throughput_qps,
        violation_percent: ((budgets.throughput_qps - currentMetrics.throughput_qps) / budgets.throughput_qps) * 100
      });
    }

    // Check error rate budget
    if (currentMetrics.error_rate > budgets.error_rate) {
      violations.push({
        metric: 'error_rate',
        budget: budgets.error_rate,
        actual: currentMetrics.error_rate,
        violation_percent: ((currentMetrics.error_rate - budgets.error_rate) / budgets.error_rate) * 100
      });
    }

    // Check memory usage budget
    if (currentMetrics.memory_usage_mb > budgets.memory_usage_mb) {
      violations.push({
        metric: 'memory_usage_mb',
        budget: budgets.memory_usage_mb,
        actual: currentMetrics.memory_usage_mb,
        violation_percent: ((currentMetrics.memory_usage_mb - budgets.memory_usage_mb) / budgets.memory_usage_mb) * 100
      });
    }

    return {
      budget_passed: violations.length === 0,
      violations
    };
  }

  /**
   * Generate GitHub Actions performance summary
   */
  generateGitHubActionsSummary(result: CICDTestResult): string {
    const status = result.performance_tests_passed ? '✅' : '❌';
    const regressionIcon = result.regression_detected ? '⚠️' : '✅';

    let summary = `# ${status} Performance Test Results\n\n`;

    // Summary section
    summary += `## Summary\n`;
    summary += `- **Status**: ${result.performance_tests_passed ? 'PASSED' : 'FAILED'}\n`;
    summary += `- **Regression Detected**: ${regressionIcon} ${result.regression_detected ? 'YES' : 'NO'}\n`;
    summary += `- **Total Tests**: ${result.detailed_results.length}\n`;
    summary += `- **Blocking Issues**: ${result.blocking_issues.length}\n`;
    summary += `- **Warnings**: ${result.warnings.length}\n\n`;

    // Performance metrics
    if (result.benchmarks.length > 0) {
      const benchmark = result.benchmarks[0];
      summary += `## Performance Metrics\n`;
      summary += `| Metric | Value | Target | Status |\n`;
      summary += `|--------|-------|--------|---------|\n`;
      summary += `| Avg Response Time | ${benchmark.avg_response_time_ms.toFixed(1)}ms | <${this.config.target_response_time_ms}ms | ${benchmark.avg_response_time_ms <= this.config.target_response_time_ms ? '✅' : '❌'} |\n`;
      summary += `| P95 Response Time | ${benchmark.p95_response_time_ms.toFixed(1)}ms | <${this.config.target_response_time_ms * 1.5}ms | ${benchmark.p95_response_time_ms <= this.config.target_response_time_ms * 1.5 ? '✅' : '❌'} |\n`;
      summary += `| P99 Response Time | ${benchmark.p99_response_time_ms.toFixed(1)}ms | <${this.config.target_response_time_ms * 2}ms | ${benchmark.p99_response_time_ms <= this.config.target_response_time_ms * 2 ? '✅' : '❌'} |\n`;
      summary += `| Throughput | ${benchmark.throughput_qps.toFixed(1)} QPS | >${this.config.min_throughput_qps} QPS | ${benchmark.throughput_qps >= this.config.min_throughput_qps ? '✅' : '❌'} |\n`;
      summary += `| Memory Usage | ${benchmark.memory_usage_mb.toFixed(1)}MB | <512MB | ${benchmark.memory_usage_mb <= 512 ? '✅' : '❌'} |\n\n`;
    }

    // Baseline comparison
    if (result.baseline_comparison) {
      const comparison = result.baseline_comparison;
      summary += `## Baseline Comparison\n`;
      summary += `- **Previous Commit**: ${comparison.baseline.commit_hash.substring(0, 8)}\n`;
      summary += `- **Performance Change**: ${comparison.regression_percent > 0 ? '+' : ''}${comparison.regression_percent.toFixed(1)}%\n`;
      summary += `- **Acceptable Threshold**: ±${this.config.max_acceptable_regression_percent}%\n\n`;
    }

    // Issues and warnings
    if (result.blocking_issues.length > 0) {
      summary += `## ❌ Blocking Issues\n`;
      result.blocking_issues.forEach((issue, index) => {
        summary += `${index + 1}. ${issue}\n`;
      });
      summary += `\n`;
    }

    if (result.warnings.length > 0) {
      summary += `## ⚠️ Warnings\n`;
      result.warnings.forEach((warning, index) => {
        summary += `${index + 1}. ${warning}\n`;
      });
      summary += `\n`;
    }

    // Recommendations
    if (result.recommendations.length > 0) {
      summary += `## 💡 Recommendations\n`;
      result.recommendations.forEach((rec, index) => {
        summary += `${index + 1}. ${rec}\n`;
      });
      summary += `\n`;
    }

    // Detailed results link
    summary += `## 📊 Detailed Results\n`;
    summary += `Performance test artifacts have been generated and are available in the pipeline artifacts.\n`;

    return summary;
  }

  /**
   * Export performance data for external tools
   */
  exportPerformanceData(result: CICDTestResult): {
    junit_xml: string;
    performance_json: string;
    metrics_prometheus: string;
  } {
    // Generate JUnit XML for CI/CD integration
    const junitXml = this.generateJUnitXML(result);

    // Generate JSON for external analysis
    const performanceJson = JSON.stringify({
      pipeline_id: result.pipeline_id,
      commit_hash: result.commit_hash,
      branch: result.branch,
      timestamp: result.timestamp,
      summary: {
        passed: result.performance_tests_passed,
        regression_detected: result.regression_detected,
        total_tests: result.detailed_results.length,
        avg_response_time_ms: result.benchmarks[0]?.avg_response_time_ms || 0,
        throughput_qps: result.benchmarks[0]?.throughput_qps || 0
      },
      detailed_results: result.detailed_results,
      benchmarks: result.benchmarks
    }, null, 2);

    // Generate Prometheus metrics
    const prometheusMetrics = this.generatePrometheusMetrics(result);

    return {
      junit_xml: junitXml,
      performance_json: performanceJson,
      metrics_prometheus: prometheusMetrics
    };
  }

  // Private helper methods

  private evaluateDeploymentGates(
    baseline: PerformanceBaseline,
    loadTestResult: any
  ): DeploymentGate[] {
    const gates: DeploymentGate[] = [];

    // Response time gate
    gates.push({
      gate_id: 'response_time',
      gate_type: 'performance',
      threshold_value: this.config.target_response_time_ms,
      current_value: baseline.avg_response_time_ms,
      passed: baseline.avg_response_time_ms <= this.config.target_response_time_ms,
      blocking: true,
      message: `Average response time: ${baseline.avg_response_time_ms.toFixed(1)}ms (target: <${this.config.target_response_time_ms}ms)`
    });

    // Throughput gate
    gates.push({
      gate_id: 'throughput',
      gate_type: 'throughput',
      threshold_value: this.config.min_throughput_qps,
      current_value: baseline.throughput_qps,
      passed: baseline.throughput_qps >= this.config.min_throughput_qps,
      blocking: true,
      message: `Throughput: ${baseline.throughput_qps.toFixed(1)} QPS (target: >${this.config.min_throughput_qps} QPS)`
    });

    // Error rate gate
    gates.push({
      gate_id: 'error_rate',
      gate_type: 'error_rate',
      threshold_value: this.config.max_error_rate_percent / 100,
      current_value: baseline.error_rate,
      passed: baseline.error_rate <= this.config.max_error_rate_percent / 100,
      blocking: true,
      message: `Error rate: ${(baseline.error_rate * 100).toFixed(2)}% (target: <${this.config.max_error_rate_percent}%)`
    });

    // Memory usage gate
    gates.push({
      gate_id: 'memory_usage',
      gate_type: 'memory',
      threshold_value: 512,
      current_value: baseline.memory_usage_mb,
      passed: baseline.memory_usage_mb <= 512,
      blocking: false,
      message: `Memory usage: ${baseline.memory_usage_mb.toFixed(1)}MB (target: <512MB)`
    });

    return gates;
  }

  private calculateRegressionPercent(
    baseline: PerformanceBaseline,
    current: PerformanceBaseline
  ): number {
    if (baseline.avg_response_time_ms === 0) return 0;
    return ((current.avg_response_time_ms - baseline.avg_response_time_ms) / baseline.avg_response_time_ms) * 100;
  }

  private generateCICDRecommendations(
    current: PerformanceBaseline,
    comparison?: CICDTestResult['baseline_comparison']
  ): string[] {
    const recommendations: string[] = [];

    if (current.avg_response_time_ms > this.config.target_response_time_ms) {
      recommendations.push('Response time exceeds target - consider index optimization');
    }

    if (current.throughput_qps < this.config.min_throughput_qps) {
      recommendations.push('Throughput below minimum - optimize query efficiency');
    }

    if (current.error_rate > this.config.max_error_rate_percent / 100) {
      recommendations.push('Error rate too high - investigate and fix query failures');
    }

    if (comparison && Math.abs(comparison.regression_percent) > this.config.max_acceptable_regression_percent) {
      recommendations.push(`Significant performance regression detected (${comparison.regression_percent.toFixed(1)}%)`);
    }

    return recommendations;
  }

  private loadBaseline(): PerformanceBaseline | null {
    try {
      if (existsSync(this.baselinePath)) {
        const data = readFileSync(this.baselinePath, 'utf8');
        const parsed = JSON.parse(data);
        return {
          ...parsed,
          timestamp: new Date(parsed.timestamp)
        };
      }
    } catch (error) {
      SentryUtils.captureError(error as Error, {
        operation: 'load_baseline',
        baseline_path: this.baselinePath
      });
    }
    return null;
  }

  private saveBaseline(baseline: PerformanceBaseline): void {
    try {
      writeFileSync(this.baselinePath, JSON.stringify(baseline, null, 2));
    } catch (error) {
      SentryUtils.captureError(error as Error, {
        operation: 'save_baseline',
        baseline_path: this.baselinePath
      });
    }
  }

  private async generateCICDArtifacts(result: CICDTestResult): Promise<void> {
    try {
      const exports = this.exportPerformanceData(result);
      const summary = this.generateGitHubActionsSummary(result);

      // Write artifacts to file system for CI/CD pickup
      writeFileSync('./performance-summary.md', summary);
      writeFileSync('./performance-results.xml', exports.junit_xml);
      writeFileSync('./performance-data.json', exports.performance_json);
      writeFileSync('./performance-metrics.txt', exports.metrics_prometheus);

    } catch (error) {
      SentryUtils.captureError(error as Error, {
        operation: 'generate_cicd_artifacts',
        pipeline_id: result.pipeline_id
      });
    }
  }

  private generateJUnitXML(result: CICDTestResult): string {
    const totalTests = result.detailed_results.length;
    const failures = result.detailed_results.filter(r => !r.success).length;
    const errors = result.blocking_issues.length;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<testsuite name="Performance Tests" tests="${totalTests}" failures="${failures}" errors="${errors}" time="${result.detailed_results.reduce((sum, r) => sum + r.response_time_ms, 0) / 1000}">\n`;

    result.detailed_results.forEach(test => {
      xml += `  <testcase classname="PerformanceTest" name="${test.query.replace(/[<>&"]/g, '')}" time="${test.response_time_ms / 1000}">\n`;
      if (!test.success) {
        xml += `    <failure message="${test.error_message?.replace(/[<>&"]/g, '') || 'Test failed'}" type="PerformanceFailure">${test.error_message || 'Unknown error'}</failure>\n`;
      }
      xml += `  </testcase>\n`;
    });

    xml += `</testsuite>`;
    return xml;
  }

  private generatePrometheusMetrics(result: CICDTestResult): string {
    const timestamp = Math.floor(result.timestamp.getTime() / 1000);
    let metrics = '';

    if (result.benchmarks.length > 0) {
      const benchmark = result.benchmarks[0];
      metrics += `# HELP vector_search_response_time_seconds Average response time for vector search operations\n`;
      metrics += `# TYPE vector_search_response_time_seconds gauge\n`;
      metrics += `vector_search_response_time_seconds{commit="${result.commit_hash}",branch="${result.branch}"} ${benchmark.avg_response_time_ms / 1000} ${timestamp}\n\n`;

      metrics += `# HELP vector_search_throughput_qps Queries per second throughput\n`;
      metrics += `# TYPE vector_search_throughput_qps gauge\n`;
      metrics += `vector_search_throughput_qps{commit="${result.commit_hash}",branch="${result.branch}"} ${benchmark.throughput_qps} ${timestamp}\n\n`;

      metrics += `# HELP vector_search_memory_usage_bytes Memory usage in bytes\n`;
      metrics += `# TYPE vector_search_memory_usage_bytes gauge\n`;
      metrics += `vector_search_memory_usage_bytes{commit="${result.commit_hash}",branch="${result.branch}"} ${benchmark.memory_usage_mb * 1024 * 1024} ${timestamp}\n\n`;
    }

    metrics += `# HELP vector_search_tests_passed_total Number of performance tests passed\n`;
    metrics += `# TYPE vector_search_tests_passed_total counter\n`;
    metrics += `vector_search_tests_passed_total{commit="${result.commit_hash}",branch="${result.branch}"} ${result.detailed_results.filter(r => r.success).length} ${timestamp}\n\n`;

    return metrics;
  }
}

export default CICDPerformanceIntegration;