/**
 * Vector Database Optimization Service
 *
 * Comprehensive optimization and monitoring service for pgvector database operations.
 * Targets <200ms performance requirement with automated tuning and maintenance.
 */

import { Client, Pool } from 'pg';
import { withDatabaseMonitoring } from '@/lib/monitoring/api-wrapper';
import { SentryUtils, VectorSearchError } from '@/lib/monitoring/sentry-utils';
import { getNeonPool } from '@/lib/neon';

export interface IndexPerformanceMetrics {
  index_name: string;
  index_type: 'ivfflat' | 'hnsw' | 'btree';
  table_name: string;
  size_mb: number;
  scan_count: number;
  tuple_read: number;
  tuple_fetch: number;
  hit_ratio: number;
  avg_query_time_ms: number;
  last_vacuum: Date | null;
  last_analyze: Date | null;
  fragmentation_ratio: number;
}

export interface QueryPerformanceData {
  query_hash: string;
  query_text: string;
  calls: number;
  total_time_ms: number;
  avg_time_ms: number;
  min_time_ms: number;
  max_time_ms: number;
  rows_returned: number;
  shared_blks_hit: number;
  shared_blks_read: number;
  cache_hit_ratio: number;
}

export interface VectorIndexConfiguration {
  index_type: 'ivfflat' | 'hnsw';
  distance_function: 'vector_cosine_ops' | 'vector_l2_ops' | 'vector_ip_ops';
  // IVFFlat specific parameters
  lists?: number;
  // HNSW specific parameters
  m?: number;
  ef_construction?: number;
  ef_search?: number;
}

export interface OptimizationRecommendation {
  type: 'index_rebuild' | 'parameter_tune' | 'query_rewrite' | 'maintenance' | 'memory_adjust';
  priority: 'high' | 'medium' | 'low';
  description: string;
  estimated_improvement: string;
  implementation_sql?: string;
  rollback_sql?: string;
  estimated_downtime_minutes?: number;
  cost_benefit_score: number;
}

export interface PerformanceMonitoringData {
  timestamp: Date;
  avg_query_time_ms: number;
  p95_query_time_ms: number;
  p99_query_time_ms: number;
  queries_per_second: number;
  cache_hit_ratio: number;
  connection_pool_usage: number;
  memory_usage_mb: number;
  index_size_mb: number;
  active_connections: number;
  slow_queries_count: number;
}

export interface MaintenanceTask {
  task_id: string;
  task_type: 'vacuum' | 'analyze' | 'reindex' | 'update_stats' | 'cleanup';
  table_name: string;
  estimated_duration_minutes: number;
  last_run: Date | null;
  next_scheduled: Date;
  auto_run: boolean;
  priority: number;
}

export class VectorOptimizationService {
  private pool: Pool;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private performanceHistory: PerformanceMonitoringData[] = [];
  private readonly maxHistoryEntries = 1000;

  constructor(pool?: Pool) {
    this.pool = pool || getNeonPool();
  }

  /**
   * Analyze current vector index performance and efficiency
   */
  async analyzeIndexPerformance(): Promise<IndexPerformanceMetrics[]> {
    return withDatabaseMonitoring(
      async () => {
        const query = `
          WITH index_stats AS (
            SELECT
              schemaname,
              tablename,
              indexname,
              idx_scan,
              idx_tup_read,
              idx_tup_fetch
            FROM pg_stat_user_indexes
            WHERE indexname LIKE '%embedding%' OR indexname LIKE '%vector%'
          ),
          index_size AS (
            SELECT
              schemaname,
              tablename,
              indexname,
              pg_size_pretty(pg_relation_size(indexrelid::regclass)) as size_pretty,
              pg_relation_size(indexrelid::regclass) / 1024 / 1024 as size_mb
            FROM pg_stat_user_indexes
            WHERE indexname LIKE '%embedding%' OR indexname LIKE '%vector%'
          ),
          table_stats AS (
            SELECT
              schemaname,
              tablename,
              last_vacuum,
              last_analyze,
              n_tup_ins + n_tup_upd + n_tup_del as total_modifications
            FROM pg_stat_user_tables
          ),
          query_performance AS (
            SELECT
              'vector_search' as operation,
              AVG(EXTRACT(MILLISECONDS FROM (clock_timestamp() - query_start))) as avg_time_ms
            FROM pg_stat_activity
            WHERE query LIKE '%<=>%' AND state = 'active'
          )
          SELECT
            s.indexname as index_name,
            CASE
              WHEN s.indexname LIKE '%ivfflat%' THEN 'ivfflat'
              WHEN s.indexname LIKE '%hnsw%' THEN 'hnsw'
              ELSE 'btree'
            END as index_type,
            s.tablename as table_name,
            COALESCE(sz.size_mb, 0) as size_mb,
            COALESCE(s.idx_scan, 0) as scan_count,
            COALESCE(s.idx_tup_read, 0) as tuple_read,
            COALESCE(s.idx_tup_fetch, 0) as tuple_fetch,
            CASE
              WHEN s.idx_tup_read > 0 THEN (s.idx_tup_fetch::float / s.idx_tup_read * 100)
              ELSE 0
            END as hit_ratio,
            COALESCE(qp.avg_time_ms, 0) as avg_query_time_ms,
            ts.last_vacuum,
            ts.last_analyze,
            CASE
              WHEN ts.total_modifications > 0 AND s.idx_scan > 0
              THEN (ts.total_modifications::float / s.idx_scan)
              ELSE 0
            END as fragmentation_ratio
          FROM index_stats s
          LEFT JOIN index_size sz ON s.indexname = sz.indexname
          LEFT JOIN table_stats ts ON s.tablename = ts.tablename
          LEFT JOIN query_performance qp ON true
          ORDER BY s.idx_scan DESC, sz.size_mb DESC;
        `;

        const result = await this.pool.query(query);

        SentryUtils.addBreadcrumb('Vector index performance analyzed', {
          indexes_found: result.rows.length,
          operation: 'analyzeIndexPerformance'
        });

        return result.rows.map(row => ({
          index_name: row.index_name,
          index_type: row.index_type,
          table_name: row.table_name,
          size_mb: parseFloat(row.size_mb) || 0,
          scan_count: parseInt(row.scan_count) || 0,
          tuple_read: parseInt(row.tuple_read) || 0,
          tuple_fetch: parseInt(row.tuple_fetch) || 0,
          hit_ratio: parseFloat(row.hit_ratio) || 0,
          avg_query_time_ms: parseFloat(row.avg_query_time_ms) || 0,
          last_vacuum: row.last_vacuum ? new Date(row.last_vacuum) : null,
          last_analyze: row.last_analyze ? new Date(row.last_analyze) : null,
          fragmentation_ratio: parseFloat(row.fragmentation_ratio) || 0
        }));
      },
      {
        operation: 'analyzeIndexPerformance',
        table: 'pg_stat_user_indexes',
        additionalData: { analysis_type: 'comprehensive' }
      }
    );
  }

  /**
   * Optimize vector indexes based on current performance and usage patterns
   */
  async optimizeVectorIndexes(
    tableName: string = 'document_chunks',
    config?: Partial<VectorIndexConfiguration>
  ): Promise<OptimizationRecommendation[]> {
    return withDatabaseMonitoring(
      async () => {
        const recommendations: OptimizationRecommendation[] = [];

        // Get current index performance
        const indexMetrics = await this.analyzeIndexPerformance();
        const tableIndexes = indexMetrics.filter(idx => idx.table_name === tableName);

        // Get table statistics
        const tableStats = await this.getTableStatistics(tableName);

        for (const index of tableIndexes) {
          // Check if index needs rebuilding
          if (index.fragmentation_ratio > 0.3 || index.avg_query_time_ms > 200) {
            recommendations.push({
              type: 'index_rebuild',
              priority: index.avg_query_time_ms > 300 ? 'high' : 'medium',
              description: `Rebuild ${index.index_name} - fragmentation: ${index.fragmentation_ratio.toFixed(2)}, avg query time: ${index.avg_query_time_ms.toFixed(2)}ms`,
              estimated_improvement: `${Math.min(50, index.fragmentation_ratio * 100).toFixed(0)}% query time reduction`,
              implementation_sql: `REINDEX INDEX CONCURRENTLY ${index.index_name};`,
              rollback_sql: undefined, // Reindex is safe, no rollback needed
              estimated_downtime_minutes: 0, // CONCURRENTLY = no downtime
              cost_benefit_score: this.calculateCostBenefitScore(index, 'rebuild')
            });
          }

          // Check for optimal list count in IVFFlat indexes
          if (index.index_type === 'ivfflat' && tableStats.row_count > 0) {
            const optimalLists = Math.max(1, Math.min(32768, Math.floor(tableStats.row_count / 1000)));
            const currentLists = await this.getCurrentIVFListCount(index.index_name);

            if (Math.abs(currentLists - optimalLists) > optimalLists * 0.2) {
              const newIndexName = `${index.index_name}_optimized_${Date.now()}`;
              recommendations.push({
                type: 'parameter_tune',
                priority: 'medium',
                description: `Optimize IVFFlat lists parameter: current=${currentLists}, optimal=${optimalLists}`,
                estimated_improvement: '10-30% query performance improvement',
                implementation_sql: `
                  CREATE INDEX CONCURRENTLY ${newIndexName}
                  ON ${tableName} USING ivfflat (embedding ${config?.distance_function || 'vector_cosine_ops'})
                  WITH (lists = ${optimalLists});
                  DROP INDEX ${index.index_name};
                  ALTER INDEX ${newIndexName} RENAME TO ${index.index_name};
                `,
                rollback_sql: `
                  CREATE INDEX CONCURRENTLY ${index.index_name}_backup
                  ON ${tableName} USING ivfflat (embedding ${config?.distance_function || 'vector_cosine_ops'})
                  WITH (lists = ${currentLists});
                `,
                estimated_downtime_minutes: 2,
                cost_benefit_score: this.calculateCostBenefitScore(index, 'parameter_tune')
              });
            }
          }

          // Check if we should consider HNSW instead of IVFFlat
          if (index.index_type === 'ivfflat' && tableStats.row_count > 10000 && index.avg_query_time_ms > 150) {
            const hnswIndexName = `${index.index_name}_hnsw`;
            recommendations.push({
              type: 'index_rebuild',
              priority: 'medium',
              description: `Consider HNSW index for better performance on large dataset (${tableStats.row_count} rows)`,
              estimated_improvement: '20-40% query performance improvement for large datasets',
              implementation_sql: `
                CREATE INDEX CONCURRENTLY ${hnswIndexName}
                ON ${tableName} USING hnsw (embedding ${config?.distance_function || 'vector_cosine_ops'})
                WITH (m = ${config?.m || 16}, ef_construction = ${config?.ef_construction || 64});
              `,
              rollback_sql: `DROP INDEX IF EXISTS ${hnswIndexName};`,
              estimated_downtime_minutes: 0,
              cost_benefit_score: this.calculateCostBenefitScore(index, 'hnsw_upgrade')
            });
          }
        }

        // Check for missing indexes
        if (tableIndexes.length === 0) {
          recommendations.push({
            type: 'index_rebuild',
            priority: 'high',
            description: 'No vector indexes found - creating optimized IVFFlat index',
            estimated_improvement: '90%+ query performance improvement',
            implementation_sql: `
              CREATE INDEX CONCURRENTLY idx_${tableName}_embedding_ivfflat
              ON ${tableName} USING ivfflat (embedding ${config?.distance_function || 'vector_cosine_ops'})
              WITH (lists = ${Math.max(1, Math.floor(tableStats.row_count / 1000))});
            `,
            rollback_sql: `DROP INDEX IF EXISTS idx_${tableName}_embedding_ivfflat;`,
            estimated_downtime_minutes: 0,
            cost_benefit_score: 100
          });
        }

        // Check for maintenance needs
        for (const index of tableIndexes) {
          const daysSinceVacuum = index.last_vacuum ?
            (Date.now() - index.last_vacuum.getTime()) / (1000 * 60 * 60 * 24) : 999;
          const daysSinceAnalyze = index.last_analyze ?
            (Date.now() - index.last_analyze.getTime()) / (1000 * 60 * 60 * 24) : 999;

          if (daysSinceVacuum > 7) {
            recommendations.push({
              type: 'maintenance',
              priority: 'low',
              description: `Table ${index.table_name} needs vacuum (${daysSinceVacuum.toFixed(0)} days since last vacuum)`,
              estimated_improvement: '5-10% query performance improvement',
              implementation_sql: `VACUUM ANALYZE ${index.table_name};`,
              rollback_sql: undefined,
              estimated_downtime_minutes: 1,
              cost_benefit_score: 15
            });
          }

          if (daysSinceAnalyze > 3) {
            recommendations.push({
              type: 'maintenance',
              priority: 'medium',
              description: `Table ${index.table_name} needs analyze (${daysSinceAnalyze.toFixed(0)} days since last analyze)`,
              estimated_improvement: '5-15% query planning improvement',
              implementation_sql: `ANALYZE ${index.table_name};`,
              rollback_sql: undefined,
              estimated_downtime_minutes: 0,
              cost_benefit_score: 20
            });
          }
        }

        // Sort recommendations by priority and cost-benefit score
        recommendations.sort((a, b) => {
          const priorityWeight = { high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return b.cost_benefit_score - a.cost_benefit_score;
        });

        SentryUtils.addBreadcrumb('Vector index optimization analyzed', {
          table_name: tableName,
          recommendations_count: recommendations.length,
          high_priority: recommendations.filter(r => r.priority === 'high').length,
          operation: 'optimizeVectorIndexes'
        });

        return recommendations;
      },
      {
        operation: 'optimizeVectorIndexes',
        table: tableName,
        additionalData: { config }
      }
    );
  }

  /**
   * Start real-time performance monitoring
   */
  startPerformanceMonitoring(intervalMinutes: number = 5): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectPerformanceMetrics();
        this.performanceHistory.push(metrics);

        // Keep only recent history
        if (this.performanceHistory.length > this.maxHistoryEntries) {
          this.performanceHistory.shift();
        }

        // Check for performance degradation
        await this.checkPerformanceAlerts(metrics);

        SentryUtils.addBreadcrumb('Performance metrics collected', {
          avg_query_time_ms: metrics.avg_query_time_ms,
          cache_hit_ratio: metrics.cache_hit_ratio,
          active_connections: metrics.active_connections
        });
      } catch (error) {
        SentryUtils.captureError(
          new VectorSearchError(`Performance monitoring failed: ${(error as Error).message}`),
          { operation: 'performanceMonitoring' }
        );
      }
    }, intervalMinutes * 60 * 1000);

    SentryUtils.addBreadcrumb('Performance monitoring started', {
      interval_minutes: intervalMinutes,
      operation: 'startPerformanceMonitoring'
    });
  }

  /**
   * Stop performance monitoring
   */
  stopPerformanceMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;

      SentryUtils.addBreadcrumb('Performance monitoring stopped', {
        operation: 'stopPerformanceMonitoring'
      });
    }
  }

  /**
   * Get current performance monitoring data
   */
  getPerformanceHistory(hours: number = 24): PerformanceMonitoringData[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.performanceHistory.filter(entry => entry.timestamp >= cutoffTime);
  }

  /**
   * Optimize specific vector queries
   */
  async optimizeQuery(
    queryText: string,
    parameters?: any[]
  ): Promise<{
    originalPlan: any;
    optimizedQuery: string;
    expectedImprovement: string;
    explanation: string;
  }> {
    return withDatabaseMonitoring(
      async () => {
        // Get current query plan
        const explainResult = await this.pool.query(`EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS) ${queryText}`, parameters);
        const originalPlan = explainResult.rows[0]['QUERY PLAN'][0];

        let optimizedQuery = queryText;
        let expectedImprovement = 'No optimization needed';
        let explanation = 'Query is already optimal';

        // Analyze the plan for optimization opportunities
        const executionTime = originalPlan['Execution Time'];

        if (executionTime > 200) {
          // Query is slower than target, suggest optimizations

          // Check for sequential scans on vector operations
          if (JSON.stringify(originalPlan).includes('Seq Scan')) {
            explanation = 'Sequential scan detected. Consider adding or rebuilding vector index.';
            expectedImprovement = '50-90% performance improvement with proper indexing';
          }

          // Check for inefficient distance operations
          if (queryText.includes('<=>') && executionTime > 100) {
            // Suggest using approximate search for better performance
            optimizedQuery = queryText.replace(
              /ORDER BY.*?<=>/,
              'ORDER BY embedding <=> $1 LIMIT 100'
            );
            explanation = 'Added LIMIT to vector search for better performance. Consider using approximate search for large datasets.';
            expectedImprovement = '30-50% performance improvement';
          }

          // Check for missing WHERE clauses that could use other indexes
          if (!queryText.includes('WHERE') && queryText.includes('document_chunks')) {
            explanation = 'Consider adding filters (chatbot_id, document_id) to reduce search space.';
            expectedImprovement = '20-40% performance improvement with proper filtering';
          }
        }

        SentryUtils.addBreadcrumb('Query optimization analyzed', {
          original_execution_time_ms: executionTime,
          needs_optimization: executionTime > 200,
          operation: 'optimizeQuery'
        });

        return {
          originalPlan,
          optimizedQuery,
          expectedImprovement,
          explanation
        };
      },
      {
        operation: 'optimizeQuery',
        table: 'query_analysis',
        additionalData: { query_length: queryText.length }
      }
    );
  }

  /**
   * Batch optimize embedding operations
   */
  async batchOptimization(
    operations: Array<{
      type: 'insert' | 'update' | 'search';
      data: any;
    }>
  ): Promise<{
    optimizedBatches: any[][];
    estimatedTimeReduction: number;
    recommendations: string[];
  }> {
    const batchSize = 100; // Optimal batch size for vector operations
    const optimizedBatches: any[][] = [];
    const recommendations: string[] = [];

    // Group operations by type for better efficiency
    const groupedOps = operations.reduce((groups, op) => {
      if (!groups[op.type]) groups[op.type] = [];
      groups[op.type].push(op.data);
      return groups;
    }, {} as Record<string, any[]>);

    let estimatedTimeReduction = 0;

    // Optimize each operation type
    for (const [opType, opData] of Object.entries(groupedOps)) {
      if (opType === 'insert' || opType === 'update') {
        // Batch insert/update operations
        for (let i = 0; i < opData.length; i += batchSize) {
          const batch = opData.slice(i, i + batchSize);
          optimizedBatches.push(batch);
        }

        const batches = Math.ceil(opData.length / batchSize);
        estimatedTimeReduction += Math.max(0, opData.length - batches) * 50; // 50ms saved per avoided round-trip

        if (opData.length > batchSize) {
          recommendations.push(`Batching ${opData.length} ${opType} operations into ${batches} batches for better performance`);
        }
      } else if (opType === 'search') {
        // For search operations, use parallel processing
        optimizedBatches.push(opData);
        if (opData.length > 1) {
          estimatedTimeReduction += opData.length * 30; // 30ms saved per parallel search
          recommendations.push(`Running ${opData.length} search operations in parallel`);
        }
      }
    }

    // Add general recommendations
    if (operations.length > 500) {
      recommendations.push('Consider implementing connection pooling for large batch operations');
    }

    if (operations.some(op => op.type === 'search')) {
      recommendations.push('Consider implementing result caching for frequently searched vectors');
    }

    SentryUtils.addBreadcrumb('Batch optimization completed', {
      total_operations: operations.length,
      optimized_batches: optimizedBatches.length,
      estimated_time_reduction_ms: estimatedTimeReduction,
      operation: 'batchOptimization'
    });

    return {
      optimizedBatches,
      estimatedTimeReduction,
      recommendations
    };
  }

  /**
   * Run automated maintenance routines
   */
  async runMaintenanceRoutines(
    options: {
      runVacuum?: boolean;
      runAnalyze?: boolean;
      runReindex?: boolean;
      updateStatistics?: boolean;
      cleanup?: boolean;
    } = {}
  ): Promise<MaintenanceTask[]> {
    return withDatabaseMonitoring(
      async () => {
        const tasks: MaintenanceTask[] = [];
        const defaultOptions = {
          runVacuum: true,
          runAnalyze: true,
          runReindex: false,
          updateStatistics: true,
          cleanup: true,
          ...options
        };

        // Get tables that need maintenance
        const maintenanceTables = await this.getTablesNeedingMaintenance();

        for (const table of maintenanceTables) {
          if (defaultOptions.runVacuum && table.days_since_vacuum > 7) {
            const task: MaintenanceTask = {
              task_id: `vacuum_${table.table_name}_${Date.now()}`,
              task_type: 'vacuum',
              table_name: table.table_name,
              estimated_duration_minutes: Math.max(1, Math.floor(table.size_mb / 1000)),
              last_run: table.last_vacuum,
              next_scheduled: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
              auto_run: true,
              priority: table.days_since_vacuum > 14 ? 1 : 2
            };

            try {
              await this.pool.query(`VACUUM ${table.table_name}`);
              tasks.push(task);

              SentryUtils.addBreadcrumb('Vacuum completed', {
                table_name: table.table_name,
                days_since_last: table.days_since_vacuum
              });
            } catch (error) {
              SentryUtils.captureError(
                new VectorSearchError(`Vacuum failed for ${table.table_name}: ${(error as Error).message}`),
                { additionalData: { operation: 'maintenance_vacuum', table: table.table_name } }
              );
            }
          }

          if (defaultOptions.runAnalyze && table.days_since_analyze > 3) {
            const task: MaintenanceTask = {
              task_id: `analyze_${table.table_name}_${Date.now()}`,
              task_type: 'analyze',
              table_name: table.table_name,
              estimated_duration_minutes: Math.max(1, Math.floor(table.size_mb / 5000)),
              last_run: table.last_analyze,
              next_scheduled: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Next 3 days
              auto_run: true,
              priority: table.days_since_analyze > 7 ? 1 : 2
            };

            try {
              await this.pool.query(`ANALYZE ${table.table_name}`);
              tasks.push(task);

              SentryUtils.addBreadcrumb('Analyze completed', {
                table_name: table.table_name,
                days_since_last: table.days_since_analyze
              });
            } catch (error) {
              SentryUtils.captureError(
                new VectorSearchError(`Analyze failed for ${table.table_name}: ${(error as Error).message}`),
                { additionalData: { operation: 'maintenance_analyze', table: table.table_name } }
              );
            }
          }

          if (defaultOptions.updateStatistics) {
            try {
              await this.pool.query(`SELECT pg_stat_reset_single_table_counters('${table.table_name}'::regclass)`);

              SentryUtils.addBreadcrumb('Statistics updated', {
                table_name: table.table_name
              });
            } catch (error) {
              // Non-critical error, just log it
              SentryUtils.addBreadcrumb('Statistics update failed', {
                table_name: table.table_name,
                error: (error as Error).message
              });
            }
          }
        }

        if (defaultOptions.cleanup) {
          // Clean up old performance monitoring data
          const oldDataCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
          this.performanceHistory = this.performanceHistory.filter(
            entry => entry.timestamp >= oldDataCutoff
          );
        }

        SentryUtils.addBreadcrumb('Maintenance routines completed', {
          tasks_completed: tasks.length,
          tables_processed: maintenanceTables.length,
          operation: 'runMaintenanceRoutines'
        });

        return tasks;
      },
      {
        operation: 'runMaintenanceRoutines',
        table: 'maintenance_tasks',
        additionalData: options
      }
    );
  }

  /**
   * Get comprehensive performance health check
   */
  async getHealthCheck(): Promise<{
    overall_health: 'healthy' | 'warning' | 'critical';
    performance_score: number;
    issues: Array<{
      category: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      recommendation: string;
    }>;
    metrics: {
      avg_query_time_ms: number;
      cache_hit_ratio: number;
      index_efficiency: number;
      connection_health: number;
      storage_efficiency: number;
    };
  }> {
    const issues: Array<{
      category: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      recommendation: string;
    }> = [];

    // Get current metrics
    const currentMetrics = await this.collectPerformanceMetrics();
    const indexMetrics = await this.analyzeIndexPerformance();

    // Calculate health scores
    const queryTimeScore = Math.max(0, 100 - (currentMetrics.avg_query_time_ms / 200) * 100);
    const cacheScore = currentMetrics.cache_hit_ratio;
    const indexScore = indexMetrics.length > 0 ?
      indexMetrics.reduce((sum, idx) => sum + idx.hit_ratio, 0) / indexMetrics.length : 0;
    const connectionScore = Math.max(0, 100 - (currentMetrics.connection_pool_usage / 80) * 100);
    const storageScore = 100; // Placeholder for storage efficiency calculation

    const performanceScore = (queryTimeScore + cacheScore + indexScore + connectionScore + storageScore) / 5;

    // Check for issues
    if (currentMetrics.avg_query_time_ms > 200) {
      issues.push({
        category: 'performance',
        severity: currentMetrics.avg_query_time_ms > 500 ? 'high' : 'medium',
        description: `Average query time is ${currentMetrics.avg_query_time_ms.toFixed(2)}ms (target: <200ms)`,
        recommendation: 'Review and optimize vector indexes, consider upgrading to HNSW'
      });
    }

    if (currentMetrics.cache_hit_ratio < 90) {
      issues.push({
        category: 'caching',
        severity: currentMetrics.cache_hit_ratio < 75 ? 'high' : 'medium',
        description: `Cache hit ratio is ${currentMetrics.cache_hit_ratio.toFixed(2)}% (target: >90%)`,
        recommendation: 'Increase shared_buffers, run VACUUM and ANALYZE on tables'
      });
    }

    if (currentMetrics.connection_pool_usage > 80) {
      issues.push({
        category: 'connections',
        severity: currentMetrics.connection_pool_usage > 95 ? 'high' : 'medium',
        description: `Connection pool usage is ${currentMetrics.connection_pool_usage.toFixed(2)}%`,
        recommendation: 'Increase connection pool size or optimize connection usage'
      });
    }

    if (indexMetrics.some(idx => idx.fragmentation_ratio > 0.3)) {
      issues.push({
        category: 'maintenance',
        severity: 'medium',
        description: 'Some indexes have high fragmentation',
        recommendation: 'Run REINDEX on fragmented indexes during maintenance window'
      });
    }

    // Determine overall health
    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.some(issue => issue.severity === 'high')) {
      overallHealth = 'critical';
    } else if (issues.some(issue => issue.severity === 'medium')) {
      overallHealth = 'warning';
    }

    const healthCheck = {
      overall_health: overallHealth,
      performance_score: Math.round(performanceScore),
      issues,
      metrics: {
        avg_query_time_ms: currentMetrics.avg_query_time_ms,
        cache_hit_ratio: currentMetrics.cache_hit_ratio,
        index_efficiency: indexScore,
        connection_health: connectionScore,
        storage_efficiency: storageScore
      }
    };

    SentryUtils.addBreadcrumb('Health check completed', {
      overall_health: overallHealth,
      performance_score: healthCheck.performance_score,
      issues_count: issues.length,
      operation: 'getHealthCheck'
    });

    return healthCheck;
  }

  // Private helper methods

  private async collectPerformanceMetrics(): Promise<PerformanceMonitoringData> {
    const queries = await Promise.all([
      // Average query time from pg_stat_statements
      this.pool.query(`
        SELECT COALESCE(AVG(mean_exec_time), 0) as avg_time_ms
        FROM pg_stat_statements
        WHERE query LIKE '%<=>%' OR query LIKE '%vector%'
      `),

      // Cache hit ratio
      this.pool.query(`
        SELECT
          CASE WHEN (blks_hit + blks_read) > 0
          THEN (blks_hit::float / (blks_hit + blks_read) * 100)
          ELSE 0 END as cache_hit_ratio
        FROM pg_stat_database
        WHERE datname = current_database()
      `),

      // Connection statistics
      this.pool.query(`
        SELECT
          count(*) as active_connections,
          count(*) * 100.0 / GREATEST(current_setting('max_connections')::int, 1) as pool_usage
        FROM pg_stat_activity
        WHERE state = 'active'
      `),

      // Memory usage (approximate)
      this.pool.query(`
        SELECT
          COALESCE(SUM(pg_database_size(datname))/1024/1024, 0) as db_size_mb
        FROM pg_database
        WHERE datname = current_database()
      `)
    ]);

    const avgTime = parseFloat(queries[0].rows[0]?.avg_time_ms) || 0;
    const cacheHitRatio = parseFloat(queries[1].rows[0]?.cache_hit_ratio) || 0;
    const activeConnections = parseInt(queries[2].rows[0]?.active_connections) || 0;
    const poolUsage = parseFloat(queries[2].rows[0]?.pool_usage) || 0;
    const dbSizeMb = parseFloat(queries[3].rows[0]?.db_size_mb) || 0;

    return {
      timestamp: new Date(),
      avg_query_time_ms: avgTime,
      p95_query_time_ms: avgTime * 1.5, // Approximation
      p99_query_time_ms: avgTime * 2.0, // Approximation
      queries_per_second: 0, // Would need more complex calculation
      cache_hit_ratio: cacheHitRatio,
      connection_pool_usage: poolUsage,
      memory_usage_mb: dbSizeMb,
      index_size_mb: 0, // Would need specific calculation
      active_connections: activeConnections,
      slow_queries_count: 0 // Would need pg_stat_statements analysis
    };
  }

  private async checkPerformanceAlerts(metrics: PerformanceMonitoringData): Promise<void> {
    const alerts: string[] = [];

    if (metrics.avg_query_time_ms > 200) {
      alerts.push(`High average query time: ${metrics.avg_query_time_ms.toFixed(2)}ms`);
    }

    if (metrics.cache_hit_ratio < 90) {
      alerts.push(`Low cache hit ratio: ${metrics.cache_hit_ratio.toFixed(2)}%`);
    }

    if (metrics.connection_pool_usage > 80) {
      alerts.push(`High connection pool usage: ${metrics.connection_pool_usage.toFixed(2)}%`);
    }

    if (alerts.length > 0) {
      SentryUtils.captureError(
        new VectorSearchError(`Performance alerts: ${alerts.join(', ')}`),
        {
          operation: 'performance_monitoring',
          additionalData: {
            alerts,
            metrics: {
              avg_query_time_ms: metrics.avg_query_time_ms,
              cache_hit_ratio: metrics.cache_hit_ratio,
              connection_pool_usage: metrics.connection_pool_usage
            }
          }
        }
      );
    }
  }

  private async getTableStatistics(tableName: string): Promise<{
    row_count: number;
    size_mb: number;
    last_vacuum: Date | null;
    last_analyze: Date | null;
  }> {
    const result = await this.pool.query(`
      SELECT
        COALESCE(n_tup_ins + n_tup_upd - n_tup_del, 0) as row_count,
        COALESCE(pg_total_relation_size(schemaname||'.'||tablename)::numeric/1024/1024, 0) as size_mb,
        last_vacuum,
        last_analyze
      FROM pg_stat_user_tables
      WHERE tablename = $1
    `, [tableName]);

    const row = result.rows[0] || {};
    return {
      row_count: parseInt(row.row_count) || 0,
      size_mb: parseFloat(row.size_mb) || 0,
      last_vacuum: row.last_vacuum ? new Date(row.last_vacuum) : null,
      last_analyze: row.last_analyze ? new Date(row.last_analyze) : null
    };
  }

  private async getCurrentIVFListCount(indexName: string): Promise<number> {
    try {
      const result = await this.pool.query(`
        SELECT
          split_part(split_part(pg_get_indexdef(indexrelid), 'lists = ', 2), ')', 1)::int as lists
        FROM pg_stat_user_indexes
        WHERE indexname = $1
      `, [indexName]);

      return parseInt(result.rows[0]?.lists) || 100; // Default lists value
    } catch (error) {
      return 100; // Default fallback
    }
  }

  private async getTablesNeedingMaintenance(): Promise<Array<{
    table_name: string;
    size_mb: number;
    last_vacuum: Date | null;
    last_analyze: Date | null;
    days_since_vacuum: number;
    days_since_analyze: number;
  }>> {
    const result = await this.pool.query(`
      SELECT
        tablename as table_name,
        COALESCE(pg_total_relation_size(schemaname||'.'||tablename)::numeric/1024/1024, 0) as size_mb,
        last_vacuum,
        last_analyze,
        COALESCE(EXTRACT(days FROM (now() - last_vacuum)), 999) as days_since_vacuum,
        COALESCE(EXTRACT(days FROM (now() - last_analyze)), 999) as days_since_analyze
      FROM pg_stat_user_tables
      WHERE tablename IN ('document_chunks', 'documents', 'products', 'chatbots')
      ORDER BY size_mb DESC
    `);

    return result.rows.map(row => ({
      table_name: row.table_name,
      size_mb: parseFloat(row.size_mb) || 0,
      last_vacuum: row.last_vacuum ? new Date(row.last_vacuum) : null,
      last_analyze: row.last_analyze ? new Date(row.last_analyze) : null,
      days_since_vacuum: parseFloat(row.days_since_vacuum) || 999,
      days_since_analyze: parseFloat(row.days_since_analyze) || 999
    }));
  }

  private calculateCostBenefitScore(
    index: IndexPerformanceMetrics,
    optimizationType: 'rebuild' | 'parameter_tune' | 'hnsw_upgrade'
  ): number {
    let score = 0;

    // Factor in current performance issues
    if (index.avg_query_time_ms > 200) score += 30;
    if (index.fragmentation_ratio > 0.3) score += 20;
    if (index.hit_ratio < 80) score += 15;

    // Factor in index usage
    if (index.scan_count > 1000) score += 20;
    if (index.scan_count > 10000) score += 30;

    // Factor in optimization type
    switch (optimizationType) {
      case 'rebuild':
        score += 10; // Low cost, moderate benefit
        break;
      case 'parameter_tune':
        score += 25; // Medium cost, high benefit
        break;
      case 'hnsw_upgrade':
        score += 40; // High cost, very high benefit for large datasets
        break;
    }

    return Math.min(100, score);
  }

  /**
   * Cleanup resources and stop monitoring
   */
  async cleanup(): Promise<void> {
    this.stopPerformanceMonitoring();

    SentryUtils.addBreadcrumb('Vector optimization service cleanup completed', {
      operation: 'cleanup'
    });
  }
}

export default VectorOptimizationService;