# Security Audit and Rate Limiting System

This comprehensive security system provides automated security auditing, adaptive rate limiting, real-time monitoring, and integration with Stack Auth and Sentry for the chatbot platform.

## 🚀 Quick Start

### 1. Basic API Protection

```typescript
// Apply security to any API endpoint
import { withSearchSecurity } from '@/lib/security/middleware';

async function handler(req: NextRequest): Promise<NextResponse> {
  // Your API logic here
  return NextResponse.json({ success: true });
}

export const POST = withSearchSecurity(handler, 'my_endpoint');
```

### 2. Run Security Audit

```bash
# Test the security audit endpoint
curl -X GET "http://localhost:3000/api/test-security?test=audit"

# Run specific security tests
curl -X GET "http://localhost:3000/api/test-security?test=auth"
curl -X GET "http://localhost:3000/api/test-security?test=rate"
curl -X GET "http://localhost:3000/api/test-security?test=vuln"
```

### 3. Monitor Security Events

```bash
# Get security metrics
curl -X GET "http://localhost:3000/api/security/monitoring?type=metrics"

# View recent security events
curl -X GET "http://localhost:3000/api/security/monitoring?type=events&hours=24"

# Check security health
curl -X GET "http://localhost:3000/api/security/monitoring?type=health"
```

## 📊 Features

### 🔒 Security Audit System

- **Authentication Flow Validation**: Verifies Stack Auth configuration and user authentication
- **Authorization Testing**: Tests role-based access controls for user, admin, and superadmin roles
- **Vulnerability Scanning**: Detects SQL injection, XSS, CSRF, and other common vulnerabilities
- **Input Validation**: Tests for injection patterns and malicious input
- **Environment Security**: Validates configuration and environment variables
- **API Security Assessment**: Audits endpoint security configurations

### 🚦 Adaptive Rate Limiting

- **Per-Endpoint Limits**: Different rate limits for different API endpoints
- **User-Type Based**: Anonymous, authenticated, admin, and superadmin users have different limits
- **Geographic Restrictions**: Rate limiting based on country/region
- **Adaptive Behavior**: Automatic limit reduction for repeat violators
- **Burst Protection**: Separate burst limits for sudden traffic spikes
- **DDoS Protection**: Multiple layers of protection against attacks

### 📈 Real-Time Monitoring

- **Security Event Tracking**: Real-time recording and analysis of security events
- **Attack Pattern Detection**: Automated detection of common attack patterns
- **Alerting System**: Immediate alerts for critical security issues
- **Performance Monitoring**: Track security impact on system performance
- **Compliance Reporting**: Generate security compliance reports

### 🔧 Integration Points

- **Stack Auth Integration**: Seamless integration with existing authentication
- **Sentry Monitoring**: Automatic error tracking and performance monitoring
- **Database Integration**: Secure database operations with monitoring
- **AWS Integration**: Secure cloud service interactions

## 📖 Usage Guide

### Security Middleware Types

#### 1. Search Endpoints
```typescript
import { withSearchSecurity } from '@/lib/security/middleware';
export const POST = withSearchSecurity(handler, 'vector_search');
```
- **Rate Limits**: 20-500 req/min based on user type
- **Features**: Vulnerability scanning, input validation
- **Best For**: Search APIs, public endpoints with moderate usage

#### 2. Document Management
```typescript
import { withDocumentSecurity } from '@/lib/security/middleware';
export const POST = withDocumentSecurity(handler, 'document_upload');
```
- **Rate Limits**: 2-100 req/min (strict for uploads)
- **Features**: Authentication required, file validation
- **Best For**: File uploads, document processing

#### 3. Chatbot Management
```typescript
import { withChatbotSecurity } from '@/lib/security/middleware';
export const POST = withChatbotSecurity(handler, 'chatbot_create');
```
- **Rate Limits**: 1-200 req/min based on user type
- **Features**: Authentication required, admin operations
- **Best For**: Chatbot CRUD operations

#### 4. Analytics Endpoints
```typescript
import { withAnalyticsSecurity } from '@/lib/security/middleware';
export const GET = withAnalyticsSecurity(handler, 'analytics_report');
```
- **Rate Limits**: 5-500 req/min (read-heavy workloads)
- **Features**: Authentication required, high throughput
- **Best For**: Reporting, dashboard APIs

#### 5. Admin Operations
```typescript
import { withAdminSecurity } from '@/lib/security/middleware';
export const POST = withAdminSecurity(handler, 'admin_operation');
```
- **Rate Limits**: 0-200 req/min (admin role required)
- **Features**: Admin role enforcement, audit logging
- **Best For**: Administrative functions

#### 6. SuperAdmin Operations
```typescript
import { withSuperAdminSecurity } from '@/lib/security/middleware';
export const POST = withSuperAdminSecurity(handler, 'system_config');
```
- **Rate Limits**: 0-200 req/min (superadmin only)
- **Features**: Highest security level, full audit trail
- **Best For**: System configuration, critical operations

### Custom Security Configuration

```typescript
import { withSecurityAndRateLimit } from '@/lib/security/middleware';

const customHandler = withSecurityAndRateLimit(handler, {
  enableRateLimiting: true,
  enableVulnerabilityScanning: true,
  requiredRole: 'admin',
  customRateLimits: {
    '/api/custom': {
      anonymous: { windowMs: 60000, maxRequests: 10, burstLimit: 3 },
      authenticated: { windowMs: 60000, maxRequests: 50, burstLimit: 15 },
      admin: { windowMs: 60000, maxRequests: 200, burstLimit: 50 },
      superadmin: { windowMs: 60000, maxRequests: 500, burstLimit: 100 }
    }
  },
  operationName: 'custom_secure_operation'
});
```

### Security Event Recording

```typescript
import { securityMonitor } from '@/lib/security/monitoring';

// Record custom security events
const eventId = securityMonitor.recordSecurityEvent({
  type: 'suspicious_activity',
  severity: 'high',
  source: 'my_component',
  details: 'Unusual user behavior detected',
  metadata: {
    userId: 'user-123',
    action: 'bulk_download',
    timestamp: new Date().toISOString()
  }
});
```

### Running Security Audits

```typescript
import { runSecurityAudit } from '@/lib/security/audit-and-rate-limiting';

// Run comprehensive security audit
const auditResult = await runSecurityAudit(req);

if (auditResult.overallStatus === 'fail') {
  console.error(`Security audit failed: ${auditResult.critical} critical issues`);
}
```

## 🔧 Configuration

### Rate Limiting Configuration

```typescript
// Default rate limits (can be customized)
const rateLimits = {
  '/api/v1/search': {
    anonymous: { windowMs: 60000, maxRequests: 20, burstLimit: 5 },
    authenticated: { windowMs: 60000, maxRequests: 100, burstLimit: 20 },
    admin: { windowMs: 60000, maxRequests: 200, burstLimit: 50 },
    superadmin: { windowMs: 60000, maxRequests: 500, burstLimit: 100 }
  }
};
```

### Geographic Rate Limiting

```typescript
// Automatic geographic restrictions
const geographicLimits = {
  'US': { multiplier: 1.0 },       // Baseline
  'TH': { multiplier: 1.2 },       // Thailand - primary market
  'CN': { multiplier: 0.5 },       // China - restricted
  'RU': { multiplier: 0.3 },       // Russia - heavily restricted
  'KP': { blocked: true }          // North Korea - blocked
};
```

### Attack Pattern Detection

The system automatically detects:
- **SQL Injection**: Multiple injection attempts
- **XSS Attacks**: Cross-site scripting patterns
- **Brute Force**: Failed login attempts
- **Rate Limit Evasion**: Attempts to bypass limits
- **Data Exfiltration**: Unusual access patterns
- **Geographic Anomalies**: Access from unusual locations

## 📊 Monitoring and Alerting

### Security Metrics

- **Rate Limiting Stats**: Active keys, violations, top violators
- **Authentication Metrics**: Login success/failure rates
- **Vulnerability Counts**: Critical/high/medium/low severity issues
- **Performance Impact**: Response times, error rates
- **Geographic Distribution**: Requests by country

### Alert Thresholds

```typescript
// Configurable alert thresholds
const alertThresholds = {
  criticalEvents: 1,        // Immediate alert
  highEvents: 5,            // Alert after 5 high-severity events
  mediumEvents: 20,         // Alert after 20 medium-severity events
  rateLimitViolations: 100, // Alert after 100 violations/hour
  errorRate: 0.05,          // Alert if error rate > 5%
  responseTime: 5000        // Alert if response time > 5s
};
```

### Automated Actions

When attack patterns are detected:
- **Block IP**: Temporary IP blocking
- **Block User**: User account suspension
- **Throttle Requests**: Reduce rate limits
- **Alert Security Team**: Immediate notifications
- **Create Incidents**: Automatic ticket creation

## 🚨 Security Response

### Response Headers

All protected endpoints automatically include:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
Retry-After: 60
```

### Error Responses

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "rateLimit": {
    "limit": 100,
    "remaining": 0,
    "resetTime": 1640995200,
    "retryAfter": 60
  }
}
```

## 🔗 API Endpoints

### Security Testing
- `GET /api/test-security` - Comprehensive security test
- `GET /api/test-security?test=auth` - Authentication test
- `GET /api/test-security?test=rate` - Rate limiting test
- `GET /api/test-security?test=vuln` - Vulnerability scan

### Security Management
- `GET /api/security/audit` - Run security audit
- `GET /api/security/monitoring` - Get security metrics
- `GET /api/security/rate-limit` - Rate limiting status

### Query Parameters
- `test`: Test type (all, auth, rate, vuln, audit, monitoring)
- `type`: Data type (metrics, events, unresolved, critical, health)
- `hours`: Time range for events (default: 24)

## 🛠️ Development

### Testing
```bash
# Run type checking
npm run type-check

# Test security endpoints
npm run test:security

# Run full test suite
npm run test:api
```

### Environment Variables
Required for full functionality:
```bash
# Stack Auth (authentication)
NEXT_PUBLIC_STACK_PROJECT_ID=your_project_id
STACK_SECRET_SERVER_KEY=your_secret_key

# Database (rate limiting storage)
DATABASE_URL=postgresql://...

# Sentry (monitoring)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

### Migration from Existing APIs

1. **Replace existing middleware**:
```typescript
// Before
import { withChatbotMonitoring } from '@/lib/monitoring/api-wrapper';
export const POST = withChatbotMonitoring(handler, 'operation');

// After
import { withSearchSecurity } from '@/lib/security/middleware';
export const POST = withSearchSecurity(handler, 'operation');
```

2. **No changes to handler logic required** - security is applied automatically
3. **Enhanced monitoring** - automatic security event tracking
4. **Better error handling** - automatic error reporting with context

## 📈 Performance Impact

- **Minimal Latency**: ~1-5ms overhead per request
- **Memory Efficient**: In-memory rate limiting with automatic cleanup
- **Scalable**: Designed for high-throughput applications
- **Production Ready**: Comprehensive error handling and monitoring

## 🔒 Security Best Practices

1. **Always use HTTPS** in production
2. **Regularly update rate limits** based on usage patterns
3. **Monitor security events** and respond to alerts promptly
4. **Keep authentication tokens secure** and rotate regularly
5. **Review security audits** and address issues quickly
6. **Use role-based access control** for sensitive operations
7. **Implement proper input validation** in addition to security middleware

## 🆘 Troubleshooting

### Common Issues

1. **Rate limit exceeded**: Check current limits and adjust if needed
2. **Authentication failures**: Verify Stack Auth configuration
3. **High security alerts**: Review recent activity and attack patterns
4. **Performance impact**: Monitor response times and optimize if needed

### Debug Mode

Enable detailed logging:
```bash
NODE_ENV=development npm run dev
```

### Support

For security issues or questions:
- Check Sentry for detailed error information
- Review security event logs
- Consult the security monitoring dashboard
- Contact the development team for critical issues

---

**⚠️ Security Notice**: This system provides multiple layers of security but should be part of a comprehensive security strategy including proper deployment practices, network security, and regular security reviews.