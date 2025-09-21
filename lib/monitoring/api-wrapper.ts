import { NextRequest, NextResponse } from 'next/server';
import { SentryUtils } from './sentry-utils';

export interface ApiContext {
  chatbotId?: string;
  sessionId?: string;
  organizationId?: string;
  userId?: string;
  operation?: string;
}

// Wrapper for API routes with automatic Sentry monitoring
export function withSentryMonitoring<T = any>(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse<any>>,
  options?: {
    operationName?: string;
    extractContext?: (req: NextRequest) => ApiContext;
  }
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse<any>> => {
    const startTime = Date.now();
    const operationName = options?.operationName || `${req.method} ${req.nextUrl.pathname}`;

    // Extract context from request
    const apiContext = options?.extractContext?.(req) || {};

    // Start Sentry transaction
    const transaction = SentryUtils.startTransaction(operationName, `API Route: ${req.nextUrl.pathname}`);

    // Add request context to Sentry
    SentryUtils.addBreadcrumb(`API Request: ${req.method} ${req.nextUrl.pathname}`, {
      method: req.method,
      url: req.nextUrl.href,
      user_agent: req.headers.get('user-agent'),
      ...apiContext
    });

    try {
      // Execute the handler
      const response = await handler(req, context);
      const duration = Date.now() - startTime;

      // Log successful response
      transaction.setStatus('ok');
      transaction.setData('response_status', response.status);
      transaction.setData('duration_ms', duration);

      // Capture performance metrics
      SentryUtils.capturePerformance(operationName, {
        ...apiContext,
        duration,
        metadata: {
          method: req.method,
          status: response.status,
          url: req.nextUrl.pathname
        }
      });

      // Log slow responses
      if (duration > 2000) {
        SentryUtils.addBreadcrumb(`Slow API Response: ${operationName}`, {
          duration_ms: duration,
          status: response.status,
          method: req.method
        }, 'warning');
      }

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;

      // Set transaction as failed
      transaction.setStatus('internal_error');
      transaction.setData('duration_ms', duration);

      // Capture error with full context
      SentryUtils.captureError(error as Error, {
        ...apiContext,
        operation: operationName,
        additionalData: {
          method: req.method,
          url: req.nextUrl.pathname,
          user_agent: req.headers.get('user-agent'),
          duration_ms: duration,
          request_body_size: req.headers.get('content-length'),
          request_id: req.headers.get('x-request-id')
        }
      });

      // Return error response
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'An unexpected error occurred'
        },
        { status: 500 }
      );

    } finally {
      transaction.finish();
    }
  };
}

// Helper to extract chatbot context from requests
export function extractChatbotContext(req: NextRequest): ApiContext {
  const url = req.nextUrl;
  const searchParams = url.searchParams;

  // Try to extract IDs from URL path
  const pathSegments = url.pathname.split('/');
  let chatbotId: string | undefined;
  let sessionId: string | undefined;
  let organizationId: string | undefined;

  // Look for chatbot ID in path like /api/v1/chatbots/{id}
  const chatbotIndex = pathSegments.indexOf('chatbots');
  if (chatbotIndex !== -1 && pathSegments[chatbotIndex + 1]) {
    chatbotId = pathSegments[chatbotIndex + 1];
  }

  // Look for conversation/session ID
  const conversationIndex = pathSegments.indexOf('conversations');
  if (conversationIndex !== -1 && pathSegments[conversationIndex + 1]) {
    sessionId = pathSegments[conversationIndex + 1];
  }

  // Try to get from query params
  chatbotId = chatbotId || searchParams.get('chatbot_id') || undefined;
  sessionId = sessionId || searchParams.get('session_id') || undefined;
  organizationId = searchParams.get('organization_id') || undefined;

  // Try to get from headers
  organizationId = organizationId || req.headers.get('x-organization-id') || undefined;
  const userId = req.headers.get('x-user-id') || undefined;

  return {
    chatbotId,
    sessionId,
    organizationId,
    userId,
    operation: `${req.method}_${pathSegments[pathSegments.length - 1]}`
  };
}

// Specialized wrapper for chatbot API routes
export function withChatbotMonitoring<T = any>(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse<any>>,
  operationName?: string
) {
  return withSentryMonitoring(handler, {
    operationName,
    extractContext: extractChatbotContext
  });
}

// Specialized wrapper for vector search operations
export function withVectorSearchMonitoring<T = any>(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse<any>>,
  operationName?: string
) {
  return withSentryMonitoring(handler, {
    operationName: operationName || 'vector_search',
    extractContext: (req) => ({
      ...extractChatbotContext(req),
      operation: 'vector_search'
    })
  });
}

// Wrapper for database operations
export function withDatabaseMonitoring<T>(
  operation: () => Promise<T>,
  context: {
    operation: string;
    table?: string;
    organizationId?: string;
    additionalData?: Record<string, any>;
  }
): Promise<T> {
  return SentryUtils.withPerformanceMonitoring(
    `db_${context.operation}${context.table ? `_${context.table}` : ''}`,
    operation,
    {
      operation_type: 'database',
      table: context.table,
      organization_id: context.organizationId,
      ...context.additionalData
    }
  );
}

// Wrapper for external API calls (LLM, OCR, etc.)
export function withExternalApiMonitoring<T>(
  operation: () => Promise<T>,
  context: {
    service: string;
    endpoint?: string;
    chatbotId?: string;
    sessionId?: string;
    additionalData?: Record<string, any>;
  }
): Promise<T> {
  return SentryUtils.withPerformanceMonitoring(
    `external_api_${context.service}`,
    operation,
    {
      operation_type: 'external_api',
      service: context.service,
      endpoint: context.endpoint,
      chatbot_id: context.chatbotId,
      session_id: context.sessionId,
      ...context.additionalData
    }
  );
}

export default {
  withSentryMonitoring,
  withChatbotMonitoring,
  withVectorSearchMonitoring,
  withDatabaseMonitoring,
  withExternalApiMonitoring,
  extractChatbotContext
};