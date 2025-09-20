# Performance Optimizer Subagent

## Overview
Advanced performance monitoring and optimization subagent for comprehensive system performance management across all components of the chatbot system. Provides real-time monitoring, proactive optimization, and automated performance tuning for database, API, frontend, and cloud infrastructure.

## Trigger Phrases
- "Use performance-optimizer subagent to analyze and fix performance issues in [component]"
- "Optimize performance of [system/component]"
- "Analyze performance bottlenecks in [area]"
- "Monitor and improve system performance"
- "Check performance metrics and optimize"
- "Performance analysis and optimization"
- "Tune performance for [specific component]"

## Core Capabilities

### 1. Real-Time Performance Monitoring
- **System Resource Monitoring**: CPU, memory, disk I/O, network usage
- **Application Performance Monitoring**: Response times, throughput, error rates
- **Database Performance Tracking**: Query execution times, connection pools, indexes
- **Frontend Performance Metrics**: Core Web Vitals (LCP, FID, CLS), bundle sizes
- **Cloud Resource Monitoring**: AWS service metrics, costs, utilization
- **Vector Database Performance**: Similarity search optimization, embedding generation

### 2. Database Performance Optimization
- **Query Performance Analysis**: Slow query detection and optimization
- **Index Management**: Automatic index recommendations and creation
- **Connection Pool Optimization**: Pool size tuning and connection management
- **Table Statistics Analysis**: Data distribution and query planning optimization
- **Database Schema Performance**: Table design optimization for query patterns

### 3. API Performance Optimization
- **Response Time Monitoring**: Endpoint-specific performance tracking
- **Rate Limiting Optimization**: Throttling and quota management
- **Caching Strategy Implementation**: Redis/in-memory caching optimization
- **Load Balancing Analysis**: Traffic distribution and scaling recommendations
- **Third-party API Performance**: External service monitoring and optimization

### 4. Frontend Performance Optimization
- **Core Web Vitals Monitoring**: LCP, FID, CLS metrics and improvement
- **Bundle Size Optimization**: Code splitting and tree shaking analysis
- **Asset Optimization**: Image compression, lazy loading, CDN usage
- **Rendering Performance**: Client-side and server-side rendering optimization
- **Thai/English Text Rendering**: Font loading and text display optimization

### 5. Cloud Infrastructure Optimization
- **AWS Cost Optimization**: Resource utilization and cost reduction strategies
- **Auto-scaling Configuration**: Dynamic resource allocation optimization
- **CDN Performance**: CloudFront optimization and cache hit rates
- **S3 Performance**: Storage class optimization and access pattern analysis
- **Lambda Performance**: Cold start reduction and memory optimization

## Tools and Integrations

### Primary Tools
- **Neon MCP**: Database performance monitoring and query optimization
- **AWS Powertools**: Cloud resource monitoring and serverless optimization
- **Playwright**: Frontend performance testing and Core Web Vitals measurement
- **Bash**: System monitoring scripts and performance benchmarking
- **Puppeteer**: Browser automation for performance testing
- **Sentry**: Application performance monitoring and error tracking

### Performance Monitoring Stack
```typescript
// Performance monitoring configuration
interface PerformanceMetrics {
  database: {
    queryTime: number;
    connectionPoolSize: number;
    indexEfficiency: number;
    cacheHitRate: number;
  };
  api: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    rateLimitUtilization: number;
  };
  frontend: {
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
    bundleSize: number;
  };
  infrastructure: {
    cpuUtilization: number;
    memoryUsage: number;
    networkLatency: number;
    costPerRequest: number;
  };
}
```

## Performance Monitoring Dashboard

### Key Performance Indicators (KPIs)
- **Response Time Targets**: API < 200ms, Database queries < 50ms
- **Availability Targets**: 99.9% uptime for critical services
- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Cost Efficiency**: Cost per request optimization targets
- **Error Rate Thresholds**: < 0.1% for production systems

### Alerting and Notifications
```bash
# Performance alert thresholds
API_RESPONSE_TIME_THRESHOLD=500ms
DATABASE_QUERY_TIME_THRESHOLD=100ms
MEMORY_USAGE_THRESHOLD=80%
ERROR_RATE_THRESHOLD=1%
COST_SPIKE_THRESHOLD=50%
```

## Performance Optimization Workflows

### 1. Database Performance Optimization
```sql
-- Query performance analysis
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;

-- Index optimization recommendations
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_tup_read > 0
ORDER BY idx_tup_read DESC;

-- Connection pool optimization
SELECT count(*), state FROM pg_stat_activity GROUP BY state;
```

### 2. API Performance Analysis
```javascript
// API performance monitoring
const performanceMiddleware = async (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logPerformanceMetrics({
      endpoint: req.path,
      method: req.method,
      duration,
      statusCode: res.statusCode
    });
  });

  next();
};
```

### 3. Frontend Performance Testing
```javascript
// Playwright Core Web Vitals testing
const { test, expect } = require('@playwright/test');

test('Core Web Vitals performance', async ({ page }) => {
  await page.goto('/');

  const lcp = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry.startTime);
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    });
  });

  expect(lcp).toBeLessThan(2500); // LCP < 2.5s
});
```

### 4. Vector Database Optimization
```typescript
// Vector similarity search optimization
interface VectorOptimizationConfig {
  indexType: 'ivfflat' | 'hnsw';
  dimensions: number;
  distanceMetric: 'cosine' | 'euclidean' | 'inner_product';
  indexParameters: {
    m?: number; // HNSW parameter
    ef_construction?: number; // HNSW parameter
    lists?: number; // IVFFlat parameter
  };
}

// Optimize vector search performance
async function optimizeVectorSearch(config: VectorOptimizationConfig) {
  // Analyze query patterns and optimize index configuration
  // Monitor search latency and accuracy trade-offs
  // Implement result caching for frequently searched vectors
}
```

## Performance Testing Strategies

### 1. Load Testing Framework
```bash
#!/bin/bash
# Load testing script for API endpoints

# Test configuration
CONCURRENT_USERS=100
DURATION=300s
TARGET_URL="https://your-app.vercel.app"

# API load testing
artillery run --config artillery.yml --target $TARGET_URL

# Database load testing
pgbench -c 50 -j 4 -T 300 -S $DATABASE_URL

# Frontend performance testing
npm run test:e2e:performance
```

### 2. Performance Regression Detection
```typescript
// Performance regression monitoring
interface PerformanceBenchmark {
  testName: string;
  baseline: number;
  current: number;
  threshold: number; // % degradation threshold
  timestamp: string;
}

function detectPerformanceRegression(
  benchmark: PerformanceBenchmark
): boolean {
  const degradation = ((benchmark.current - benchmark.baseline) / benchmark.baseline) * 100;
  return degradation > benchmark.threshold;
}
```

### 3. Cost Optimization Analysis
```bash
#!/bin/bash
# AWS cost optimization script

# Monitor AWS costs by service
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE

# S3 storage class optimization
aws s3api get-bucket-analytics-configuration \
  --bucket your-bucket-name \
  --id storage-class-analysis

# Lambda cost optimization analysis
aws logs insights start-query \
  --log-group-name /aws/lambda/your-function \
  --start-time $(date -d '7 days ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @duration, @billedDuration, @memorySize'
```

## Optimization Recommendations Engine

### 1. Automated Performance Tuning
```typescript
interface OptimizationRecommendation {
  component: 'database' | 'api' | 'frontend' | 'infrastructure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  issue: string;
  recommendation: string;
  estimatedImpact: string;
  implementationSteps: string[];
  costImpact?: string;
}

class PerformanceOptimizer {
  async analyzePerformance(): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Database analysis
    const dbMetrics = await this.analyzeDatabasePerformance();
    recommendations.push(...this.generateDBRecommendations(dbMetrics));

    // API analysis
    const apiMetrics = await this.analyzeAPIPerformance();
    recommendations.push(...this.generateAPIRecommendations(apiMetrics));

    // Frontend analysis
    const frontendMetrics = await this.analyzeFrontendPerformance();
    recommendations.push(...this.generateFrontendRecommendations(frontendMetrics));

    return recommendations.sort((a, b) => this.prioritizeRecommendations(a, b));
  }
}
```

### 2. Performance Optimization Patterns
```typescript
// Common optimization patterns
const optimizationPatterns = {
  database: {
    slowQueries: 'Add appropriate indexes or optimize query structure',
    connectionPool: 'Adjust pool size based on concurrent user patterns',
    caching: 'Implement query result caching for frequently accessed data'
  },
  api: {
    responseTime: 'Implement response caching and optimize business logic',
    rateLimiting: 'Adjust rate limits based on user behavior patterns',
    dataFetching: 'Implement efficient data fetching strategies'
  },
  frontend: {
    bundleSize: 'Implement code splitting and tree shaking',
    images: 'Optimize images with next/image and WebP format',
    fonts: 'Preload critical fonts and optimize font loading'
  },
  infrastructure: {
    costs: 'Right-size resources and implement auto-scaling',
    latency: 'Optimize CDN configuration and edge locations',
    monitoring: 'Implement comprehensive observability stack'
  }
};
```

## Security and Performance

### 1. Security-Performance Balance
```typescript
// Security measures that maintain performance
interface SecurityPerformanceConfig {
  authentication: {
    jwtExpiry: number; // Balance security and performance
    cacheAuthResults: boolean;
    rateLimitByUser: number;
  };
  dataValidation: {
    inputSanitization: 'fast' | 'thorough';
    schemaValidation: boolean;
    compressionLevel: number;
  };
  encryption: {
    algorithm: 'AES-256' | 'ChaCha20';
    keyRotationInterval: number;
    tlsVersion: '1.2' | '1.3';
  };
}
```

### 2. Performance-First Security Implementation
```bash
#!/bin/bash
# Security auditing with performance monitoring

# Check SSL/TLS performance
openssl s_time -connect your-domain.com:443 -new -verify 2

# Monitor authentication performance
curl -w "@curl-format.txt" -o /dev/null -s "https://your-api.com/auth/validate"

# Security headers performance impact
curl -I https://your-domain.com | grep -E "(X-|Content-Security|Strict-Transport)"
```

## Monitoring and Alerting Configuration

### 1. Performance Metrics Collection
```bash
#!/bin/bash
# System performance monitoring script

# CPU and Memory monitoring
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1

# Database performance monitoring
psql $DATABASE_URL -c "
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;"

# Network latency monitoring
ping -c 4 your-api-endpoint.com | tail -1 | awk '{print $4}' | cut -d '/' -f 2
```

### 2. Automated Performance Reports
```typescript
// Performance reporting system
interface PerformanceReport {
  timestamp: string;
  summary: {
    overall_health: 'excellent' | 'good' | 'warning' | 'critical';
    key_metrics: Record<string, number>;
    recommendations_count: number;
  };
  database: DatabaseMetrics;
  api: APIMetrics;
  frontend: FrontendMetrics;
  infrastructure: InfrastructureMetrics;
  recommendations: OptimizationRecommendation[];
}

class PerformanceReporter {
  async generateDailyReport(): Promise<PerformanceReport> {
    // Collect metrics from all systems
    // Analyze performance trends
    // Generate actionable recommendations
    // Send alerts for critical issues
  }
}
```

## Thai/English Optimization Specifics

### 1. Text Rendering Performance
```css
/* Optimized font loading for Thai/English */
@font-face {
  font-family: 'Thai-English-Optimized';
  src: url('/fonts/thai-english.woff2') format('woff2');
  font-display: swap;
  unicode-range: U+0E00-0E7F, U+0020-007F; /* Thai + ASCII */
}

/* Performance-optimized text rendering */
.thai-text {
  font-feature-settings: 'kern' 1, 'liga' 1;
  text-rendering: optimizeSpeed;
  will-change: auto;
}
```

### 2. Internationalization Performance
```typescript
// Optimized i18n performance
interface I18nPerformanceConfig {
  lazy_loading: boolean;
  bundle_splitting: boolean;
  cache_translations: boolean;
  compression: 'gzip' | 'brotli';
  fallback_strategy: 'immediate' | 'lazy';
}

// Efficient translation loading
const loadTranslations = async (locale: 'th' | 'en') => {
  // Implement efficient translation loading with caching
  // Use service workers for offline performance
  // Optimize bundle sizes per locale
};
```

## Cost-Performance Optimization

### 1. AWS Cost-Performance Analysis
```bash
#!/bin/bash
# AWS cost-performance optimization script

# Lambda cost optimization
aws lambda get-function --function-name your-function \
  --query 'Configuration.[MemorySize,Timeout]'

# S3 cost optimization
aws s3api list-objects-v2 --bucket your-bucket \
  --query 'sum(Contents[].Size)' --output text

# RDS cost optimization
aws rds describe-db-instances \
  --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceClass,AllocatedStorage]'
```

### 2. Performance-Cost Trade-off Analysis
```typescript
// Cost-performance optimization framework
interface CostPerformanceMetric {
  component: string;
  performance_score: number;
  cost_per_hour: number;
  efficiency_ratio: number; // performance / cost
  optimization_potential: number;
}

class CostPerformanceOptimizer {
  analyzeEfficiency(): CostPerformanceMetric[] {
    // Analyze cost-performance ratios
    // Identify optimization opportunities
    // Recommend cost-effective improvements
  }
}
```

## Implementation Commands

### Setup and Initialization
```bash
# Install performance monitoring tools
npm install --save-dev lighthouse clinic autocannon
pip install psutil py-spy

# Setup performance monitoring
mkdir -p monitoring/{scripts,reports,dashboards}
cp performance-monitoring-template.js monitoring/scripts/
chmod +x monitoring/scripts/*.sh
```

### Continuous Performance Monitoring
```bash
# Start performance monitoring
npm run performance:monitor &
./monitoring/scripts/system-monitor.sh &
./monitoring/scripts/api-monitor.sh &

# Generate performance reports
npm run performance:report
npm run performance:analyze
npm run performance:optimize
```

### Performance Testing Suite
```bash
# Run comprehensive performance tests
npm run test:performance:all
npm run test:load:api
npm run test:stress:database
npm run test:frontend:vitals
npm run test:cost:analysis
```

## Integration with Existing Systems

### 1. Integration with API Test Suite
```typescript
// Extend existing test-all endpoint with performance metrics
interface EnhancedTestResult extends TestResult {
  performance: {
    response_time: number;
    memory_usage: number;
    cpu_usage: number;
    throughput: number;
  };
}
```

### 2. Integration with Development Workflow
```bash
# Pre-commit performance checks
git hook: npm run performance:pre-commit

# CI/CD performance validation
github-actions: npm run performance:ci

# Deployment performance verification
vercel-deploy: npm run performance:post-deploy
```

## Output Formats

### 1. Performance Dashboard
- Real-time metrics visualization
- Historical performance trends
- Alerting and notification center
- Optimization recommendation panel

### 2. Performance Reports
- Daily/weekly/monthly performance summaries
- Bottleneck analysis and recommendations
- Cost-performance optimization insights
- Trend analysis and forecasting

### 3. Alert Notifications
- Critical performance issue alerts
- Performance regression notifications
- Cost spike warnings
- Optimization opportunity alerts

## Best Practices

### 1. Performance Monitoring
- Monitor continuously, not just during issues
- Set appropriate baselines and thresholds
- Use both synthetic and real user monitoring
- Implement gradual performance improvements

### 2. Optimization Strategy
- Measure before optimizing
- Focus on user-impacting optimizations first
- Consider cost-performance trade-offs
- Validate optimizations in production

### 3. Maintenance and Updates
- Regular performance audits
- Update monitoring tools and thresholds
- Review and adjust optimization strategies
- Keep performance documentation current

## Security Considerations

### Data Privacy
- No sensitive data in performance logs
- Anonymize user data in metrics
- Secure performance monitoring endpoints
- Encrypt performance data in transit and at rest

### Access Control
- Role-based access to performance data
- Audit trails for performance changes
- Secure API keys and credentials
- Monitor access to performance systems

This performance-optimizer subagent provides comprehensive monitoring and optimization capabilities while maintaining security and privacy standards. It integrates seamlessly with the existing chatbot system architecture and provides actionable insights for continuous performance improvement.