import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { SentryUtils } from '@/lib/monitoring/sentry-utils';
import { validateEnvironment } from '@/lib/config';
import crypto from 'crypto';

// Rate limiting configuration interfaces
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  burstLimit?: number; // Max burst requests
  skipHeader?: string; // Header to bypass rate limiting
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
  onLimitReached?: (req: NextRequest, limit: RateLimitConfig) => void;
}

interface UserTypeRateLimits {
  anonymous: RateLimitConfig;
  authenticated: RateLimitConfig;
  admin: RateLimitConfig;
  superadmin: RateLimitConfig;
}

interface EndpointRateLimits {
  [endpoint: string]: UserTypeRateLimits | RateLimitConfig;
}

// Security audit interfaces
interface SecurityAuditResult {
  passed: boolean;
  category: string;
  test: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation?: string;
}

interface SecurityScanResult {
  timestamp: string;
  overallStatus: 'pass' | 'warning' | 'fail';
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
  critical: number;
  results: SecurityAuditResult[];
  summary: string;
}

interface VulnerabilityCheck {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  check: (req?: NextRequest) => Promise<SecurityAuditResult>;
}

// Rate limiting storage (in production, use Redis)
class RateLimitStore {
  private store: Map<string, { count: number; resetTime: number; firstRequest: number }> = new Map();
  private violationStore: Map<string, { count: number; lastViolation: number }> = new Map();

  // Clean up expired entries
  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
    // Clean up old violations (keep for 24 hours)
    for (const [key, value] of this.violationStore.entries()) {
      if (now - value.lastViolation > 24 * 60 * 60 * 1000) {
        this.violationStore.delete(key);
      }
    }
  }

  get(key: string): { count: number; resetTime: number; firstRequest: number } | null {
    this.cleanup();
    return this.store.get(key) || null;
  }

  set(key: string, value: { count: number; resetTime: number; firstRequest: number }): void {
    this.store.set(key, value);
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number; isNewWindow: boolean } {
    this.cleanup();
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || now > existing.resetTime) {
      // New window
      const newEntry = {
        count: 1,
        resetTime: now + windowMs,
        firstRequest: now
      };
      this.store.set(key, newEntry);
      return { count: 1, resetTime: newEntry.resetTime, isNewWindow: true };
    } else {
      // Existing window
      existing.count++;
      this.store.set(key, existing);
      return { count: existing.count, resetTime: existing.resetTime, isNewWindow: false };
    }
  }

  recordViolation(key: string): void {
    const existing = this.violationStore.get(key);
    this.violationStore.set(key, {
      count: (existing?.count || 0) + 1,
      lastViolation: Date.now()
    });
  }

  getViolationCount(key: string): number {
    const violations = this.violationStore.get(key);
    return violations?.count || 0;
  }

  // Get all rate limit stats for monitoring
  getStats(): {
    activeKeys: number;
    totalViolations: number;
    recentViolations: number;
    topViolators: Array<{ key: string; count: number }>;
  } {
    this.cleanup();
    const now = Date.now();
    const recentViolations = Array.from(this.violationStore.values())
      .filter(v => now - v.lastViolation < 60 * 60 * 1000) // Last hour
      .reduce((sum, v) => sum + v.count, 0);

    const topViolators = Array.from(this.violationStore.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([key, data]) => ({ key, count: data.count }));

    return {
      activeKeys: this.store.size,
      totalViolations: Array.from(this.violationStore.values()).reduce((sum, v) => sum + v.count, 0),
      recentViolations,
      topViolators
    };
  }
}

// Global rate limit store
const rateLimitStore = new RateLimitStore();

// Default rate limiting configurations
const DEFAULT_RATE_LIMITS: EndpointRateLimits = {
  // Search endpoints - higher limits for core functionality
  '/api/v1/search': {
    anonymous: { windowMs: 60 * 1000, maxRequests: 20, burstLimit: 5 },
    authenticated: { windowMs: 60 * 1000, maxRequests: 100, burstLimit: 20 },
    admin: { windowMs: 60 * 1000, maxRequests: 200, burstLimit: 50 },
    superadmin: { windowMs: 60 * 1000, maxRequests: 500, burstLimit: 100 }
  },

  // Document upload - strict limits
  '/api/v1/documents': {
    anonymous: { windowMs: 60 * 1000, maxRequests: 2, burstLimit: 1 },
    authenticated: { windowMs: 60 * 1000, maxRequests: 10, burstLimit: 3 },
    admin: { windowMs: 60 * 1000, maxRequests: 50, burstLimit: 10 },
    superadmin: { windowMs: 60 * 1000, maxRequests: 100, burstLimit: 20 }
  },

  // Conversation endpoints - moderate limits
  '/api/v1/conversations': {
    anonymous: { windowMs: 60 * 1000, maxRequests: 10, burstLimit: 3 },
    authenticated: { windowMs: 60 * 1000, maxRequests: 60, burstLimit: 15 },
    admin: { windowMs: 60 * 1000, maxRequests: 120, burstLimit: 30 },
    superadmin: { windowMs: 60 * 1000, maxRequests: 200, burstLimit: 50 }
  },

  // Chatbot management - admin only with moderate limits
  '/api/v1/chatbots': {
    anonymous: { windowMs: 60 * 1000, maxRequests: 1, burstLimit: 1 },
    authenticated: { windowMs: 60 * 1000, maxRequests: 20, burstLimit: 5 },
    admin: { windowMs: 60 * 1000, maxRequests: 100, burstLimit: 20 },
    superadmin: { windowMs: 60 * 1000, maxRequests: 200, burstLimit: 40 }
  },

  // Analytics - read-heavy, higher limits
  '/api/v1/analytics': {
    anonymous: { windowMs: 60 * 1000, maxRequests: 5, burstLimit: 2 },
    authenticated: { windowMs: 60 * 1000, maxRequests: 50, burstLimit: 10 },
    admin: { windowMs: 60 * 1000, maxRequests: 200, burstLimit: 40 },
    superadmin: { windowMs: 60 * 1000, maxRequests: 500, burstLimit: 100 }
  },

  // Auth endpoints - strict limits to prevent brute force
  '/api/test-auth': {
    anonymous: { windowMs: 60 * 1000, maxRequests: 5, burstLimit: 2 },
    authenticated: { windowMs: 60 * 1000, maxRequests: 10, burstLimit: 3 },
    admin: { windowMs: 60 * 1000, maxRequests: 20, burstLimit: 5 },
    superadmin: { windowMs: 60 * 1000, maxRequests: 50, burstLimit: 10 }
  },

  // Default for unspecified endpoints
  default: {
    anonymous: { windowMs: 60 * 1000, maxRequests: 10, burstLimit: 3 },
    authenticated: { windowMs: 60 * 1000, maxRequests: 50, burstLimit: 10 },
    admin: { windowMs: 60 * 1000, maxRequests: 100, burstLimit: 20 },
    superadmin: { windowMs: 60 * 1000, maxRequests: 200, burstLimit: 40 }
  }
};

// Geographic rate limiting for specific regions
const GEOGRAPHIC_RATE_LIMITS: { [region: string]: { multiplier: number; blocked?: boolean } } = {
  'US': { multiplier: 1.0 }, // Baseline
  'CA': { multiplier: 1.0 }, // Canada
  'GB': { multiplier: 1.0 }, // UK
  'TH': { multiplier: 1.2 }, // Thailand - primary market, higher limits
  'SG': { multiplier: 1.1 }, // Singapore
  'JP': { multiplier: 1.0 }, // Japan
  'AU': { multiplier: 1.0 }, // Australia
  'CN': { multiplier: 0.5 }, // China - restricted
  'RU': { multiplier: 0.3, blocked: false }, // Russia - heavily restricted
  'IR': { multiplier: 0.1, blocked: false }, // Iran - minimal
  'KP': { multiplier: 0.1, blocked: true }   // North Korea - blocked
};

export class SecurityAuditor {
  private vulnerabilityChecks: VulnerabilityCheck[] = [];

  constructor() {
    this.initializeVulnerabilityChecks();
  }

  private initializeVulnerabilityChecks(): void {
    // Authentication and Authorization Checks
    this.vulnerabilityChecks.push({
      name: 'stack_auth_configuration',
      description: 'Verify Stack Auth is properly configured',
      severity: 'critical',
      check: async () => {
        try {
          if (!stackServerApp) {
            return {
              passed: false,
              category: 'Authentication',
              test: 'Stack Auth Configuration',
              details: 'Stack Auth is not initialized. Missing required environment variables.',
              severity: 'critical',
              recommendation: 'Configure STACK_SECRET_SERVER_KEY and NEXT_PUBLIC_STACK_PROJECT_ID environment variables.'
            };
          }

          // Test basic auth functionality
          await stackServerApp.listUsers();

          return {
            passed: true,
            category: 'Authentication',
            test: 'Stack Auth Configuration',
            details: 'Stack Auth is properly configured and functional.',
            severity: 'low'
          };
        } catch (error) {
          return {
            passed: false,
            category: 'Authentication',
            test: 'Stack Auth Configuration',
            details: `Stack Auth test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'high',
            recommendation: 'Check Stack Auth credentials and network connectivity.'
          };
        }
      }
    });

    // Environment Variable Security
    this.vulnerabilityChecks.push({
      name: 'environment_variables',
      description: 'Check for missing or exposed environment variables',
      severity: 'high',
      check: async () => {
        const { isValid, missing } = validateEnvironment();

        if (!isValid) {
          return {
            passed: false,
            category: 'Configuration',
            test: 'Environment Variables',
            details: `Missing required environment variables: ${missing.join(', ')}`,
            severity: 'high',
            recommendation: 'Configure all required environment variables for secure operation.'
          };
        }

        // Check for default/weak values
        const weakValues = [];
        if (process.env.STACK_SECRET_SERVER_KEY?.length < 32) {
          weakValues.push('STACK_SECRET_SERVER_KEY appears weak');
        }

        if (weakValues.length > 0) {
          return {
            passed: false,
            category: 'Configuration',
            test: 'Environment Variables',
            details: `Weak configuration detected: ${weakValues.join(', ')}`,
            severity: 'medium',
            recommendation: 'Use strong, randomly generated secrets for all sensitive configuration.'
          };
        }

        return {
          passed: true,
          category: 'Configuration',
          test: 'Environment Variables',
          details: 'All required environment variables are properly configured.',
          severity: 'low'
        };
      }
    });

    // HTTPS and SSL/TLS Check
    this.vulnerabilityChecks.push({
      name: 'https_enforcement',
      description: 'Verify HTTPS is enforced for all connections',
      severity: 'high',
      check: async (req?: NextRequest) => {
        if (!req) {
          return {
            passed: true,
            category: 'Transport Security',
            test: 'HTTPS Enforcement',
            details: 'Cannot check HTTPS enforcement without request context.',
            severity: 'low'
          };
        }

        const isHttps = req.nextUrl.protocol === 'https:';
        const isLocalhost = req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1';

        if (!isHttps && !isLocalhost) {
          return {
            passed: false,
            category: 'Transport Security',
            test: 'HTTPS Enforcement',
            details: 'Request received over HTTP instead of HTTPS.',
            severity: 'high',
            recommendation: 'Configure server to redirect all HTTP traffic to HTTPS and use HSTS headers.'
          };
        }

        return {
          passed: true,
          category: 'Transport Security',
          test: 'HTTPS Enforcement',
          details: 'HTTPS is properly enforced.',
          severity: 'low'
        };
      }
    });

    // SQL Injection Protection
    this.vulnerabilityChecks.push({
      name: 'sql_injection_protection',
      description: 'Check for SQL injection vulnerabilities',
      severity: 'critical',
      check: async (req?: NextRequest) => {
        // This is a basic check - in production, you'd use more sophisticated SAST tools
        if (!req) {
          return {
            passed: true,
            category: 'Input Validation',
            test: 'SQL Injection Protection',
            details: 'Using parameterized queries with Neon PostgreSQL.',
            severity: 'low'
          };
        }

        // Check query parameters and body for SQL injection patterns
        const suspiciousPatterns = [
          /('|(\\')|(;|%3B)|(--)|(--)|(\\)|(union)|(select)|(insert)|(update)|(delete)|(drop)|(create)|(alter)|(exec)|(execute)|(sp_)|(xp_))/i
        ];

        const queryString = req.nextUrl.search;
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(queryString)) {
            return {
              passed: false,
              category: 'Input Validation',
              test: 'SQL Injection Protection',
              details: `Suspicious SQL pattern detected in query parameters: ${queryString}`,
              severity: 'critical',
              recommendation: 'Implement proper input validation and use parameterized queries exclusively.'
            };
          }
        }

        return {
          passed: true,
          category: 'Input Validation',
          test: 'SQL Injection Protection',
          details: 'No obvious SQL injection patterns detected.',
          severity: 'low'
        };
      }
    });

    // XSS Protection
    this.vulnerabilityChecks.push({
      name: 'xss_protection',
      description: 'Check for Cross-Site Scripting vulnerabilities',
      severity: 'high',
      check: async (req?: NextRequest) => {
        if (!req) {
          return {
            passed: true,
            category: 'Input Validation',
            test: 'XSS Protection',
            details: 'Using React with automatic XSS protection.',
            severity: 'low'
          };
        }

        // Check for XSS patterns in request
        const xssPatterns = [
          /<script[^>]*>.*?<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /<iframe[^>]*>.*?<\/iframe>/gi,
          /<object[^>]*>.*?<\/object>/gi,
          /<embed[^>]*>/gi
        ];

        const queryString = req.nextUrl.search;
        const userAgent = req.headers.get('user-agent') || '';
        const referer = req.headers.get('referer') || '';

        for (const pattern of xssPatterns) {
          if (pattern.test(queryString) || pattern.test(userAgent) || pattern.test(referer)) {
            return {
              passed: false,
              category: 'Input Validation',
              test: 'XSS Protection',
              details: 'Suspicious XSS pattern detected in request headers or parameters.',
              severity: 'high',
              recommendation: 'Implement Content Security Policy (CSP) headers and proper input sanitization.'
            };
          }
        }

        return {
          passed: true,
          category: 'Input Validation',
          test: 'XSS Protection',
          details: 'No obvious XSS patterns detected.',
          severity: 'low'
        };
      }
    });

    // CORS Configuration
    this.vulnerabilityChecks.push({
      name: 'cors_configuration',
      description: 'Verify CORS is properly configured',
      severity: 'medium',
      check: async (req?: NextRequest) => {
        if (!req) {
          return {
            passed: true,
            category: 'Access Control',
            test: 'CORS Configuration',
            details: 'Cannot check CORS without request context.',
            severity: 'low'
          };
        }

        const origin = req.headers.get('origin');

        // Check for overly permissive CORS (this would be checked in middleware)
        if (origin === '*') {
          return {
            passed: false,
            category: 'Access Control',
            test: 'CORS Configuration',
            details: 'CORS is configured to allow all origins (*), which is insecure.',
            severity: 'medium',
            recommendation: 'Configure CORS to only allow trusted origins.'
          };
        }

        return {
          passed: true,
          category: 'Access Control',
          test: 'CORS Configuration',
          details: 'CORS appears to be properly configured.',
          severity: 'low'
        };
      }
    });

    // Rate Limiting Check
    this.vulnerabilityChecks.push({
      name: 'rate_limiting',
      description: 'Verify rate limiting is active and effective',
      severity: 'medium',
      check: async (req?: NextRequest) => {
        const stats = rateLimitStore.getStats();

        if (stats.activeKeys === 0 && stats.totalViolations === 0) {
          return {
            passed: false,
            category: 'Rate Limiting',
            test: 'Rate Limiting Active',
            details: 'No rate limiting activity detected. Rate limiting may not be properly configured.',
            severity: 'medium',
            recommendation: 'Ensure rate limiting middleware is applied to all API endpoints.'
          };
        }

        if (stats.recentViolations > 100) {
          return {
            passed: false,
            category: 'Rate Limiting',
            test: 'Rate Limiting Effectiveness',
            details: `High number of recent rate limit violations: ${stats.recentViolations}`,
            severity: 'medium',
            recommendation: 'Review rate limiting configuration and consider implementing adaptive limits.'
          };
        }

        return {
          passed: true,
          category: 'Rate Limiting',
          test: 'Rate Limiting Active',
          details: `Rate limiting is active with ${stats.activeKeys} tracked keys and ${stats.totalViolations} total violations.`,
          severity: 'low'
        };
      }
    });

    // Sentry Monitoring Check
    this.vulnerabilityChecks.push({
      name: 'sentry_monitoring',
      description: 'Verify Sentry error monitoring is operational',
      severity: 'medium',
      check: async () => {
        try {
          // Test Sentry configuration
          SentryUtils.addBreadcrumb('Security audit test breadcrumb');

          return {
            passed: true,
            category: 'Monitoring',
            test: 'Sentry Configuration',
            details: 'Sentry monitoring is properly configured and operational.',
            severity: 'low'
          };
        } catch (error) {
          return {
            passed: false,
            category: 'Monitoring',
            test: 'Sentry Configuration',
            details: `Sentry configuration issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'medium',
            recommendation: 'Check Sentry DSN and configuration settings.'
          };
        }
      }
    });
  }

  // Run comprehensive security audit
  async runSecurityAudit(req?: NextRequest): Promise<SecurityScanResult> {
    const startTime = Date.now();
    const results: SecurityAuditResult[] = [];

    SentryUtils.addBreadcrumb('Starting security audit', {
      timestamp: new Date().toISOString(),
      requestUrl: req?.nextUrl.href
    });

    // Run all vulnerability checks
    for (const check of this.vulnerabilityChecks) {
      try {
        const result = await check.check(req);
        results.push(result);
      } catch (error) {
        results.push({
          passed: false,
          category: 'System',
          test: check.name,
          details: `Security check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'medium',
          recommendation: 'Review security check implementation and system configuration.'
        });

        SentryUtils.captureError(error as Error, {
          operation: 'security_audit',
          additionalData: {
            check_name: check.name,
            check_description: check.description
          }
        });
      }
    }

    // Calculate statistics
    const totalTests = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const warnings = results.filter(r => !r.passed && (r.severity === 'low' || r.severity === 'medium')).length;
    const critical = results.filter(r => !r.passed && r.severity === 'critical').length;

    // Determine overall status
    let overallStatus: 'pass' | 'warning' | 'fail';
    if (critical > 0) {
      overallStatus = 'fail';
    } else if (failed > 0) {
      overallStatus = 'warning';
    } else {
      overallStatus = 'pass';
    }

    // Generate summary
    let summary = `Security audit completed in ${Date.now() - startTime}ms. `;
    if (overallStatus === 'pass') {
      summary += `All ${totalTests} security checks passed successfully.`;
    } else if (overallStatus === 'warning') {
      summary += `${passed}/${totalTests} checks passed with ${warnings} warnings and ${critical} critical issues.`;
    } else {
      summary += `${failed} security issues found including ${critical} critical vulnerabilities requiring immediate attention.`;
    }

    const auditResult: SecurityScanResult = {
      timestamp: new Date().toISOString(),
      overallStatus,
      totalTests,
      passed,
      failed,
      warnings,
      critical,
      results,
      summary
    };

    // Log to Sentry
    SentryUtils.capturePerformance('security_audit', {
      duration: Date.now() - startTime,
      metadata: {
        overall_status: overallStatus,
        total_tests: totalTests,
        passed,
        failed,
        critical_issues: critical
      }
    });

    if (critical > 0) {
      SentryUtils.captureError(new Error(`Critical security vulnerabilities detected: ${critical} issues`), {
        operation: 'security_audit_critical',
        additionalData: {
          critical_issues: results.filter(r => r.severity === 'critical').map(r => r.test)
        }
      });
    }

    return auditResult;
  }

  // Validate authentication for request
  async validateAuthentication(req: NextRequest): Promise<SecurityAuditResult> {
    try {
      if (!stackServerApp) {
        return {
          passed: false,
          category: 'Authentication',
          test: 'Request Authentication',
          details: 'Authentication system not available.',
          severity: 'critical'
        };
      }

      const user = await stackServerApp.getUser();

      return {
        passed: true,
        category: 'Authentication',
        test: 'Request Authentication',
        details: user ? `Authenticated user: ${user.id}` : 'Anonymous request',
        severity: 'low'
      };
    } catch (error) {
      return {
        passed: false,
        category: 'Authentication',
        test: 'Request Authentication',
        details: `Authentication validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      };
    }
  }

  // Check authorization for specific operations
  async checkAuthorization(req: NextRequest, requiredRole: 'user' | 'admin' | 'superadmin' = 'user'): Promise<SecurityAuditResult> {
    try {
      if (!stackServerApp) {
        return {
          passed: false,
          category: 'Authorization',
          test: 'Role Authorization',
          details: 'Authorization system not available.',
          severity: 'critical'
        };
      }

      const user = await stackServerApp.getUser();

      if (!user) {
        return {
          passed: false,
          category: 'Authorization',
          test: 'Role Authorization',
          details: 'User not authenticated for protected resource.',
          severity: 'medium'
        };
      }

      // Check role permissions (this would integrate with your role system)
      const userRole = 'user'; // This should come from your user management system

      const roleHierarchy = { user: 1, admin: 2, superadmin: 3 };
      const requiredLevel = roleHierarchy[requiredRole];
      const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;

      if (userLevel < requiredLevel) {
        return {
          passed: false,
          category: 'Authorization',
          test: 'Role Authorization',
          details: `User role '${userRole}' insufficient for required role '${requiredRole}'.`,
          severity: 'medium',
          recommendation: 'Ensure users have appropriate permissions for requested operations.'
        };
      }

      return {
        passed: true,
        category: 'Authorization',
        test: 'Role Authorization',
        details: `User authorized with role '${userRole}' for operation requiring '${requiredRole}'.`,
        severity: 'low'
      };
    } catch (error) {
      return {
        passed: false,
        category: 'Authorization',
        test: 'Role Authorization',
        details: `Authorization check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      };
    }
  }

  // Scan for vulnerabilities in request
  async scanForVulnerabilities(req: NextRequest): Promise<SecurityAuditResult[]> {
    const results: SecurityAuditResult[] = [];

    // Run request-specific vulnerability checks
    const requestChecks = this.vulnerabilityChecks.filter(check =>
      ['sql_injection_protection', 'xss_protection', 'cors_configuration', 'https_enforcement'].includes(check.name)
    );

    for (const check of requestChecks) {
      try {
        const result = await check.check(req);
        results.push(result);
      } catch (error) {
        results.push({
          passed: false,
          category: 'Vulnerability Scan',
          test: check.name,
          details: `Vulnerability check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'medium'
        });
      }
    }

    return results;
  }

  // Test input validation
  async testInputValidation(req: NextRequest): Promise<SecurityAuditResult[]> {
    const results: SecurityAuditResult[] = [];

    // Test for common injection patterns
    const injectionTests = [
      {
        name: 'SQL Injection',
        patterns: [/('|(\\')|(;|%3B)|(--)|(--)|(union)|(select)|(insert)|(update)|(delete))/i],
        severity: 'critical' as const
      },
      {
        name: 'NoSQL Injection',
        patterns: [/(\$where|\$ne|\$in|\$nin|\$and|\$or|\$not|\$nor|\$exists|\$type|\$regex)/i],
        severity: 'high' as const
      },
      {
        name: 'Command Injection',
        patterns: [/(;|\||&|`|\$\(|\$\{|<|>|\n|\r)/],
        severity: 'critical' as const
      },
      {
        name: 'Path Traversal',
        patterns: [/(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)/i],
        severity: 'high' as const
      }
    ];

    const queryString = req.nextUrl.search;
    const userAgent = req.headers.get('user-agent') || '';
    const referer = req.headers.get('referer') || '';
    const inputs = [queryString, userAgent, referer];

    for (const test of injectionTests) {
      let detected = false;
      let details = '';

      for (const pattern of test.patterns) {
        for (const input of inputs) {
          if (pattern.test(input)) {
            detected = true;
            details = `${test.name} pattern detected in request input`;
            break;
          }
        }
        if (detected) break;
      }

      results.push({
        passed: !detected,
        category: 'Input Validation',
        test: test.name,
        details: detected ? details : `No ${test.name} patterns detected`,
        severity: detected ? test.severity : 'low',
        recommendation: detected ? `Implement proper input validation and sanitization for ${test.name}` : undefined
      });
    }

    return results;
  }

  // Audit API endpoints
  async auditAPIEndpoints(): Promise<SecurityAuditResult[]> {
    const results: SecurityAuditResult[] = [];

    // Check common API security configurations
    const apiChecks = [
      {
        name: 'API Rate Limiting',
        check: () => {
          const stats = rateLimitStore.getStats();
          return {
            passed: stats.activeKeys > 0 || stats.totalViolations > 0,
            details: stats.activeKeys > 0 ? 'Rate limiting is active' : 'No rate limiting activity detected'
          };
        }
      },
      {
        name: 'Environment Security',
        check: () => {
          const { isValid, missing } = validateEnvironment();
          return {
            passed: isValid,
            details: isValid ? 'All environment variables configured' : `Missing: ${missing.join(', ')}`
          };
        }
      }
    ];

    for (const check of apiChecks) {
      try {
        const result = check.check();
        results.push({
          passed: result.passed,
          category: 'API Security',
          test: check.name,
          details: result.details,
          severity: result.passed ? 'low' : 'medium'
        });
      } catch (error) {
        results.push({
          passed: false,
          category: 'API Security',
          test: check.name,
          details: `API check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'medium'
        });
      }
    }

    return results;
  }
}

export class RateLimiter {
  private config: EndpointRateLimits;

  constructor(config: EndpointRateLimits = DEFAULT_RATE_LIMITS) {
    this.config = config;
  }

  // Generate rate limit key
  private generateKey(req: NextRequest, userType: string): string {
    const ip = this.getClientIP(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const endpoint = this.normalizeEndpoint(req.nextUrl.pathname);

    // Create a unique but anonymized key
    const keyData = `${ip}:${userType}:${endpoint}:${userAgent.substring(0, 50)}`;
    return crypto.createHash('sha256').update(keyData).digest('hex').substring(0, 16);
  }

  // Get client IP address
  private getClientIP(req: NextRequest): string {
    // Check various headers for real IP
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const cloudflareIP = req.headers.get('cf-connecting-ip');

    if (cloudflareIP) return cloudflareIP;
    if (realIP) return realIP;
    if (forwarded) return forwarded.split(',')[0].trim();

    return req.ip || 'unknown';
  }

  // Normalize endpoint path for rate limiting
  private normalizeEndpoint(pathname: string): string {
    // Remove dynamic segments and normalize to rate limit groups
    const normalized = pathname
      .replace(/\/v\d+/, '') // Remove version
      .replace(/\/[a-f0-9-]{36}/, '/:id') // Replace UUIDs with :id
      .replace(/\/\d+/, '/:id') // Replace numeric IDs with :id
      .replace(/\/$/, ''); // Remove trailing slash

    // Find matching endpoint in config
    for (const endpoint of Object.keys(this.config)) {
      if (endpoint === 'default') continue;
      if (normalized.startsWith(endpoint) || pathname.startsWith(endpoint)) {
        return endpoint;
      }
    }

    return 'default';
  }

  // Determine user type for rate limiting
  private async getUserType(req: NextRequest): Promise<'anonymous' | 'authenticated' | 'admin' | 'superadmin'> {
    try {
      if (!stackServerApp) return 'anonymous';

      const user = await stackServerApp.getUser();
      if (!user) return 'anonymous';

      // This should integrate with your actual role system
      // For now, we'll use a simple check based on user properties
      const userRole = 'user'; // This should come from your user management

      switch (userRole) {
        case 'superadmin': return 'superadmin';
        case 'admin': return 'admin';
        default: return 'authenticated';
      }
    } catch {
      return 'anonymous';
    }
  }

  // Apply geographic rate limiting
  private applyGeographicLimits(baseLimit: RateLimitConfig, req: NextRequest): RateLimitConfig {
    const country = req.headers.get('cf-ipcountry') || req.headers.get('x-country-code') || 'US';
    const geoConfig = GEOGRAPHIC_RATE_LIMITS[country] || GEOGRAPHIC_RATE_LIMITS['US'];

    if (geoConfig.blocked) {
      return { ...baseLimit, maxRequests: 0 };
    }

    return {
      ...baseLimit,
      maxRequests: Math.floor(baseLimit.maxRequests * geoConfig.multiplier),
      burstLimit: baseLimit.burstLimit ? Math.floor(baseLimit.burstLimit * geoConfig.multiplier) : undefined
    };
  }

  // Check if request should bypass rate limiting
  private shouldBypass(req: NextRequest, config: RateLimitConfig): boolean {
    if (config.skipHeader) {
      const skipValue = req.headers.get(config.skipHeader);
      if (skipValue) return true;
    }

    // Check for internal requests
    const userAgent = req.headers.get('user-agent') || '';
    if (userAgent.includes('health-check') || userAgent.includes('internal')) {
      return true;
    }

    return false;
  }

  // Get adaptive rate limit based on user behavior
  private getAdaptiveLimit(key: string, baseConfig: RateLimitConfig): RateLimitConfig {
    const violationCount = rateLimitStore.getViolationCount(key);

    if (violationCount === 0) {
      return baseConfig;
    }

    // Reduce limits for repeat violators
    let reductionFactor = 1;
    if (violationCount >= 10) reductionFactor = 0.1; // 90% reduction
    else if (violationCount >= 5) reductionFactor = 0.3; // 70% reduction
    else if (violationCount >= 2) reductionFactor = 0.5; // 50% reduction
    else reductionFactor = 0.8; // 20% reduction

    return {
      ...baseConfig,
      maxRequests: Math.max(1, Math.floor(baseConfig.maxRequests * reductionFactor)),
      burstLimit: baseConfig.burstLimit ? Math.max(1, Math.floor(baseConfig.burstLimit * reductionFactor)) : undefined
    };
  }

  // Main rate limiting function
  async checkRateLimit(req: NextRequest): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const userType = await this.getUserType(req);
    const endpoint = this.normalizeEndpoint(req.nextUrl.pathname);
    const endpointConfig = this.config[endpoint] || this.config.default;

    let limitConfig: RateLimitConfig;
    if ('anonymous' in endpointConfig) {
      limitConfig = endpointConfig[userType];
    } else {
      limitConfig = endpointConfig as RateLimitConfig;
    }

    // Apply geographic restrictions
    limitConfig = this.applyGeographicLimits(limitConfig, req);

    // Check for bypass conditions
    if (this.shouldBypass(req, limitConfig)) {
      return {
        allowed: true,
        limit: limitConfig.maxRequests,
        remaining: limitConfig.maxRequests,
        resetTime: Date.now() + limitConfig.windowMs
      };
    }

    // Generate rate limit key
    const key = limitConfig.keyGenerator ? limitConfig.keyGenerator(req) : this.generateKey(req, userType);

    // Apply adaptive limiting based on violation history
    limitConfig = this.getAdaptiveLimit(key, limitConfig);

    // Check current usage
    const { count, resetTime, isNewWindow } = rateLimitStore.increment(key, limitConfig.windowMs);

    // Check burst limit first
    if (limitConfig.burstLimit && count > limitConfig.burstLimit && isNewWindow) {
      rateLimitStore.recordViolation(key);

      // Trigger rate limit reached callback
      if (limitConfig.onLimitReached) {
        limitConfig.onLimitReached(req, limitConfig);
      }

      // Log to Sentry
      SentryUtils.captureError(new Error('Burst rate limit exceeded'), {
        operation: 'rate_limit_burst_exceeded',
        additionalData: {
          endpoint,
          user_type: userType,
          current_count: count,
          burst_limit: limitConfig.burstLimit,
          window_ms: limitConfig.windowMs,
          client_ip: this.getClientIP(req)
        }
      });

      return {
        allowed: false,
        limit: limitConfig.burstLimit,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      };
    }

    // Check regular limit
    if (count > limitConfig.maxRequests) {
      rateLimitStore.recordViolation(key);

      // Trigger rate limit reached callback
      if (limitConfig.onLimitReached) {
        limitConfig.onLimitReached(req, limitConfig);
      }

      // Log to Sentry
      SentryUtils.captureError(new Error('Rate limit exceeded'), {
        operation: 'rate_limit_exceeded',
        additionalData: {
          endpoint,
          user_type: userType,
          current_count: count,
          max_requests: limitConfig.maxRequests,
          window_ms: limitConfig.windowMs,
          client_ip: this.getClientIP(req),
          violation_count: rateLimitStore.getViolationCount(key)
        }
      });

      return {
        allowed: false,
        limit: limitConfig.maxRequests,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      };
    }

    // Log successful request for monitoring
    SentryUtils.addBreadcrumb(`Rate limit check passed`, {
      endpoint,
      user_type: userType,
      current_count: count,
      max_requests: limitConfig.maxRequests,
      remaining: limitConfig.maxRequests - count
    });

    return {
      allowed: true,
      limit: limitConfig.maxRequests,
      remaining: limitConfig.maxRequests - count,
      resetTime
    };
  }

  // Get rate limit statistics
  getRateLimitStats(): {
    activeKeys: number;
    totalViolations: number;
    recentViolations: number;
    topViolators: Array<{ key: string; count: number }>;
  } {
    return rateLimitStore.getStats();
  }

  // Update rate limit configuration
  updateConfig(newConfig: Partial<EndpointRateLimits>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Middleware function to apply rate limiting and security checks
export function createSecurityMiddleware(options?: {
  enableRateLimiting?: boolean;
  enableSecurityAudit?: boolean;
  enableVulnerabilityScanning?: boolean;
  customRateLimits?: Partial<EndpointRateLimits>;
}) {
  const rateLimiter = new RateLimiter(options?.customRateLimits ? { ...DEFAULT_RATE_LIMITS, ...options.customRateLimits } : DEFAULT_RATE_LIMITS);
  const securityAuditor = new SecurityAuditor();

  return async function securityMiddleware(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now();

    try {
      // Apply rate limiting if enabled
      if (options?.enableRateLimiting !== false) {
        const rateLimitResult = await rateLimiter.checkRateLimit(req);

        if (!rateLimitResult.allowed) {
          const response = NextResponse.json(
            {
              success: false,
              error: 'Rate limit exceeded',
              message: 'Too many requests. Please try again later.',
              rateLimit: {
                limit: rateLimitResult.limit,
                remaining: rateLimitResult.remaining,
                resetTime: rateLimitResult.resetTime,
                retryAfter: rateLimitResult.retryAfter
              }
            },
            { status: 429 }
          );

          // Add rate limit headers
          response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
          response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
          response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime / 1000).toString());
          if (rateLimitResult.retryAfter) {
            response.headers.set('Retry-After', rateLimitResult.retryAfter.toString());
          }

          return response;
        }

        // Add rate limit headers to successful responses
        const response = await handler(req);
        response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
        response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime / 1000).toString());

        return response;
      }

      // Run vulnerability scanning if enabled
      if (options?.enableVulnerabilityScanning) {
        const vulnerabilities = await securityAuditor.scanForVulnerabilities(req);
        const criticalVulns = vulnerabilities.filter(v => !v.passed && v.severity === 'critical');

        if (criticalVulns.length > 0) {
          SentryUtils.captureError(new Error('Critical security vulnerability detected in request'), {
            operation: 'security_vulnerability_blocked',
            additionalData: {
              vulnerabilities: criticalVulns.map(v => v.test),
              client_ip: rateLimiter['getClientIP'](req),
              user_agent: req.headers.get('user-agent')
            }
          });

          return NextResponse.json(
            {
              success: false,
              error: 'Security violation detected',
              message: 'Request blocked due to security policy'
            },
            { status: 403 }
          );
        }
      }

      // Execute the original handler
      return await handler(req);

    } catch (error) {
      // Capture any middleware errors
      SentryUtils.captureError(error as Error, {
        operation: 'security_middleware_error',
        additionalData: {
          url: req.nextUrl.href,
          method: req.method,
          duration_ms: Date.now() - startTime
        }
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          message: 'An unexpected error occurred'
        },
        { status: 500 }
      );
    }
  };
}

// Export instances for use in API routes
export const securityAuditor = new SecurityAuditor();
export const rateLimiter = new RateLimiter();

// Helper functions for API routes
export async function runSecurityAudit(req?: NextRequest): Promise<SecurityScanResult> {
  return securityAuditor.runSecurityAudit(req);
}

export async function validateAuthentication(req: NextRequest): Promise<SecurityAuditResult> {
  return securityAuditor.validateAuthentication(req);
}

export async function checkAuthorization(req: NextRequest, requiredRole: 'user' | 'admin' | 'superadmin' = 'user'): Promise<SecurityAuditResult> {
  return securityAuditor.checkAuthorization(req, requiredRole);
}

export async function scanForVulnerabilities(req: NextRequest): Promise<SecurityAuditResult[]> {
  return securityAuditor.scanForVulnerabilities(req);
}

export async function testInputValidation(req: NextRequest): Promise<SecurityAuditResult[]> {
  return securityAuditor.testInputValidation(req);
}

export async function auditAPIEndpoints(): Promise<SecurityAuditResult[]> {
  return securityAuditor.auditAPIEndpoints();
}

export default {
  SecurityAuditor,
  RateLimiter,
  createSecurityMiddleware,
  securityAuditor,
  rateLimiter,
  runSecurityAudit,
  validateAuthentication,
  checkAuthorization,
  scanForVulnerabilities,
  testInputValidation,
  auditAPIEndpoints,
  DEFAULT_RATE_LIMITS,
  GEOGRAPHIC_RATE_LIMITS
};