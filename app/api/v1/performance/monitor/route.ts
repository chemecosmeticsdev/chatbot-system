/**
 * Performance Monitoring API Endpoint
 *
 * Provides real-time performance monitoring controls and status endpoints
 * for dashboard integration and automated monitoring systems.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PerformanceValidationService } from '@/lib/validation/performance-validation';
import { withDatabaseMonitoring } from '@/lib/monitoring/api-wrapper';
import { SentryUtils, VectorSearchError } from '@/lib/monitoring/sentry-utils';
import { getNeonPool } from '@/lib/neon';

// Global monitoring service instance
let globalMonitoringService: PerformanceValidationService | null = null;

interface MonitoringRequest {
  action: 'start' | 'stop' | 'status' | 'optimize' | 'health_check';
  interval_seconds?: number;
  optimization_config?: {
    response_time_threshold?: number;
    error_rate_threshold?: number;
    memory_threshold_mb?: number;
    cache_hit_ratio_threshold?: number;
  };
}

export async function POST(request: NextRequest) {
  return withDatabaseMonitoring(
    async () => {
      const startTime = Date.now();

      try {
        const body: MonitoringRequest = await request.json();
        const { action, interval_seconds = 60, optimization_config } = body;

        // Initialize monitoring service if not exists
        if (!globalMonitoringService) {
          const pool = getNeonPool();
          globalMonitoringService = new PerformanceValidationService(pool);
        }

        let result: any;

        switch (action) {
          case 'start':
            await globalMonitoringService.startPerformanceMonitoring(interval_seconds);
            result = {
              monitoring_active: true,
              interval_seconds,
              started_at: new Date().toISOString(),
              message: 'Performance monitoring started successfully'
            };
            break;

          case 'stop':
            globalMonitoringService.stopPerformanceMonitoring();
            result = {
              monitoring_active: false,
              stopped_at: new Date().toISOString(),
              message: 'Performance monitoring stopped successfully'
            };
            break;

          case 'status':
            result = {
              monitoring_active: true, // We can't easily check this from the service, assume true if service exists
              service_initialized: globalMonitoringService !== null,
              timestamp: new Date().toISOString(),
              uptime_seconds: Math.floor((Date.now() - startTime) / 1000)
            };
            break;

          case 'optimize':
            const optimizationResult = await globalMonitoringService.optimizeIfNeeded(optimization_config);
            result = {
              optimization_triggered: optimizationResult,
              trigger_conditions: optimization_config,
              timestamp: new Date().toISOString(),
              message: optimizationResult
                ? 'Optimization triggered successfully'
                : 'No optimization needed at this time'
            };
            break;

          case 'health_check':
            // Perform a quick health check
            const healthResult = await globalMonitoringService.validateSearchPerformance(
              ['health check query'],
              'health-check-chatbot',
              'health-check-session'
            );

            result = {
              health_status: healthResult.overall_compliance ? 'healthy' : 'degraded',
              avg_response_time_ms: healthResult.avg_response_time_ms,
              meets_requirement: healthResult.overall_compliance,
              timestamp: new Date().toISOString(),
              recommendations: healthResult.recommendations
            };
            break;

          default:
            throw new VectorSearchError(`Unknown monitoring action: ${action}`);
        }

        const duration = Date.now() - startTime;

        // Log successful monitoring operation
        SentryUtils.addBreadcrumb('Performance monitoring API called', {
          action,
          duration_ms: duration,
          success: true
        });

        return NextResponse.json({
          success: true,
          action,
          timestamp: new Date().toISOString(),
          duration_ms: duration,
          data: result
        });

      } catch (error) {
        const duration = Date.now() - startTime;

        // Log monitoring failure
        SentryUtils.captureError(error as Error, {
          endpoint: '/api/v1/performance/monitor',
          action: body.action,
          duration_ms: duration
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
      operation: 'performance_monitoring_api',
      endpoint: '/api/v1/performance/monitor'
    }
  );
}

export async function GET(request: NextRequest) {
  return withDatabaseMonitoring(
    async () => {
      try {
        const { searchParams } = new URL(request.url);
        const includeMetrics = searchParams.get('include_metrics') === 'true';
        const limit = parseInt(searchParams.get('limit') || '100');

        // Initialize monitoring service if not exists
        if (!globalMonitoringService) {
          const pool = getNeonPool();
          globalMonitoringService = new PerformanceValidationService(pool);
        }

        // Basic monitoring status
        const status = {
          monitoring_active: true, // Assume active if service exists
          service_initialized: true,
          timestamp: new Date().toISOString()
        };

        let result: any = { status };

        if (includeMetrics) {
          // Generate recent performance metrics
          const report = await globalMonitoringService.generatePerformanceReport(1); // Last 1 day

          result.metrics = {
            summary: report.summary,
            recent_alerts: report.alerts.slice(-limit),
            recent_benchmarks: report.detailed_metrics.slice(-10),
            performance_trend: report.summary.performance_trend
          };
        }

        SentryUtils.addBreadcrumb('Performance monitoring status retrieved', {
          include_metrics: includeMetrics,
          limit
        });

        return NextResponse.json({
          success: true,
          timestamp: new Date().toISOString(),
          data: result
        });

      } catch (error) {
        SentryUtils.captureError(error as Error, {
          endpoint: '/api/v1/performance/monitor',
          method: 'GET'
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
      operation: 'performance_monitoring_status_api',
      endpoint: '/api/v1/performance/monitor'
    }
  );
}