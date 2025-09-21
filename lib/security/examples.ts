/**
 * Security Integration Examples
 *
 * This file shows how to integrate the security audit and rate limiting system
 * with existing API endpoints using the provided middleware.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withSearchSecurity,
  withDocumentSecurity,
  withChatbotSecurity,
  withConversationSecurity,
  withAnalyticsSecurity,
  withAdminSecurity,
  withSuperAdminSecurity,
  withPublicSecurity,
  withTestSecurity
} from './middleware';

// Example 1: Secure Search Endpoint
// Replace existing withChatbotMonitoring with withSearchSecurity

async function searchHandler(req: NextRequest): Promise<NextResponse> {
  // Your existing search logic here
  return NextResponse.json({
    success: true,
    data: { results: [], total: 0 }
  });
}

// Instead of: export const POST = withChatbotMonitoring(searchHandler, 'vector_search');
// Use: export const POST = withSearchSecurity(searchHandler, 'vector_search');

// Example 2: Secure Document Upload Endpoint
// Requires authentication and has strict rate limits

async function documentUploadHandler(req: NextRequest): Promise<NextResponse> {
  // Your existing document upload logic here
  return NextResponse.json({
    success: true,
    data: { documentId: 'doc-123', status: 'uploaded' }
  });
}

// export const POST = withDocumentSecurity(documentUploadHandler, 'document_upload');

// Example 3: Secure Chatbot Management Endpoint
// Requires authentication with moderate rate limits

async function chatbotManagementHandler(req: NextRequest): Promise<NextResponse> {
  // Your existing chatbot management logic here
  return NextResponse.json({
    success: true,
    data: { chatbotId: 'bot-123', status: 'configured' }
  });
}

// export const POST = withChatbotSecurity(chatbotManagementHandler, 'chatbot_management');
// export const GET = withChatbotSecurity(chatbotManagementHandler, 'chatbot_get');

// Example 4: Secure Analytics Endpoint
// Requires authentication, read-heavy with higher limits

async function analyticsHandler(req: NextRequest): Promise<NextResponse> {
  // Your existing analytics logic here
  return NextResponse.json({
    success: true,
    data: { metrics: {}, reports: [] }
  });
}

// export const GET = withAnalyticsSecurity(analyticsHandler, 'analytics_get');

// Example 5: Admin-only Endpoint
// Requires admin role with restricted access

async function adminHandler(req: NextRequest): Promise<NextResponse> {
  // Your existing admin logic here
  return NextResponse.json({
    success: true,
    data: { message: 'Admin operation completed' }
  });
}

// export const POST = withAdminSecurity(adminHandler, 'admin_operation');

// Example 6: SuperAdmin-only Endpoint
// Requires superadmin role with very restricted access

async function superAdminHandler(req: NextRequest): Promise<NextResponse> {
  // Your existing superadmin logic here
  return NextResponse.json({
    success: true,
    data: { message: 'SuperAdmin operation completed' }
  });
}

// export const POST = withSuperAdminSecurity(superAdminHandler, 'superadmin_operation');

// Example 7: Public Endpoint with Basic Security
// No authentication required but with rate limiting

async function publicHandler(req: NextRequest): Promise<NextResponse> {
  // Your existing public logic here
  return NextResponse.json({
    success: true,
    data: { message: 'Public information' }
  });
}

// export const GET = withPublicSecurity(publicHandler, 'public_info');

// Example 8: Test Endpoint with Minimal Restrictions
// For testing and health checks

async function testHandler(req: NextRequest): Promise<NextResponse> {
  // Your existing test logic here
  return NextResponse.json({
    success: true,
    data: { status: 'ok', timestamp: new Date().toISOString() }
  });
}

// export const GET = withTestSecurity(testHandler, 'health_check');

// Example 9: How to migrate existing API routes

/**
 * BEFORE (existing route):
 *
 * import { withChatbotMonitoring } from '@/lib/monitoring/api-wrapper';
 *
 * async function handler(req: NextRequest): Promise<NextResponse> {
 *   // Your logic here
 * }
 *
 * export const POST = withChatbotMonitoring(handler, 'operation_name');
 */

/**
 * AFTER (with security):
 *
 * import { withSearchSecurity } from '@/lib/security/middleware';
 *
 * async function handler(req: NextRequest): Promise<NextResponse> {
 *   // Your logic here (unchanged)
 * }
 *
 * export const POST = withSearchSecurity(handler, 'operation_name');
 */

// Example 10: Custom Security Configuration
// For endpoints that need special rate limiting rules

import { withSecurityAndRateLimit } from './middleware';

async function customHandler(req: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ success: true });
}

// Custom rate limits for a specific endpoint
const customSecuredHandler = withSecurityAndRateLimit(customHandler, {
  enableRateLimiting: true,
  enableVulnerabilityScanning: true,
  requiredRole: 'admin',
  customRateLimits: {
    '/api/custom': {
      anonymous: { windowMs: 60 * 1000, maxRequests: 5, burstLimit: 2 },
      authenticated: { windowMs: 60 * 1000, maxRequests: 25, burstLimit: 8 },
      admin: { windowMs: 60 * 1000, maxRequests: 100, burstLimit: 25 },
      superadmin: { windowMs: 60 * 1000, maxRequests: 200, burstLimit: 50 }
    }
  },
  operationName: 'custom_secure_operation'
});

// Example 11: Error Handling with Security Context

async function errorHandlingExample(req: NextRequest): Promise<NextResponse> {
  try {
    // Your business logic here
    throw new Error('Something went wrong');
  } catch (error) {
    // Security middleware automatically captures errors with full context
    // including IP, user agent, rate limiting status, etc.

    return NextResponse.json({
      success: false,
      error: 'Operation failed',
      message: process.env.NODE_ENV === 'development'
        ? (error as Error).message
        : 'An unexpected error occurred'
    }, { status: 500 });
  }
}

// Example 12: How Security Headers Are Added Automatically

/**
 * The security middleware automatically adds these headers to responses:
 *
 * X-RateLimit-Limit: Maximum requests allowed in window
 * X-RateLimit-Remaining: Remaining requests in current window
 * X-RateLimit-Reset: Unix timestamp when window resets
 * Retry-After: Seconds to wait before retrying (on rate limit exceeded)
 *
 * These headers help clients implement proper backoff strategies.
 */

// Example 13: Monitoring Integration

/**
 * All security middleware automatically integrates with:
 *
 * 1. Sentry - Error tracking with security context
 * 2. Rate Limiting - Automatic violation tracking
 * 3. Security Monitoring - Event recording and alerting
 * 4. Performance Monitoring - Response time tracking
 *
 * No additional code needed - it's all handled by the middleware.
 */

// Example 14: Development vs Production Behavior

/**
 * In development:
 * - More detailed error messages
 * - Security warnings in console
 * - Test endpoints more accessible
 *
 * In production:
 * - Generic error messages for security
 * - All security events logged to Sentry
 * - Stricter rate limiting enforcement
 */

export {
  searchHandler,
  documentUploadHandler,
  chatbotManagementHandler,
  analyticsHandler,
  adminHandler,
  superAdminHandler,
  publicHandler,
  testHandler,
  customSecuredHandler,
  errorHandlingExample
};