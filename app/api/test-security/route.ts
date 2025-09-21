import { NextRequest, NextResponse } from 'next/server';
import { withTestSecurity } from '@/lib/security/middleware';
import {
  runSecurityAudit,
  validateAuthentication,
  checkAuthorization,
  scanForVulnerabilities,
  testInputValidation,
  auditAPIEndpoints,
  rateLimiter
} from '@/lib/security/audit-and-rate-limiting';
import { securityMonitor } from '@/lib/security/monitoring';

async function handler(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const { searchParams } = req.nextUrl;
  const testType = searchParams.get('test') || 'all';

  try {

    const results: any = {
      timestamp: new Date().toISOString(),
      testType,
      results: {},
      summary: '',
      duration: 0
    };

    // Test authentication
    if (testType === 'all' || testType === 'auth') {
      const authResult = await validateAuthentication(req);
      results.results.authentication = authResult;
    }

    // Test authorization for different roles
    if (testType === 'all' || testType === 'authz') {
      const authzResults = {
        user: await checkAuthorization(req, 'user'),
        admin: await checkAuthorization(req, 'admin'),
        superadmin: await checkAuthorization(req, 'superadmin')
      };
      results.results.authorization = authzResults;
    }

    // Test vulnerability scanning
    if (testType === 'all' || testType === 'vuln') {
      const vulnResults = await scanForVulnerabilities(req);
      results.results.vulnerabilities = vulnResults;
    }

    // Test input validation
    if (testType === 'all' || testType === 'input') {
      const inputResults = await testInputValidation(req);
      results.results.inputValidation = inputResults;
    }

    // Test rate limiting
    if (testType === 'all' || testType === 'rate') {
      const rateLimitResult = await rateLimiter.checkRateLimit(req);
      const rateLimitStats = rateLimiter.getRateLimitStats();
      results.results.rateLimiting = {
        currentRequest: rateLimitResult,
        statistics: rateLimitStats
      };
    }

    // Test API endpoints audit
    if (testType === 'all' || testType === 'api') {
      const apiResults = await auditAPIEndpoints();
      results.results.apiSecurity = apiResults;
    }

    // Run comprehensive security audit
    if (testType === 'all' || testType === 'audit') {
      const auditResult = await runSecurityAudit(req);
      results.results.securityAudit = auditResult;
    }

    // Test security monitoring
    if (testType === 'all' || testType === 'monitoring') {
      const monitoringResults = {
        metrics: securityMonitor.getSecurityMetrics(),
        recentEvents: securityMonitor.getRecentSecurityEvents(1), // Last hour
        healthCheck: await securityMonitor.runSecurityHealthCheck()
      };
      results.results.monitoring = monitoringResults;
    }

    // Test security event recording
    if (testType === 'all' || testType === 'events') {
      const testEventId = securityMonitor.recordSecurityEvent({
        type: 'suspicious_activity',
        severity: 'low',
        source: 'security_test_endpoint',
        details: 'Test security event from security validation endpoint',
        metadata: {
          test: true,
          endpoint: req.nextUrl.pathname,
          method: req.method,
          timestamp: new Date().toISOString()
        }
      });

      results.results.eventRecording = {
        testEventId,
        message: 'Test security event recorded successfully'
      };
    }

    // Calculate duration and generate summary
    results.duration = Date.now() - startTime;

    // Generate summary based on results
    const failedTests = Object.values(results.results).flatMap((testResults: any) => {
      if (Array.isArray(testResults)) {
        return testResults.filter((result: any) => result.passed === false);
      } else if (testResults && typeof testResults === 'object') {
        if ('passed' in testResults && !testResults.passed) {
          return [testResults];
        } else if ('overallStatus' in testResults && testResults.overallStatus === 'fail') {
          return [testResults];
        }
      }
      return [];
    });

    const criticalIssues = failedTests.filter((test: any) => test.severity === 'critical');
    const highIssues = failedTests.filter((test: any) => test.severity === 'high');

    if (criticalIssues.length > 0) {
      results.summary = `CRITICAL: ${criticalIssues.length} critical security issues detected requiring immediate attention`;
      results.status = 'critical';
    } else if (highIssues.length > 0) {
      results.summary = `WARNING: ${highIssues.length} high-severity security issues detected`;
      results.status = 'warning';
    } else if (failedTests.length > 0) {
      results.summary = `INFO: ${failedTests.length} minor security issues detected`;
      results.status = 'info';
    } else {
      results.summary = `SUCCESS: All security tests passed in ${results.duration}ms`;
      results.status = 'success';
    }

    // Add test configuration info
    results.testConfiguration = {
      endpoint: req.nextUrl.pathname,
      method: req.method,
      userAgent: req.headers.get('user-agent'),
      clientIP: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      testType,
      timestamp: new Date().toISOString()
    };

    // Add recommendations for failed tests
    if (failedTests.length > 0) {
      results.recommendations = failedTests
        .filter((test: any) => test.recommendation)
        .map((test: any) => ({
          test: test.test,
          severity: test.severity,
          recommendation: test.recommendation
        }));
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: results.summary
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    // Record security test failure
    securityMonitor.recordSecurityEvent({
      type: 'security_audit_failure',
      severity: 'medium',
      source: 'security_test_endpoint',
      details: `Security test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: {
        test_type: testType,
        duration,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        stack_trace: error instanceof Error ? error.stack : undefined
      }
    });

    return NextResponse.json({
      success: false,
      error: 'Security test failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      testType: testType,
      duration,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Apply test security middleware (more permissive for testing)
export const GET = withTestSecurity(handler, 'security_test_get');
export const POST = withTestSecurity(handler, 'security_test_post');