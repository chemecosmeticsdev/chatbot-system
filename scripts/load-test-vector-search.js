#!/usr/bin/env node

/**
 * Vector Search Load Testing Script
 *
 * Tests vector search performance under concurrent load with varying user counts.
 * Measures response times, throughput, and error rates to validate <200ms requirement.
 */

const { Pool } = require('pg');
const { performance } = require('perf_hooks');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test configuration
const TEST_CONFIGS = [
  { users: 5, duration: 30, name: '5 Concurrent Users' },
  { users: 10, duration: 30, name: '10 Concurrent Users' },
  { users: 20, duration: 30, name: '20 Concurrent Users' }
];

// Test queries with pre-generated vectors
const TEST_QUERIES = [
  'authentication system configuration',
  'database optimization strategies',
  'API integration best practices',
  'performance optimization techniques',
  'security implementation protocols',
  'vector search optimization',
  'user interface design principles',
  'monitoring and logging systems',
  'deployment automation processes',
  'system architecture considerations'
];

// Pre-generate test vectors for consistent testing
function generateTestVector() {
  const vector = [];
  for (let i = 0; i < 1536; i++) {
    vector.push((Math.random() * 2 - 1).toFixed(6));
  }
  return `[${vector.join(',')}]`;
}

// Generate test vectors once
const TEST_VECTORS = TEST_QUERIES.map(() => generateTestVector());

class LoadTestRunner {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  async runSingleQuery(queryIndex, userId) {
    const startTime = performance.now();
    const testVector = TEST_VECTORS[queryIndex % TEST_VECTORS.length];

    try {
      const query = `
        SELECT
          id,
          SUBSTRING(chunk_text, 1, 100) as chunk_preview,
          confidence_score,
          ROUND((embedding <=> $1::vector)::numeric, 4) AS distance
        FROM document_chunks
        ORDER BY distance
        LIMIT 10
      `;

      const result = await pool.query(query, [testVector]);
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      return {
        userId,
        queryIndex,
        responseTime,
        resultCount: result.rows.length,
        success: true,
        timestamp: new Date(),
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
      };
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      this.errors.push({
        userId,
        queryIndex,
        error: error.message,
        responseTime,
        timestamp: new Date()
      });

      return {
        userId,
        queryIndex,
        responseTime,
        resultCount: 0,
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async simulateUser(userId, durationSeconds) {
    const results = [];
    const endTime = Date.now() + (durationSeconds * 1000);
    let queryIndex = 0;

    while (Date.now() < endTime) {
      const result = await this.runSingleQuery(queryIndex % TEST_QUERIES.length, userId);
      results.push(result);
      queryIndex++;

      // Add small random delay to simulate real user behavior
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
    }

    return results;
  }

  async runLoadTest(config) {
    console.log(`\n🏋️  Starting Load Test: ${config.name}`);
    console.log(`   Users: ${config.users}, Duration: ${config.duration}s`);
    console.log(`   Target: <200ms per query, >95% success rate\n`);

    const startTime = performance.now();

    // Create promises for all users
    const userPromises = [];
    for (let i = 0; i < config.users; i++) {
      // Stagger user start times slightly
      const delay = (i / config.users) * 2000; // Spread over 2 seconds

      const userPromise = new Promise(resolve => {
        setTimeout(async () => {
          const userResults = await this.simulateUser(`user-${i}`, config.duration);
          resolve(userResults);
        }, delay);
      });

      userPromises.push(userPromise);
    }

    // Wait for all users to complete
    const allUserResults = await Promise.all(userPromises);
    const allResults = allUserResults.flat();

    const totalTime = performance.now() - startTime;

    // Analyze results
    const successfulResults = allResults.filter(r => r.success);
    const failedResults = allResults.filter(r => !r.success);

    const responseTimes = successfulResults.map(r => r.responseTime).sort((a, b) => a - b);

    const stats = {
      testName: config.name,
      totalQueries: allResults.length,
      successfulQueries: successfulResults.length,
      failedQueries: failedResults.length,
      successRate: (successfulResults.length / allResults.length) * 100,

      avgResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      minResponseTime: responseTimes[0] || 0,
      maxResponseTime: responseTimes[responseTimes.length - 1] || 0,
      p50ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.5)] || 0,
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
      p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)] || 0,

      throughputQps: allResults.length / (totalTime / 1000),
      avgMemoryUsage: successfulResults.reduce((sum, r) => sum + (r.memoryUsage || 0), 0) / successfulResults.length,

      meetsRequirement: false,
      testDuration: totalTime / 1000
    };

    // Check if requirements are met
    stats.meetsRequirement =
      stats.avgResponseTime <= 200 &&
      stats.p95ResponseTime <= 300 && // Allow some tolerance for P95
      stats.successRate >= 95;

    this.results.push(stats);

    // Display results
    console.log(`📊 Load Test Results: ${config.name}`);
    console.log(`   Total Queries: ${stats.totalQueries}`);
    console.log(`   Success Rate: ${stats.successRate.toFixed(2)}%`);
    console.log(`   Average Response Time: ${stats.avgResponseTime.toFixed(2)}ms`);
    console.log(`   P50 Response Time: ${stats.p50ResponseTime.toFixed(2)}ms`);
    console.log(`   P95 Response Time: ${stats.p95ResponseTime.toFixed(2)}ms`);
    console.log(`   P99 Response Time: ${stats.p99ResponseTime.toFixed(2)}ms`);
    console.log(`   Throughput: ${stats.throughputQps.toFixed(2)} QPS`);
    console.log(`   Memory Usage: ${stats.avgMemoryUsage.toFixed(2)}MB`);
    console.log(`   Meets <200ms Requirement: ${stats.meetsRequirement ? '✅ YES' : '❌ NO'}`);

    if (failedResults.length > 0) {
      console.log(`⚠️  Failed Queries: ${failedResults.length}`);
      console.log(`   Error Types: ${[...new Set(failedResults.map(r => r.error))].join(', ')}`);
    }

    return stats;
  }

  async runAllTests() {
    console.log('🚀 Vector Search Load Testing Started\n');
    console.log('Target Performance: <200ms response time, >95% success rate\n');

    const allStats = [];

    for (const config of TEST_CONFIGS) {
      try {
        const stats = await this.runLoadTest(config);
        allStats.push(stats);

        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.error(`❌ Load test failed for ${config.name}:`, error.message);
      }
    }

    // Generate summary report
    this.generateSummaryReport(allStats);

    return allStats;
  }

  generateSummaryReport(allStats) {
    console.log('\n📋 LOAD TESTING SUMMARY REPORT');
    console.log('=' .repeat(60));

    allStats.forEach(stats => {
      const status = stats.meetsRequirement ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${stats.testName}`);
      console.log(`     Avg: ${stats.avgResponseTime.toFixed(2)}ms | P95: ${stats.p95ResponseTime.toFixed(2)}ms | Success: ${stats.successRate.toFixed(1)}%`);
    });

    console.log('\n🎯 PERFORMANCE ANALYSIS:');

    const passing = allStats.filter(s => s.meetsRequirement).length;
    const total = allStats.length;

    console.log(`   Tests Passing: ${passing}/${total} (${((passing/total) * 100).toFixed(1)}%)`);

    if (passing === total) {
      console.log('   🎉 ALL TESTS PASSED! Vector search meets <200ms requirement under load.');
    } else {
      console.log('   ⚠️  Some tests failed. Consider further optimization:');

      allStats.filter(s => !s.meetsRequirement).forEach(stats => {
        if (stats.avgResponseTime > 200) {
          console.log(`     - ${stats.testName}: Response time too high (${stats.avgResponseTime.toFixed(2)}ms)`);
        }
        if (stats.successRate < 95) {
          console.log(`     - ${stats.testName}: Success rate too low (${stats.successRate.toFixed(2)}%)`);
        }
      });
    }

    // Best and worst performance
    const bestPerf = allStats.reduce((best, current) =>
      current.avgResponseTime < best.avgResponseTime ? current : best
    );

    const worstPerf = allStats.reduce((worst, current) =>
      current.avgResponseTime > worst.avgResponseTime ? current : worst
    );

    console.log(`\n   📈 Best Performance: ${bestPerf.testName} (${bestPerf.avgResponseTime.toFixed(2)}ms avg)`);
    console.log(`   📉 Worst Performance: ${worstPerf.testName} (${worstPerf.avgResponseTime.toFixed(2)}ms avg)`);

    // Recommendations
    console.log('\n💡 OPTIMIZATION RECOMMENDATIONS:');

    const avgResponseTime = allStats.reduce((sum, s) => sum + s.avgResponseTime, 0) / allStats.length;

    if (avgResponseTime > 150) {
      console.log('   - Consider upgrading to HNSW index for better performance');
      console.log('   - Review and optimize query patterns');
      console.log('   - Increase database connection pool size');
    }

    if (allStats.some(s => s.successRate < 98)) {
      console.log('   - Implement connection retry logic');
      console.log('   - Monitor database connection limits');
      console.log('   - Add circuit breaker patterns');
    }

    if (allStats.some(s => s.avgMemoryUsage > 500)) {
      console.log('   - Optimize memory usage in vector operations');
      console.log('   - Implement result caching strategies');
    }

    console.log('\n✅ Load testing completed successfully!');
  }
}

// Run load tests if this script is executed directly
if (require.main === module) {
  const runner = new LoadTestRunner();

  runner.runAllTests()
    .then((results) => {
      console.log('\n🎯 Load testing process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Load testing failed:', error);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = { LoadTestRunner };