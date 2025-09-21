/**
 * Integration utilities for connecting SSE with existing services
 *
 * Provides helper functions to trigger SSE events from:
 * - Document processing pipeline
 * - Conversation services
 * - System monitoring
 * - Error handling
 * - Performance monitoring
 */

import {
  sseManager,
  createDocumentProcessingEvent,
  createConversationActivityEvent,
  createSystemHealthEvent,
  createErrorNotificationEvent,
  createChatbotMetricsEvent,
  type SSEEvent
} from './sse';
import { SentryUtils } from '@/lib/monitoring/sentry-utils';

/**
 * Document Processing Integration
 */
export class DocumentProcessingSSE {
  /**
   * Notify about document upload start
   */
  static async notifyUploadStarted(
    documentId: string,
    productId: string,
    organizationId: string,
    filename: string
  ) {
    const event = createDocumentProcessingEvent(
      documentId,
      productId,
      organizationId,
      'upload',
      0,
      filename,
      'processing'
    );

    await sseManager.broadcastEvent(event);
    SentryUtils.addBreadcrumb('Document upload started', { documentId, filename });
  }

  /**
   * Notify about OCR processing progress
   */
  static async notifyOCRProgress(
    documentId: string,
    productId: string,
    organizationId: string,
    filename: string,
    progress: number
  ) {
    const event = createDocumentProcessingEvent(
      documentId,
      productId,
      organizationId,
      'ocr',
      progress,
      filename,
      'processing'
    );

    await sseManager.broadcastEvent(event);
  }

  /**
   * Notify about chunking process
   */
  static async notifyChunkingStarted(
    documentId: string,
    productId: string,
    organizationId: string,
    filename: string
  ) {
    const event = createDocumentProcessingEvent(
      documentId,
      productId,
      organizationId,
      'chunking',
      75,
      filename,
      'processing'
    );

    await sseManager.broadcastEvent(event);
  }

  /**
   * Notify about embedding generation
   */
  static async notifyEmbeddingStarted(
    documentId: string,
    productId: string,
    organizationId: string,
    filename: string
  ) {
    const event = createDocumentProcessingEvent(
      documentId,
      productId,
      organizationId,
      'embedding',
      90,
      filename,
      'processing'
    );

    await sseManager.broadcastEvent(event);
  }

  /**
   * Notify about document processing completion
   */
  static async notifyProcessingCompleted(
    documentId: string,
    productId: string,
    organizationId: string,
    filename: string,
    processingTime: number
  ) {
    const event = createDocumentProcessingEvent(
      documentId,
      productId,
      organizationId,
      'completed',
      100,
      filename,
      'completed'
    );

    event.data.processingTime = processingTime;

    await sseManager.broadcastEvent(event);
    SentryUtils.addBreadcrumb('Document processing completed', {
      documentId,
      filename,
      processingTime
    });
  }

  /**
   * Notify about document processing failure
   */
  static async notifyProcessingFailed(
    documentId: string,
    productId: string,
    organizationId: string,
    filename: string,
    stage: 'upload' | 'ocr' | 'chunking' | 'embedding' | 'indexing',
    error: string
  ) {
    const event = createDocumentProcessingEvent(
      documentId,
      productId,
      organizationId,
      stage,
      0,
      filename,
      'failed',
      error
    );

    await sseManager.broadcastEvent(event);
    SentryUtils.captureError(new Error(`Document processing failed at ${stage}: ${error}`), {
      organizationId,
      operation: 'document_processing',
      additionalData: { documentId, productId, filename, stage }
    });
  }
}

/**
 * Conversation System Integration
 */
export class ConversationSSE {
  /**
   * Notify about new user message
   */
  static async notifyUserMessage(
    chatbotId: string,
    sessionId: string,
    messageId: string,
    organizationId?: string,
    userId?: string
  ) {
    const event = createConversationActivityEvent(
      chatbotId,
      sessionId,
      messageId,
      'user_message',
      organizationId,
      userId
    );

    await sseManager.broadcastEvent(event);
    SentryUtils.addBreadcrumb('User message received', { chatbotId, sessionId, messageId });
  }

  /**
   * Notify about bot response generation
   */
  static async notifyBotResponseStarted(
    chatbotId: string,
    sessionId: string,
    messageId: string,
    organizationId?: string,
    userId?: string
  ) {
    const event = createConversationActivityEvent(
      chatbotId,
      sessionId,
      messageId,
      'bot_response',
      organizationId,
      userId
    );

    event.data.status = 'processing';

    await sseManager.broadcastEvent(event);
  }

  /**
   * Notify about bot response completion
   */
  static async notifyBotResponseCompleted(
    chatbotId: string,
    sessionId: string,
    messageId: string,
    responseTime: number,
    organizationId?: string,
    userId?: string
  ) {
    const event = createConversationActivityEvent(
      chatbotId,
      sessionId,
      messageId,
      'bot_response',
      organizationId,
      userId,
      responseTime
    );

    await sseManager.broadcastEvent(event);
    SentryUtils.addBreadcrumb('Bot response completed', {
      chatbotId,
      sessionId,
      messageId,
      responseTime
    });
  }

  /**
   * Notify about conversation error
   */
  static async notifyConversationError(
    chatbotId: string,
    sessionId: string,
    messageId: string,
    error: string,
    organizationId?: string,
    userId?: string
  ) {
    const event = createConversationActivityEvent(
      chatbotId,
      sessionId,
      messageId,
      'bot_response',
      organizationId,
      userId,
      undefined,
      error
    );

    await sseManager.broadcastEvent(event);
    SentryUtils.captureError(new Error(`Conversation error: ${error}`), {
      chatbotId,
      sessionId,
      messageId,
      organizationId,
      userId,
      operation: 'conversation_error'
    });
  }
}

/**
 * System Health Monitoring Integration
 */
export class SystemHealthSSE {
  /**
   * Notify about database health
   */
  static async notifyDatabaseHealth(
    status: 'healthy' | 'degraded' | 'down',
    responseTime: number,
    organizationId?: string
  ) {
    const event = createSystemHealthEvent(
      'database',
      status,
      'response_time',
      responseTime,
      `Database response time: ${responseTime}ms`,
      1000, // 1 second threshold
      organizationId
    );

    await sseManager.broadcastEvent(event);

    if (status !== 'healthy') {
      SentryUtils.captureError(new Error(`Database health degraded: ${status}`), {
        organizationId,
        operation: 'system_health_monitoring',
        additionalData: { component: 'database', responseTime, status }
      });
    }
  }

  /**
   * Notify about vector search performance
   */
  static async notifyVectorSearchHealth(
    status: 'healthy' | 'degraded' | 'down',
    searchTime: number,
    organizationId?: string
  ) {
    const event = createSystemHealthEvent(
      'vector_search',
      status,
      'search_time',
      searchTime,
      `Vector search time: ${searchTime}ms`,
      200, // 200ms threshold per requirements
      organizationId
    );

    await sseManager.broadcastEvent(event);

    if (status !== 'healthy') {
      SentryUtils.captureError(new Error(`Vector search performance degraded: ${status}`), {
        organizationId,
        operation: 'vector_search_monitoring',
        additionalData: { searchTime, status }
      });
    }
  }

  /**
   * Notify about LLM API health
   */
  static async notifyLLMAPIHealth(
    status: 'healthy' | 'degraded' | 'down',
    responseTime: number,
    model: string,
    organizationId?: string
  ) {
    const event = createSystemHealthEvent(
      'llm_api',
      status,
      'api_response_time',
      responseTime,
      `${model} API response time: ${responseTime}ms`,
      5000, // 5 second threshold
      organizationId
    );

    // Add model info to the message instead of metadata
    event.data.message = `${model} API response time: ${responseTime}ms (model: ${model})`;

    await sseManager.broadcastEvent(event);

    if (status !== 'healthy') {
      SentryUtils.captureError(new Error(`LLM API health degraded: ${status}`), {
        organizationId,
        operation: 'llm_api_monitoring',
        additionalData: { model, responseTime, status }
      });
    }
  }

  /**
   * Notify about general system metrics
   */
  static async notifySystemMetrics(
    metric: string,
    value: number,
    threshold: number,
    message: string,
    organizationId?: string
  ) {
    const status: 'healthy' | 'degraded' | 'down' =
      value > threshold * 1.5 ? 'down' :
      value > threshold ? 'degraded' : 'healthy';

    const event = createSystemHealthEvent(
      'general',
      status,
      metric,
      value,
      message,
      threshold,
      organizationId
    );

    await sseManager.broadcastEvent(event);

    if (status !== 'healthy') {
      SentryUtils.addBreadcrumb('System metric threshold exceeded', {
        metric,
        value,
        threshold,
        status
      });
    }
  }
}

/**
 * Error Monitoring Integration
 */
export class ErrorMonitoringSSE {
  /**
   * Notify about application errors
   */
  static async notifyError(
    errorId: string,
    component: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    organizationId?: string,
    sentryIssueId?: string
  ) {
    const event = createErrorNotificationEvent(
      errorId,
      component,
      severity,
      message,
      organizationId,
      sentryIssueId
    );

    await sseManager.broadcastEvent(event);

    // Also log to Sentry with context
    SentryUtils.captureError(new Error(`Application error in ${component}: ${message}`), {
      organizationId,
      operation: 'error_notification',
      additionalData: {
        errorId,
        component,
        severity,
        sentryIssueId
      }
    });
  }

  /**
   * Notify about system errors
   */
  static async notifySystemError(
    component: string,
    error: Error,
    organizationId?: string
  ) {
    const errorId = `sys_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const sentryIssueId = SentryUtils.captureError(error, {
      organizationId,
      operation: 'system_error',
      additionalData: { component }
    });

    await this.notifyError(
      errorId,
      component,
      'high',
      error.message,
      organizationId,
      sentryIssueId
    );
  }

  /**
   * Notify about critical system failures
   */
  static async notifyCriticalFailure(
    component: string,
    message: string,
    organizationId?: string
  ) {
    const errorId = `critical_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await this.notifyError(
      errorId,
      component,
      'critical',
      message,
      organizationId
    );

    // Also trigger immediate alerts
    SentryUtils.captureError(new Error(`CRITICAL FAILURE in ${component}: ${message}`), {
      organizationId,
      operation: 'critical_system_failure',
      additionalData: { component, errorId }
    });
  }
}

/**
 * Chatbot Metrics Integration
 */
export class ChatbotMetricsSSE {
  /**
   * Notify about chatbot performance metrics
   */
  static async notifyMetricsUpdate(
    chatbotId: string,
    organizationId: string,
    metrics: {
      activeConversations: number;
      responseTime: number;
      successRate: number;
      tokenUsage: number;
      cost: number;
      userSatisfaction?: number;
    }
  ) {
    const event = createChatbotMetricsEvent(chatbotId, organizationId, metrics);

    await sseManager.broadcastEvent(event);
    SentryUtils.addBreadcrumb('Chatbot metrics updated', {
      chatbotId,
      organizationId,
      ...metrics
    });
  }

  /**
   * Notify about cost threshold alerts
   */
  static async notifyCostAlert(
    chatbotId: string,
    organizationId: string,
    currentCost: number,
    threshold: number
  ) {
    // First send metrics event
    await this.notifyMetricsUpdate(chatbotId, organizationId, {
      activeConversations: 0, // These would come from actual metrics
      responseTime: 0,
      successRate: 0,
      tokenUsage: 0,
      cost: currentCost
    });

    // Then send error notification
    await ErrorMonitoringSSE.notifyError(
      `cost_alert_${chatbotId}_${Date.now()}`,
      'cost_monitoring',
      'high',
      `Chatbot ${chatbotId} has exceeded cost threshold: $${currentCost} > $${threshold}`,
      organizationId
    );
  }

  /**
   * Notify about performance degradation
   */
  static async notifyPerformanceDegradation(
    chatbotId: string,
    organizationId: string,
    metric: string,
    currentValue: number,
    threshold: number
  ) {
    await SystemHealthSSE.notifySystemMetrics(
      `chatbot_${metric}`,
      currentValue,
      threshold,
      `Chatbot ${chatbotId} ${metric} degraded: ${currentValue}`,
      organizationId
    );
  }
}

/**
 * Utility function to integrate SSE with existing API endpoints
 */
export function withSSEIntegration<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  eventGenerator: (...args: T) => SSEEvent | Promise<SSEEvent> | null
) {
  return async (...args: T): Promise<R> => {
    try {
      const result = await fn(...args);

      // Generate and broadcast event after successful operation
      const event = await eventGenerator(...args);
      if (event) {
        await sseManager.broadcastEvent(event);
      }

      return result;
    } catch (error) {
      // Generate error event if operation fails
      const errorEvent = await eventGenerator(...args);
      if (errorEvent) {
        errorEvent.priority = 'high';
        errorEvent.data.error = error instanceof Error ? error.message : 'Unknown error';
        await sseManager.broadcastEvent(errorEvent);
      }

      throw error;
    }
  };
}

/**
 * Middleware for Express-like frameworks to automatically emit SSE events
 */
export function sseMiddleware(eventType: string) {
  return (req: any, res: any, next: any) => {
    const originalSend = res.send;

    res.send = function(data: any) {
      // Emit SSE event after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const event: SSEEvent = {
          id: `api_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          type: eventType as any,
          timestamp: new Date().toISOString(),
          organizationId: req.user?.organizationId,
          userId: req.user?.id,
          data: {
            endpoint: req.originalUrl,
            method: req.method,
            statusCode: res.statusCode,
            responseData: typeof data === 'string' ? JSON.parse(data) : data
          },
          priority: 'low'
        };

        sseManager.broadcastEvent(event);
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

// All classes are already exported with their declarations above
// No need for additional export block