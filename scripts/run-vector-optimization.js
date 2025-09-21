#!/usr/bin/env node

/**
 * Vector Database Performance Optimization Script
 *
 * Executes comprehensive vector database performance optimization using the
 * existing VectorOptimizationService and PerformanceValidationService.
 */

const { VectorOptimizationService } = require('../lib/vector/optimization.ts');
const { PerformanceValidationService } = require('../lib/validation/performance-validation.ts');
const { getNeonPool } = require('../lib/neon.ts');

async function runVectorOptimization() {
  console.log('🔧 Starting Vector Database Performance Optimization...\n');

  const pool = getNeonPool();
  const optimizationService = new VectorOptimizationService(pool);
  const performanceService = new PerformanceValidationService(pool);

  try {
    // 1. Run Performance Analysis
    console.log('📊 Step 1: Analyzing current vector index performance...');
    const indexMetrics = await optimizationService.analyzeIndexPerformance();

    console.log(`Found ${indexMetrics.length} vector indexes:`);
    indexMetrics.forEach(metric => {
      console.log(`  - ${metric.index_name} (${metric.index_type}): ${metric.avg_query_time_ms.toFixed(2)}ms avg, ${metric.fragmentation_ratio.toFixed(2)} fragmentation`);
    });

    // 2. Performance Validation
    console.log('\n🧪 Step 2: Validating search performance against <200ms requirement...');
    const validationResult = await performanceService.validateSearchPerformance([
      'authentication setup guide',
      'database configuration',
      'user management',
      'API integration',
      'troubleshooting common issues'
    ]);

    console.log(`Performance Validation Results:`);
    console.log(`  - Overall Compliance: ${validationResult.overall_compliance ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  - Average Response Time: ${validationResult.avg_response_time_ms.toFixed(2)}ms`);
    console.log(`  - Tests Passed: ${validationResult.results.filter(r => r.success && r.response_time_ms <= 200).length}/${validationResult.results.length}`);

    if (validationResult.recommendations.length > 0) {
      console.log('  - Recommendations:');
      validationResult.recommendations.forEach(rec => console.log(`    • ${rec}`));
    }

    // 3. Get Optimization Recommendations
    console.log('\n🎯 Step 3: Generating optimization recommendations...');
    const recommendations = await optimizationService.optimizeVectorIndexes('document_chunks');

    console.log(`Generated ${recommendations.length} optimization recommendations:`);
    recommendations.forEach(rec => {
      const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      console.log(`  ${priority} ${rec.type.toUpperCase()}: ${rec.description}`);
      console.log(`    Expected improvement: ${rec.estimated_improvement}`);
      console.log(`    Cost-benefit score: ${rec.cost_benefit_score}/100`);
    });

    // 4. Apply High Priority Optimizations (automatically)
    console.log('\n⚡ Step 4: Applying high-priority optimizations...');
    const highPriorityRecs = recommendations.filter(r => r.priority === 'high');

    for (const rec of highPriorityRecs) {
      if (rec.implementation_sql && rec.estimated_downtime_minutes === 0) {
        try {
          console.log(`  Executing: ${rec.description}`);
          await pool.query(rec.implementation_sql);
          console.log(`  ✅ Successfully applied optimization`);
        } catch (error) {
          console.log(`  ❌ Failed to apply optimization: ${error.message}`);
        }
      }
    }

    // 5. Run Maintenance Routines
    console.log('\n🧹 Step 5: Running database maintenance routines...');
    const maintenanceTasks = await optimizationService.runMaintenanceRoutines({
      runVacuum: true,
      runAnalyze: true,
      updateStatistics: true,
      cleanup: true
    });

    console.log(`Completed ${maintenanceTasks.length} maintenance tasks:`);
    maintenanceTasks.forEach(task => {
      console.log(`  ✅ ${task.task_type.toUpperCase()} on ${task.table_name} (${task.estimated_duration_minutes}min)`);
    });

    // 6. Load Testing
    console.log('\n🏋️ Step 6: Running load testing scenarios...');

    // Test with 5 concurrent users
    console.log('  Testing with 5 concurrent users...');
    const loadTest5 = await performanceService.validateUnderLoad({
      concurrent_users: 5,
      test_duration_seconds: 30,
      queries_per_user: 10,
      ramp_up_seconds: 5,
      dataset_size: 'medium',
      query_complexity: 'moderate'
    });

    console.log(`    Average Response Time: ${loadTest5.avg_response_time_ms.toFixed(2)}ms`);
    console.log(`    P95 Response Time: ${loadTest5.p95_response_time_ms.toFixed(2)}ms`);
    console.log(`    Throughput: ${loadTest5.throughput_qps.toFixed(2)} QPS`);
    console.log(`    Error Rate: ${(loadTest5.error_rate * 100).toFixed(2)}%`);
    console.log(`    Meets Requirements: ${loadTest5.meets_requirements ? '✅' : '❌'}`);

    // Test with 10 concurrent users
    console.log('  Testing with 10 concurrent users...');
    const loadTest10 = await performanceService.validateUnderLoad({
      concurrent_users: 10,
      test_duration_seconds: 30,
      queries_per_user: 10,
      ramp_up_seconds: 5,
      dataset_size: 'medium',
      query_complexity: 'moderate'
    });

    console.log(`    Average Response Time: ${loadTest10.avg_response_time_ms.toFixed(2)}ms`);
    console.log(`    P95 Response Time: ${loadTest10.p95_response_time_ms.toFixed(2)}ms`);
    console.log(`    Throughput: ${loadTest10.throughput_qps.toFixed(2)} QPS`);
    console.log(`    Error Rate: ${(loadTest10.error_rate * 100).toFixed(2)}%`);
    console.log(`    Meets Requirements: ${loadTest10.meets_requirements ? '✅' : '❌'}`);

    // 7. Performance Monitoring
    console.log('\n📈 Step 7: Starting performance monitoring...');
    optimizationService.startPerformanceMonitoring(5); // Monitor every 5 minutes
    await performanceService.startPerformanceMonitoring(60); // Monitor every minute

    console.log('  ✅ Real-time performance monitoring activated');
    console.log('  📊 Monitoring interval: 5 minutes for optimization service');
    console.log('  📊 Monitoring interval: 1 minute for validation service');

    // 8. Health Check
    console.log('\n🩺 Step 8: Running comprehensive health check...');
    const healthCheck = await optimizationService.getHealthCheck();

    const healthIcon = healthCheck.overall_health === 'healthy' ? '💚' :
                     healthCheck.overall_health === 'warning' ? '🟡' : '🔴';

    console.log(`${healthIcon} Overall Health: ${healthCheck.overall_health.toUpperCase()}`);
    console.log(`📊 Performance Score: ${healthCheck.performance_score}/100`);
    console.log(`📈 Metrics:`);
    console.log(`  - Average Query Time: ${healthCheck.metrics.avg_query_time_ms.toFixed(2)}ms`);
    console.log(`  - Cache Hit Ratio: ${(healthCheck.metrics.cache_hit_ratio * 100).toFixed(1)}%`);
    console.log(`  - Index Efficiency: ${(healthCheck.metrics.index_efficiency * 100).toFixed(1)}%`);
    console.log(`  - Connection Health: ${healthCheck.metrics.connection_health.toFixed(1)}%`);

    if (healthCheck.issues.length > 0) {
      console.log(`⚠️  Issues Found (${healthCheck.issues.length}):`);
      healthCheck.issues.forEach(issue => {
        const severityIcon = issue.severity === 'high' ? '🔴' :
                           issue.severity === 'medium' ? '🟡' : '🟢';
        console.log(`  ${severityIcon} ${issue.category.toUpperCase()}: ${issue.description}`);
        console.log(`    Recommendation: ${issue.recommendation}`);
      });
    }

    // 9. Generate Performance Report
    console.log('\n📊 Step 9: Generating performance report...');
    const report = await performanceService.generatePerformanceReport(1, true); // Last 1 day with optimization recommendations

    console.log(`📄 Performance Report Generated (ID: ${report.report_id})`);
    console.log(`📈 Summary:`);
    console.log(`  - Total Queries: ${report.summary.total_queries}`);
    console.log(`  - Average Response Time: ${report.summary.avg_response_time_ms.toFixed(2)}ms`);
    console.log(`  - Compliance Rate: ${(report.summary.requirement_compliance_rate * 100).toFixed(1)}%`);
    console.log(`  - Performance Trend: ${report.summary.performance_trend.toUpperCase()}`);
    console.log(`  - Critical Issues: ${report.summary.critical_issues}`);

    if (report.recommendations.length > 0) {
      console.log(`🎯 Top Recommendations:`);
      report.recommendations.slice(0, 5).forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }

    if (report.optimization_opportunities.length > 0) {
      console.log(`🚀 Optimization Opportunities:`);
      report.optimization_opportunities.slice(0, 3).forEach((opp, i) => {
        console.log(`  ${i + 1}. ${opp}`);
      });
    }

    console.log('\n✅ Vector Database Performance Optimization Complete!\n');
    console.log('📊 Key Results:');
    console.log(`  - Overall Health: ${healthCheck.overall_health.toUpperCase()}`);
    console.log(`  - Performance Score: ${healthCheck.performance_score}/100`);
    console.log(`  - Load Test (5 users): ${loadTest5.meets_requirements ? 'PASS' : 'FAIL'}`);
    console.log(`  - Load Test (10 users): ${loadTest10.meets_requirements ? 'PASS' : 'FAIL'}`);
    console.log(`  - Monitoring: ACTIVE`);
    console.log(`  - Optimizations Applied: ${highPriorityRecs.length}`);
    console.log(`  - Maintenance Tasks: ${maintenanceTasks.length}`);

    // Stop monitoring for this session
    optimizationService.stopPerformanceMonitoring();
    performanceService.stopPerformanceMonitoring();

    console.log('\n💡 Next Steps:');
    console.log('  - Review performance report for detailed insights');
    console.log('  - Monitor performance trends over the next few days');
    console.log('  - Apply medium and low priority optimizations during maintenance windows');
    console.log('  - Schedule regular performance validation runs');

  } catch (error) {
    console.error('❌ Optimization failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the optimization if this script is executed directly
if (require.main === module) {
  runVectorOptimization()
    .then(() => {
      console.log('🎉 Optimization process completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Optimization process failed:', error);
      process.exit(1);
    });
}

module.exports = { runVectorOptimization };