/**
 * Performance Validation API Endpoint
 *
 * Provides REST API access to performance validation functionality
 * for manual testing, CI/CD integration, and monitoring dashboards.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PerformanceValidationService } from '@/lib/validation/performance-validation';
import { CICDPerformanceIntegration } from '@/lib/validation/ci-cd-integration';
import { withDatabaseMonitoring } from '@/lib/monitoring/api-wrapper';
import { SentryUtils, VectorSearchError } from '@/lib/monitoring/sentry-utils';
import { getNeonPool } from '@/lib/neon';

interface ValidationRequest {
  test_type: 'quick' | 'comprehensive' | 'load_test' | 'ci_cd';
  queries?: string[];
  chatbot_id?: string;
  session_id?: string;
  load_test_config?: {
    concurrent_users?: number;
    test_duration_seconds?: number;
    query_complexity?: 'simple' | 'moderate' | 'complex';
  };
  ci_cd_config?: {
    pipeline_id?: string;
    commit_hash?: string;
    branch?: string;
  };
}

export async function POST(request: NextRequest) {
  return withDatabaseMonitoring(
    async () => {
      const startTime = Date.now();
      let body: ValidationRequest | undefined;

      try {
        body = await request.json();
        if (!body) {
          throw new Error('Request body is required');
        }
        const {
          test_type,
          queries = [
            'authentication setup guide',
            'database configuration',
            'user management',
            'API integration',
            'troubleshooting common issues'
          ],
          chatbot_id = 'performance-test-chatbot',
          session_id = `perf-test-${Date.now()}`,
          load_test_config,
          ci_cd_config
        } = body;

        // Initialize performance validation service
        const pool = getNeonPool();
        const performanceService = new PerformanceValidationService(pool);

        let result: any;

        switch (test_type) {
          case 'quick':
            result = await performanceService.validateSearchPerformance(
              queries.slice(0, 3), // Quick test with 3 queries
              chatbot_id,
              session_id
            );
            break;

          case 'comprehensive':
            const [validationResult, benchmarks] = await Promise.all([
              performanceService.validateSearchPerformance(queries, chatbot_id, session_id),
              performanceService.runPerformanceBenchmark(['small', 'medium'])
            ]);

            result = {
              validation: validationResult,
              benchmarks,
              performance_report: await performanceService.generatePerformanceReport(1) // Last 1 day
            };
            break;

          case 'load_test':
            const loadConfig = {
              concurrent_users: load_test_config?.concurrent_users || 5,
              test_duration_seconds: load_test_config?.test_duration_seconds || 30,
              queries_per_user: 10,
              ramp_up_seconds: 5,
              dataset_size: 'medium' as const,
              query_complexity: load_test_config?.query_complexity || 'moderate'
            };

            result = await performanceService.validateUnderLoad(loadConfig);
            break;

          case 'ci_cd':
            const cicdIntegration = new CICDPerformanceIntegration(performanceService);

            const pipelineId = ci_cd_config?.pipeline_id || `manual-${Date.now()}`;
            const commitHash = ci_cd_config?.commit_hash || 'unknown';
            const branch = ci_cd_config?.branch || 'main';

            const cicdResult = await cicdIntegration.runCICDPerformanceValidation(
              pipelineId,
              commitHash,
              branch
            );

            // Generate additional CI/CD artifacts
            const summary = cicdIntegration.generateGitHubActionsSummary(cicdResult);
            const exports = cicdIntegration.exportPerformanceData(cicdResult);

            result = {
              ci_cd_result: cicdResult,
              github_summary: summary,
              junit_xml: exports.junit_xml,
              performance_json: exports.performance_json,
              prometheus_metrics: exports.metrics_prometheus
            };
            break;

          default:
            throw new VectorSearchError(`Unknown test type: ${test_type}`);
        }

        const duration = Date.now() - startTime;

        // Log successful validation
        SentryUtils.addBreadcrumb('Performance validation API called', {
          test_type,
          chatbot_id,
          session_id,
          queries_count: queries.length,
          duration_ms: duration,
          success: true
        });

        return NextResponse.json({
          success: true,
          test_type,
          timestamp: new Date().toISOString(),
          duration_ms: duration,
          data: result
        });

      } catch (error) {
        const duration = Date.now() - startTime;

        // Log validation failure
        SentryUtils.captureError(error as Error, {
          operation: 'performance_validation',
          additionalData: {
            endpoint: '/api/v1/performance/validate',
            duration_ms: duration,
            request_body: body
          }
        });

        return NextResponse.json({
          success: false,
          error: {
            message: (error as Error).message,
            type: error instanceof VectorSearchError ? 'VectorSearchError' : 'UnknownError',
            timestamp: new Date().toISOString(),
            duration_ms: duration
          }
        }, { status: 500 });
      }
    },
    {
      operation: 'performance_validation_api',
      additionalData: {
        endpoint: '/api/v1/performance/validate'
      }
    }
  );
}

export async function GET(request: NextRequest) {
  return withDatabaseMonitoring(
    async () => {
      try {
        const { searchParams } = new URL(request.url);
        const reportDays = parseInt(searchParams.get('days') || '7');
        const includeOptimization = searchParams.get('include_optimization') === 'true';

        // Initialize performance validation service
        const pool = getNeonPool();
        const performanceService = new PerformanceValidationService(pool);

        // Generate performance report
        const report = await performanceService.generatePerformanceReport(
          reportDays,
          includeOptimization
        );

        SentryUtils.addBreadcrumb('Performance report generated', {
          report_id: report.report_id,
          period_days: reportDays,
          include_optimization: includeOptimization
        });

        return NextResponse.json({
          success: true,
          timestamp: new Date().toISOString(),
          data: report
        });

      } catch (error) {
        SentryUtils.captureError(error as Error, {
          operation: 'performance_validation_get',
          additionalData: {
            endpoint: '/api/v1/performance/validate',
            method: 'GET'
          }
        });

        return NextResponse.json({
          success: false,
          error: {
            message: (error as Error).message,
            type: error instanceof VectorSearchError ? 'VectorSearchError' : 'UnknownError',
            timestamp: new Date().toISOString()
          }
        }, { status: 500 });
      }
    },
    {
      operation: 'performance_report_api',
      additionalData: {
        endpoint: '/api/v1/performance/validate'
      }
    }
  );
}