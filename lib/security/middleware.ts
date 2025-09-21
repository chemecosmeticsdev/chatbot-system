import { NextRequest, NextResponse } from 'next/server';
import { createSecurityMiddleware, rateLimiter, securityAuditor } from './audit-and-rate-limiting';
import { withSentryMonitoring } from '@/lib/monitoring/api-wrapper';

// Enhanced middleware that combines security, rate limiting, and monitoring
export function withSecurityAndRateLimit<T = any>(
  handler: (req: NextRequest, context?: Record<string, any>) => Promise<NextResponse<T>>,
  options?: {
    enableRateLimiting?: boolean;
    enableSecurityAudit?: boolean;
    enableVulnerabilityScanning?: boolean;
    customRateLimits?: any;
    requiredRole?: 'user' | 'admin' | 'superadmin';
    operationName?: string;
  }
) {
  const securityMiddleware = createSecurityMiddleware({
    enableRateLimiting: options?.enableRateLimiting !== false,
    enableSecurityAudit: options?.enableSecurityAudit,
    enableVulnerabilityScanning: options?.enableVulnerabilityScanning !== false,
    customRateLimits: options?.customRateLimits
  });

  return withSentryMonitoring(
    async (req: NextRequest, context?: Record<string, any>): Promise<NextResponse<T>> => {
      return securityMiddleware(req, async (secureReq) => {
        // Additional authorization check if required
        if (options?.requiredRole) {
          const authResult = await securityAuditor.checkAuthorization(secureReq, options.requiredRole);
          if (!authResult.passed) {
            return NextResponse.json(
              {
                success: false,
                error: 'Insufficient permissions',
                message: authResult.details,
                category: authResult.category
              },
              { status: 403 }
            ) as NextResponse<T>;
          }
        }

        return handler(secureReq, context);
      }) as Promise<NextResponse<T>>;
    },
    {
      operationName: options?.operationName
    }
  );
}

// Specialized middleware for different endpoint types
export function withSearchSecurity<T = any>(
  handler: (req: NextRequest, context?: Record<string, any>) => Promise<NextResponse<T>>,
  operationName?: string
) {
  return withSecurityAndRateLimit(handler, {
    enableRateLimiting: true,
    enableVulnerabilityScanning: true,
    customRateLimits: {
      '/api/v1/search': {
        anonymous: { windowMs: 60 * 1000, maxRequests: 20, burstLimit: 5 },
        authenticated: { windowMs: 60 * 1000, maxRequests: 100, burstLimit: 20 },
        admin: { windowMs: 60 * 1000, maxRequests: 200, burstLimit: 50 },
        superadmin: { windowMs: 60 * 1000, maxRequests: 500, burstLimit: 100 }
      }
    },
    operationName: operationName || 'search_endpoint'
  });
}

export function withDocumentSecurity<T = any>(
  handler: (req: NextRequest, context?: Record<string, any>) => Promise<NextResponse<T>>,
  operationName?: string
) {
  return withSecurityAndRateLimit(handler, {
    enableRateLimiting: true,
    enableVulnerabilityScanning: true,
    requiredRole: 'user', // Documents require authentication
    customRateLimits: {
      '/api/v1/documents': {
        anonymous: { windowMs: 60 * 1000, maxRequests: 2, burstLimit: 1 },
        authenticated: { windowMs: 60 * 1000, maxRequests: 10, burstLimit: 3 },
        admin: { windowMs: 60 * 1000, maxRequests: 50, burstLimit: 10 },
        superadmin: { windowMs: 60 * 1000, maxRequests: 100, burstLimit: 20 }
      }
    },
    operationName: operationName || 'document_endpoint'
  });
}

export function withChatbotSecurity<T = any>(
  handler: (req: NextRequest, context?: Record<string, any>) => Promise<NextResponse<T>>,
  operationName?: string
) {
  return withSecurityAndRateLimit(handler, {
    enableRateLimiting: true,
    enableVulnerabilityScanning: true,
    requiredRole: 'user', // Chatbot management requires authentication
    customRateLimits: {
      '/api/v1/chatbots': {
        anonymous: { windowMs: 60 * 1000, maxRequests: 1, burstLimit: 1 },
        authenticated: { windowMs: 60 * 1000, maxRequests: 20, burstLimit: 5 },
        admin: { windowMs: 60 * 1000, maxRequests: 100, burstLimit: 20 },
        superadmin: { windowMs: 60 * 1000, maxRequests: 200, burstLimit: 40 }
      }
    },
    operationName: operationName || 'chatbot_endpoint'
  });
}

export function withConversationSecurity<T = any>(
  handler: (req: NextRequest, context?: Record<string, any>) => Promise<NextResponse<T>>,
  operationName?: string
) {
  return withSecurityAndRateLimit(handler, {
    enableRateLimiting: true,
    enableVulnerabilityScanning: true,
    customRateLimits: {
      '/api/v1/conversations': {
        anonymous: { windowMs: 60 * 1000, maxRequests: 10, burstLimit: 3 },
        authenticated: { windowMs: 60 * 1000, maxRequests: 60, burstLimit: 15 },
        admin: { windowMs: 60 * 1000, maxRequests: 120, burstLimit: 30 },
        superadmin: { windowMs: 60 * 1000, maxRequests: 200, burstLimit: 50 }
      }
    },
    operationName: operationName || 'conversation_endpoint'
  });
}

export function withAnalyticsSecurity<T = any>(
  handler: (req: NextRequest, context?: Record<string, any>) => Promise<NextResponse<T>>,
  operationName?: string
) {
  return withSecurityAndRateLimit(handler, {
    enableRateLimiting: true,
    enableVulnerabilityScanning: true,
    requiredRole: 'user', // Analytics require authentication
    customRateLimits: {
      '/api/v1/analytics': {
        anonymous: { windowMs: 60 * 1000, maxRequests: 5, burstLimit: 2 },
        authenticated: { windowMs: 60 * 1000, maxRequests: 50, burstLimit: 10 },
        admin: { windowMs: 60 * 1000, maxRequests: 200, burstLimit: 40 },
        superadmin: { windowMs: 60 * 1000, maxRequests: 500, burstLimit: 100 }
      }
    },
    operationName: operationName || 'analytics_endpoint'
  });
}

export function withAdminSecurity<T = any>(
  handler: (req: NextRequest, context?: Record<string, any>) => Promise<NextResponse<T>>,
  operationName?: string
) {
  return withSecurityAndRateLimit(handler, {
    enableRateLimiting: true,
    enableVulnerabilityScanning: true,
    requiredRole: 'admin', // Admin endpoints require admin role
    customRateLimits: {
      'default': {
        anonymous: { windowMs: 60 * 1000, maxRequests: 0, burstLimit: 0 }, // No access
        authenticated: { windowMs: 60 * 1000, maxRequests: 5, burstLimit: 1 }, // Limited access
        admin: { windowMs: 60 * 1000, maxRequests: 100, burstLimit: 20 },
        superadmin: { windowMs: 60 * 1000, maxRequests: 200, burstLimit: 40 }
      }
    },
    operationName: operationName || 'admin_endpoint'
  });
}

export function withSuperAdminSecurity<T = any>(
  handler: (req: NextRequest, context?: Record<string, any>) => Promise<NextResponse<T>>,
  operationName?: string
) {
  return withSecurityAndRateLimit(handler, {
    enableRateLimiting: true,
    enableVulnerabilityScanning: true,
    requiredRole: 'superadmin', // SuperAdmin endpoints require superadmin role
    customRateLimits: {
      'default': {
        anonymous: { windowMs: 60 * 1000, maxRequests: 0, burstLimit: 0 }, // No access
        authenticated: { windowMs: 60 * 1000, maxRequests: 0, burstLimit: 0 }, // No access
        admin: { windowMs: 60 * 1000, maxRequests: 5, burstLimit: 1 }, // Very limited access
        superadmin: { windowMs: 60 * 1000, maxRequests: 200, burstLimit: 40 }
      }
    },
    operationName: operationName || 'superadmin_endpoint'
  });
}

// Public endpoints with basic security but higher rate limits
export function withPublicSecurity<T = any>(
  handler: (req: NextRequest, context?: Record<string, any>) => Promise<NextResponse<T>>,
  operationName?: string
) {
  return withSecurityAndRateLimit(handler, {
    enableRateLimiting: true,
    enableVulnerabilityScanning: true,
    customRateLimits: {
      'default': {
        anonymous: { windowMs: 60 * 1000, maxRequests: 30, burstLimit: 10 },
        authenticated: { windowMs: 60 * 1000, maxRequests: 100, burstLimit: 25 },
        admin: { windowMs: 60 * 1000, maxRequests: 200, burstLimit: 50 },
        superadmin: { windowMs: 60 * 1000, maxRequests: 500, burstLimit: 100 }
      }
    },
    operationName: operationName || 'public_endpoint'
  });
}

// Testing and health check endpoints with minimal restrictions
export function withTestSecurity<T = any>(
  handler: (req: NextRequest, context?: Record<string, any>) => Promise<NextResponse<T>>,
  operationName?: string
) {
  return withSecurityAndRateLimit(handler, {
    enableRateLimiting: true,
    enableVulnerabilityScanning: false, // Don't block test endpoints
    customRateLimits: {
      'default': {
        anonymous: { windowMs: 60 * 1000, maxRequests: 100, burstLimit: 20 },
        authenticated: { windowMs: 60 * 1000, maxRequests: 200, burstLimit: 40 },
        admin: { windowMs: 60 * 1000, maxRequests: 500, burstLimit: 100 },
        superadmin: { windowMs: 60 * 1000, maxRequests: 1000, burstLimit: 200 }
      }
    },
    operationName: operationName || 'test_endpoint'
  });
}

export default {
  withSecurityAndRateLimit,
  withSearchSecurity,
  withDocumentSecurity,
  withChatbotSecurity,
  withConversationSecurity,
  withAnalyticsSecurity,
  withAdminSecurity,
  withSuperAdminSecurity,
  withPublicSecurity,
  withTestSecurity
};