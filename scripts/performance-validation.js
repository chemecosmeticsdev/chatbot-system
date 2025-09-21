#!/usr/bin/env node

/**
 * Performance Validation CLI Script
 *
 * Command-line interface for running performance validation tests
 * and generating reports. Useful for local development, CI/CD, and monitoring.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

const COMMANDS = {
  validate: 'Run performance validation tests',
  benchmark: 'Run comprehensive benchmarks',
  load: 'Run load testing',
  monitor: 'Start/stop performance monitoring',
  report: 'Generate performance report',
  cicd: 'Run CI/CD performance validation',
  help: 'Show this help message'
};

function showHelp() {
  console.log('Performance Validation CLI\n');
  console.log('Usage: node scripts/performance-validation.js <command> [options]\n');
  console.log('Commands:');

  Object.entries(COMMANDS).forEach(([cmd, desc]) => {
    console.log(`  ${cmd.padEnd(12)} ${desc}`);
  });

  console.log('\nExamples:');
  console.log('  node scripts/performance-validation.js validate --quick');
  console.log('  node scripts/performance-validation.js benchmark --size medium');
  console.log('  node scripts/performance-validation.js load --users 10 --duration 60');
  console.log('  node scripts/performance-validation.js monitor --start --interval 30');
  console.log('  node scripts/performance-validation.js report --days 7');
  console.log('  node scripts/performance-validation.js cicd --commit abc123 --branch main');
}

function parseOptions(args) {
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith('--')) {
        options[key] = nextArg;
        i++; // Skip next argument as it's the value
      } else {
        options[key] = true; // Boolean flag
      }
    }
  }

  return options;
}

async function runValidation(options) {
  console.log('🔍 Running performance validation...\n');

  const testType = options.quick ? 'quick' :
                   options.comprehensive ? 'comprehensive' :
                   'quick';

  const chatbotId = options.chatbot || 'cli-test-chatbot';
  const sessionId = options.session || `cli-session-${Date.now()}`;

  const queries = options.queries ?
    options.queries.split(',') :
    [
      'authentication setup guide',
      'database configuration',
      'user management',
      'API integration',
      'troubleshooting common issues'
    ];

  try {
    const response = await fetch('http://localhost:3000/api/v1/performance/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test_type: testType,
        queries: queries.slice(0, options.quick ? 3 : queries.length),
        chatbot_id: chatbotId,
        session_id: sessionId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      const data = result.data;

      console.log('✅ Performance Validation Results:');
      console.log(`   Overall Compliance: ${data.overall_compliance ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`   Average Response Time: ${data.avg_response_time_ms.toFixed(1)}ms`);
      console.log(`   Target: <200ms`);
      console.log(`   Tests Completed: ${data.results.length}`);

      if (data.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        data.recommendations.forEach((rec, i) => {
          console.log(`   ${i + 1}. ${rec}`);
        });
      }

      // Save results to file
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `performance-validation-${timestamp}.json`;
      fs.writeFileSync(filename, JSON.stringify(result, null, 2));
      console.log(`\n📄 Results saved to: ${filename}`);

    } else {
      console.error('❌ Validation failed:', result.error.message);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error running validation:', error.message);
    process.exit(1);
  }
}

async function runBenchmark(options) {
  console.log('📊 Running performance benchmarks...\n');

  const sizes = options.size ? [options.size] : ['small', 'medium'];
  const includeMemory = options.memory !== false;

  try {
    const response = await fetch('http://localhost:3000/api/v1/performance/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test_type: 'comprehensive',
        chatbot_id: 'benchmark-chatbot',
        session_id: `benchmark-${Date.now()}`
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success && result.data.benchmarks) {
      console.log('✅ Benchmark Results:');

      result.data.benchmarks.forEach((benchmark, i) => {
        console.log(`\n📈 Benchmark ${i + 1} (${benchmark.dataset_size} vectors):`);
        console.log(`   Average Response Time: ${benchmark.avg_response_time_ms.toFixed(1)}ms`);
        console.log(`   P95 Response Time: ${benchmark.p95_response_time_ms.toFixed(1)}ms`);
        console.log(`   P99 Response Time: ${benchmark.p99_response_time_ms.toFixed(1)}ms`);
        console.log(`   Throughput: ${benchmark.throughput_qps.toFixed(1)} QPS`);
        console.log(`   Memory Usage: ${benchmark.memory_usage_mb.toFixed(1)}MB`);
        console.log(`   Cache Hit Ratio: ${(benchmark.cache_hit_ratio * 100).toFixed(1)}%`);
        console.log(`   Meets Requirement: ${benchmark.meets_requirement ? '✅' : '❌'}`);
      });

      // Save benchmark results
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `performance-benchmark-${timestamp}.json`;
      fs.writeFileSync(filename, JSON.stringify(result.data.benchmarks, null, 2));
      console.log(`\n📄 Benchmark results saved to: ${filename}`);

    } else {
      console.error('❌ Benchmark failed:', result.error?.message || 'Unknown error');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error running benchmark:', error.message);
    process.exit(1);
  }
}

async function runLoadTest(options) {
  console.log('🚀 Running load test...\n');

  const concurrentUsers = parseInt(options.users || '5');
  const duration = parseInt(options.duration || '30');
  const complexity = options.complexity || 'moderate';

  console.log(`Configuration:`);
  console.log(`   Concurrent Users: ${concurrentUsers}`);
  console.log(`   Duration: ${duration} seconds`);
  console.log(`   Query Complexity: ${complexity}\n`);

  try {
    const response = await fetch('http://localhost:3000/api/v1/performance/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test_type: 'load_test',
        chatbot_id: 'load-test-chatbot',
        session_id: `load-test-${Date.now()}`,
        load_test_config: {
          concurrent_users: concurrentUsers,
          test_duration_seconds: duration,
          query_complexity: complexity
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      const data = result.data;

      console.log('✅ Load Test Results:');
      console.log(`   Success: ${data.success ? '✅' : '❌'}`);
      console.log(`   Average Response Time: ${data.avg_response_time_ms.toFixed(1)}ms`);
      console.log(`   P95 Response Time: ${data.p95_response_time_ms.toFixed(1)}ms`);
      console.log(`   Throughput: ${data.throughput_qps.toFixed(1)} QPS`);
      console.log(`   Error Rate: ${(data.error_rate * 100).toFixed(2)}%`);
      console.log(`   Total Requests: ${data.results.length}`);
      console.log(`   Meets Requirements: ${data.meets_requirements ? '✅' : '❌'}`);

      // Save load test results
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `performance-loadtest-${timestamp}.json`;
      fs.writeFileSync(filename, JSON.stringify(result, null, 2));
      console.log(`\n📄 Load test results saved to: ${filename}`);

    } else {
      console.error('❌ Load test failed:', result.error?.message || 'Unknown error');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error running load test:', error.message);
    process.exit(1);
  }
}

async function controlMonitoring(options) {
  const action = options.start ? 'start' :
                 options.stop ? 'stop' :
                 options.status ? 'status' :
                 'status';

  const interval = parseInt(options.interval || '60');

  console.log(`🔍 Performance monitoring: ${action.toUpperCase()}\n`);

  try {
    if (action === 'status') {
      const response = await fetch('http://localhost:3000/api/v1/performance/monitor?include_metrics=true');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('📊 Monitoring Status:');
        console.log(`   Service Initialized: ${result.data.status.service_initialized ? '✅' : '❌'}`);
        console.log(`   Monitoring Active: ${result.data.status.monitoring_active ? '✅' : '❌'}`);

        if (result.data.metrics) {
          console.log('\n📈 Recent Metrics:');
          console.log(`   Total Queries: ${result.data.metrics.summary.total_queries}`);
          console.log(`   Avg Response Time: ${result.data.metrics.summary.avg_response_time_ms.toFixed(1)}ms`);
          console.log(`   Compliance Rate: ${(result.data.metrics.summary.requirement_compliance_rate * 100).toFixed(1)}%`);
          console.log(`   Performance Trend: ${result.data.metrics.summary.performance_trend}`);
          console.log(`   Critical Issues: ${result.data.metrics.summary.critical_issues}`);
        }
      }

    } else {
      const response = await fetch('http://localhost:3000/api/v1/performance/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          interval_seconds: interval
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Monitoring ${action} successful`);
        if (action === 'start') {
          console.log(`   Interval: ${interval} seconds`);
        }
      } else {
        console.error(`❌ Monitoring ${action} failed:`, result.error?.message);
        process.exit(1);
      }
    }

  } catch (error) {
    console.error(`❌ Error with monitoring ${action}:`, error.message);
    process.exit(1);
  }
}

async function generateReport(options) {
  console.log('📊 Generating performance report...\n');

  const days = parseInt(options.days || '7');
  const includeOptimization = options.optimization !== false;

  try {
    const response = await fetch(`http://localhost:3000/api/v1/performance/validate?days=${days}&include_optimization=${includeOptimization}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      const report = result.data;

      console.log('📈 Performance Report Summary:');
      console.log(`   Period: ${days} days`);
      console.log(`   Total Queries: ${report.summary.total_queries}`);
      console.log(`   Average Response Time: ${report.summary.avg_response_time_ms.toFixed(1)}ms`);
      console.log(`   Compliance Rate: ${(report.summary.requirement_compliance_rate * 100).toFixed(1)}%`);
      console.log(`   Performance Trend: ${report.summary.performance_trend}`);
      console.log(`   Critical Issues: ${report.summary.critical_issues}`);

      if (report.alerts && report.alerts.length > 0) {
        console.log('\n🚨 Recent Alerts:');
        report.alerts.slice(0, 5).forEach((alert, i) => {
          console.log(`   ${i + 1}. [${alert.severity.toUpperCase()}] ${alert.message}`);
        });
      }

      if (report.recommendations && report.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        report.recommendations.forEach((rec, i) => {
          console.log(`   ${i + 1}. ${rec}`);
        });
      }

      // Save report
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `performance-report-${timestamp}.json`;
      fs.writeFileSync(filename, JSON.stringify(report, null, 2));
      console.log(`\n📄 Report saved to: ${filename}`);

    } else {
      console.error('❌ Report generation failed:', result.error?.message || 'Unknown error');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error generating report:', error.message);
    process.exit(1);
  }
}

async function runCICDValidation(options) {
  console.log('🔄 Running CI/CD performance validation...\n');

  const pipelineId = options.pipeline || `cli-${Date.now()}`;
  const commitHash = options.commit || process.env.GITHUB_SHA || 'unknown';
  const branch = options.branch || process.env.GITHUB_REF_NAME || 'main';

  console.log(`Configuration:`);
  console.log(`   Pipeline ID: ${pipelineId}`);
  console.log(`   Commit Hash: ${commitHash}`);
  console.log(`   Branch: ${branch}\n`);

  try {
    const response = await fetch('http://localhost:3000/api/v1/performance/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test_type: 'ci_cd',
        ci_cd_config: {
          pipeline_id: pipelineId,
          commit_hash: commitHash,
          branch: branch
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      const cicdResult = result.data.ci_cd_result;

      console.log('✅ CI/CD Validation Results:');
      console.log(`   Performance Tests Passed: ${cicdResult.performance_tests_passed ? '✅' : '❌'}`);
      console.log(`   Regression Detected: ${cicdResult.regression_detected ? '⚠️  YES' : '✅ NO'}`);
      console.log(`   Total Tests: ${cicdResult.detailed_results.length}`);
      console.log(`   Blocking Issues: ${cicdResult.blocking_issues.length}`);
      console.log(`   Warnings: ${cicdResult.warnings.length}`);

      if (cicdResult.baseline_comparison) {
        const comparison = cicdResult.baseline_comparison;
        console.log(`\n📊 Baseline Comparison:`);
        console.log(`   Previous Performance: ${comparison.baseline.avg_response_time_ms.toFixed(1)}ms`);
        console.log(`   Current Performance: ${comparison.current.avg_response_time_ms.toFixed(1)}ms`);
        console.log(`   Change: ${comparison.regression_percent > 0 ? '+' : ''}${comparison.regression_percent.toFixed(1)}%`);
      }

      if (cicdResult.blocking_issues.length > 0) {
        console.log('\n❌ Blocking Issues:');
        cicdResult.blocking_issues.forEach((issue, i) => {
          console.log(`   ${i + 1}. ${issue}`);
        });
      }

      if (cicdResult.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        cicdResult.recommendations.forEach((rec, i) => {
          console.log(`   ${i + 1}. ${rec}`);
        });
      }

      // Save CI/CD results and artifacts
      const timestamp = new Date().toISOString().replace(/:/g, '-');

      // Save main result
      fs.writeFileSync(`cicd-results-${timestamp}.json`, JSON.stringify(cicdResult, null, 2));

      // Save GitHub summary if available
      if (result.data.github_summary) {
        fs.writeFileSync(`github-summary-${timestamp}.md`, result.data.github_summary);
      }

      // Save performance data
      if (result.data.performance_json) {
        fs.writeFileSync(`performance-data-${timestamp}.json`, result.data.performance_json);
      }

      console.log(`\n📄 CI/CD results saved with timestamp: ${timestamp}`);

      // Exit with appropriate code
      process.exit(cicdResult.performance_tests_passed ? 0 : 1);

    } else {
      console.error('❌ CI/CD validation failed:', result.error?.message || 'Unknown error');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error running CI/CD validation:', error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  if (!command || command === 'help') {
    showHelp();
    return;
  }

  const options = parseOptions(args.slice(1));

  // Check if development server is running
  if (['validate', 'benchmark', 'load', 'monitor', 'report', 'cicd'].includes(command)) {
    try {
      const response = await fetch('http://localhost:3000/api/health');
      if (!response.ok) {
        throw new Error('Development server not responding');
      }
    } catch (error) {
      console.error('❌ Error: Development server is not running on localhost:3000');
      console.error('   Please start the development server with: npm run dev');
      process.exit(1);
    }
  }

  try {
    switch (command) {
      case 'validate':
        await runValidation(options);
        break;
      case 'benchmark':
        await runBenchmark(options);
        break;
      case 'load':
        await runLoadTest(options);
        break;
      case 'monitor':
        await controlMonitoring(options);
        break;
      case 'report':
        await generateReport(options);
        break;
      case 'cicd':
        await runCICDValidation(options);
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Add fetch polyfill for Node.js if not available
if (typeof fetch === 'undefined') {
  const fetch = require('node-fetch');
  global.fetch = fetch;
}

main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});