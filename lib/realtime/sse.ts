/**
 * Server-Sent Events (SSE) Implementation for Real-time Dashboard Updates
 *
 * Provides comprehensive real-time updates for:
 * - Document processing status changes
 * - Conversation activity and new messages
 * - System health metrics and alerts
 * - Error notifications and system events
 * - Chatbot performance metrics
 *
 * Features:
 * - Connection management with automatic reconnection
 * - Event filtering by user permissions and organization
 * - Proper error handling and graceful degradation
 * - Connection pooling and resource management
 * - Support for multiple dashboard tabs
 * - Integration with Stack Auth and Sentry monitoring
 */

import { stackServerApp } from '@/stack';
import { SentryUtils } from '@/lib/monitoring/sentry-utils';
import type { User } from '@stackframe/stack';

// Event types that can be sent via SSE
export type SSEEventType =
  | 'document_processing'
  | 'conversation_activity'
  | 'system_health'
  | 'error_notification'
  | 'chatbot_metrics'
  | 'connection_status'
  | 'user_activity'
  | 'performance_alert';

// Base interface for all SSE events
export interface SSEEvent {
  id: string;
  type: SSEEventType;
  timestamp: string;
  organizationId?: string;
  userId?: string;
  chatbotId?: string;
  sessionId?: string;
  data: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Document processing event data
export interface DocumentProcessingEvent extends SSEEvent {
  type: 'document_processing';
  data: {
    documentId: string;
    productId: string;
    stage: 'upload' | 'ocr' | 'chunking' | 'embedding' | 'indexing' | 'completed' | 'failed';
    progress: number; // 0-100
    filename: string;
    status: 'processing' | 'completed' | 'failed';
    error?: string;
    processingTime?: number;
    metadata?: Record<string, any>;
  };
}

// Conversation activity event data
export interface ConversationActivityEvent extends SSEEvent {
  type: 'conversation_activity';
  data: {
    messageId: string;
    messageType: 'user_message' | 'bot_response' | 'system_message';
    content?: string; // Filtered based on permissions
    responseTime?: number;
    status: 'processing' | 'completed' | 'failed';
    error?: string;
    metadata?: Record<string, any>;
  };
}

// System health event data
export interface SystemHealthEvent extends SSEEvent {
  type: 'system_health';
  data: {
    component: 'database' | 'vector_search' | 'llm_api' | 'document_processing' | 'general';
    status: 'healthy' | 'degraded' | 'down';
    metric: string;
    value: number;
    threshold?: number;
    message: string;
    recommendation?: string;
  };
}

// Error notification event data
export interface ErrorNotificationEvent extends SSEEvent {
  type: 'error_notification';
  data: {
    errorId: string;
    component: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    stackTrace?: string;
    userImpact: 'none' | 'minor' | 'major' | 'critical';
    resolution?: string;
    sentryIssueId?: string;
  };
}

// Chatbot metrics event data
export interface ChatbotMetricsEvent extends SSEEvent {
  type: 'chatbot_metrics';
  data: {
    activeConversations: number;
    responseTime: number;
    successRate: number;
    tokenUsage: number;
    cost: number;
    userSatisfaction?: number;
    trends?: Record<string, number>;
  };
}

// Connection management interface
export interface SSEConnection {
  id: string;
  userId: string;
  organizationId?: string;
  userAgent: string;
  connectedAt: Date;
  lastActivity: Date;
  subscriptions: Set<SSEEventType>;
  permissions: string[];
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
  isActive: boolean;
}

// Rate limiting configuration
interface RateLimitConfig {
  maxConnectionsPerUser: number;
  maxEventsPerMinute: number;
  windowSizeMs: number;
}

// SSE Manager class for handling all connections and events
export class SSEManager {
  private connections = new Map<string, SSEConnection>();
  private userConnections = new Map<string, Set<string>>();
  private rateLimitConfig: RateLimitConfig = {
    maxConnectionsPerUser: 5,
    maxEventsPerMinute: 100,
    windowSizeMs: 60000 // 1 minute
  };
  private eventQueues = new Map<string, SSEEvent[]>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up inactive connections every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConnections();
    }, 30000);

    // Set up graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  /**
   * Create a new SSE connection for a user
   */
  async createConnection(
    userId: string,
    organizationId: string | undefined,
    userAgent: string,
    subscriptions: SSEEventType[] = []
  ): Promise<ReadableStream<Uint8Array> | null> {
    try {
      // Validate user authentication
      if (!stackServerApp) {
        throw new Error('Authentication system not available');
      }

      const user = await stackServerApp.getUser();
      if (!user || user.id !== userId) {
        SentryUtils.captureError(new Error('Unauthorized SSE connection attempt'), {
          userId,
          organizationId,
          operation: 'sse_connection'
        });
        return null;
      }

      // Check rate limits
      if (!this.checkRateLimit(userId)) {
        SentryUtils.captureError(new Error('SSE rate limit exceeded'), {
          userId,
          organizationId,
          operation: 'sse_rate_limit'
        });
        return null;
      }

      // Get user permissions
      const permissions = await this.getUserPermissions(user, organizationId);

      // Create connection ID
      const connectionId = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create readable stream
      const stream = new ReadableStream<Uint8Array>({
        start: (controller) => {
          const encoder = new TextEncoder();

          // Create connection object
          const connection: SSEConnection = {
            id: connectionId,
            userId,
            organizationId,
            userAgent,
            connectedAt: new Date(),
            lastActivity: new Date(),
            subscriptions: new Set(subscriptions),
            permissions,
            controller,
            encoder,
            isActive: true
          };

          // Store connection
          this.connections.set(connectionId, connection);

          // Track user connections
          if (!this.userConnections.has(userId)) {
            this.userConnections.set(userId, new Set());
          }
          this.userConnections.get(userId)!.add(connectionId);

          // Send connection established event
          this.sendToConnection(connection, {
            id: `conn_${connectionId}`,
            type: 'connection_status',
            timestamp: new Date().toISOString(),
            userId,
            organizationId,
            data: {
              status: 'connected',
              connectionId,
              subscriptions: Array.from(subscriptions),
              serverTime: new Date().toISOString()
            },
            priority: 'low'
          });

          // Send any queued events for this user
          this.sendQueuedEvents(connection);

          SentryUtils.addBreadcrumb('SSE connection established', {
            userId,
            organizationId,
            connectionId,
            subscriptions: Array.from(subscriptions)
          });
        },

        cancel: () => {
          this.removeConnection(connectionId);
        }
      });

      return stream;

    } catch (error) {
      SentryUtils.captureError(error as Error, {
        userId,
        organizationId,
        operation: 'sse_connection_creation'
      });
      return null;
    }
  }

  /**
   * Broadcast an event to all relevant connections
   */
  async broadcastEvent(event: SSEEvent): Promise<void> {
    try {
      const relevantConnections = this.getRelevantConnections(event);

      if (relevantConnections.length === 0) {
        // Queue event for future connections if it's important
        if (event.priority === 'high' || event.priority === 'critical') {
          this.queueEvent(event);
        }
        return;
      }

      // Send to all relevant connections
      const promises = relevantConnections.map(connection =>
        this.sendToConnection(connection, event)
      );

      await Promise.allSettled(promises);

      // Log successful broadcast
      SentryUtils.addBreadcrumb('SSE event broadcasted', {
        eventType: event.type,
        eventId: event.id,
        recipientCount: relevantConnections.length,
        priority: event.priority
      });

    } catch (error) {
      SentryUtils.captureError(error as Error, {
        operation: 'sse_broadcast',
        additionalData: {
          eventType: event.type,
          eventId: event.id
        }
      });
    }
  }

  /**
   * Send event to specific connection
   */
  private async sendToConnection(connection: SSEConnection, event: SSEEvent): Promise<boolean> {
    try {
      if (!connection.isActive) {
        return false;
      }

      // Check if connection is subscribed to this event type
      if (!connection.subscriptions.has(event.type)) {
        return false;
      }

      // Filter event data based on permissions
      const filteredEvent = this.filterEventByPermissions(event, connection.permissions);
      if (!filteredEvent) {
        return false;
      }

      // Format SSE message
      const sseMessage = this.formatSSEMessage(filteredEvent);

      // Send via stream
      connection.controller.enqueue(connection.encoder.encode(sseMessage));
      connection.lastActivity = new Date();

      return true;

    } catch (error) {
      // Connection likely closed, mark as inactive
      connection.isActive = false;
      SentryUtils.captureError(error as Error, {
        operation: 'sse_send_to_connection',
        additionalData: {
          connectionId: connection.id,
          eventType: event.type
        }
      });
      return false;
    }
  }

  /**
   * Get connections relevant to an event
   */
  private getRelevantConnections(event: SSEEvent): SSEConnection[] {
    const relevantConnections: SSEConnection[] = [];

    for (const connection of this.connections.values()) {
      if (!connection.isActive) continue;

      // Check organization filter
      if (event.organizationId && connection.organizationId !== event.organizationId) {
        continue;
      }

      // Check user filter for user-specific events
      if (event.userId && connection.userId !== event.userId) {
        continue;
      }

      // Check if user has permission to see this event
      if (!this.hasPermissionForEvent(connection.permissions, event)) {
        continue;
      }

      relevantConnections.push(connection);
    }

    return relevantConnections;
  }

  /**
   * Check if user has permission to see event
   */
  private hasPermissionForEvent(permissions: string[], event: SSEEvent): boolean {
    // System events require admin permissions
    if (event.type === 'system_health' || event.type === 'error_notification') {
      return permissions.includes('admin') || permissions.includes('monitor');
    }

    // Chatbot metrics require chatbot management permissions
    if (event.type === 'chatbot_metrics') {
      return permissions.includes('admin') || permissions.includes('chatbot_manager');
    }

    // Document processing and conversation events are generally accessible
    return true;
  }

  /**
   * Filter event data based on user permissions
   */
  private filterEventByPermissions(event: SSEEvent, permissions: string[]): SSEEvent | null {
    const isAdmin = permissions.includes('admin');
    const filteredEvent = { ...event };

    // For conversation events, filter sensitive data for non-admins
    if (event.type === 'conversation_activity' && !isAdmin) {
      const data = event.data as ConversationActivityEvent['data'];
      filteredEvent.data = {
        ...data,
        content: data.content ? '[FILTERED]' : undefined,
        error: data.error ? '[FILTERED]' : undefined
      };
    }

    // For error events, filter stack traces for non-admins
    if (event.type === 'error_notification' && !isAdmin) {
      const data = event.data as ErrorNotificationEvent['data'];
      filteredEvent.data = {
        ...data,
        stackTrace: undefined,
        sentryIssueId: undefined
      };
    }

    return filteredEvent;
  }

  /**
   * Format event as SSE message
   */
  private formatSSEMessage(event: SSEEvent): string {
    const lines: string[] = [];

    // Event ID
    lines.push(`id: ${event.id}`);

    // Event type
    lines.push(`event: ${event.type}`);

    // Data (JSON encoded)
    const eventData = {
      ...event,
      // Add server timestamp
      serverTimestamp: new Date().toISOString()
    };
    lines.push(`data: ${JSON.stringify(eventData)}`);

    // End with double newline
    lines.push('', '');

    return lines.join('\n');
  }

  /**
   * Queue event for future delivery
   */
  private queueEvent(event: SSEEvent): void {
    const key = event.organizationId || 'global';
    if (!this.eventQueues.has(key)) {
      this.eventQueues.set(key, []);
    }

    const queue = this.eventQueues.get(key)!;
    queue.push(event);

    // Keep only last 50 events per queue
    if (queue.length > 50) {
      queue.splice(0, queue.length - 50);
    }
  }

  /**
   * Send queued events to new connection
   */
  private sendQueuedEvents(connection: SSEConnection): void {
    const key = connection.organizationId || 'global';
    const queue = this.eventQueues.get(key);

    if (!queue || queue.length === 0) return;

    // Send last 10 events
    const eventsToSend = queue.slice(-10);
    for (const event of eventsToSend) {
      this.sendToConnection(connection, event);
    }
  }

  /**
   * Check rate limits for user
   */
  private checkRateLimit(userId: string): boolean {
    const userConnections = this.userConnections.get(userId);
    if (userConnections && userConnections.size >= this.rateLimitConfig.maxConnectionsPerUser) {
      return false;
    }
    return true;
  }

  /**
   * Get user permissions
   */
  private async getUserPermissions(user: User, organizationId?: string): Promise<string[]> {
    // Basic permissions - in a real app, this would query the database
    const permissions = ['user'];

    // Check if user is admin
    if (user.serverMetadata?.role === 'admin') {
      permissions.push('admin', 'monitor', 'chatbot_manager');
    }

    return permissions;
  }

  /**
   * Remove connection
   */
  private removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.isActive = false;
    this.connections.delete(connectionId);

    // Remove from user connections
    const userConnections = this.userConnections.get(connection.userId);
    if (userConnections) {
      userConnections.delete(connectionId);
      if (userConnections.size === 0) {
        this.userConnections.delete(connection.userId);
      }
    }

    SentryUtils.addBreadcrumb('SSE connection removed', {
      connectionId,
      userId: connection.userId,
      duration: Date.now() - connection.connectedAt.getTime()
    });
  }

  /**
   * Clean up inactive connections
   */
  private cleanupInactiveConnections(): void {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes

    for (const [connectionId, connection] of this.connections.entries()) {
      if (!connection.isActive || (now - connection.lastActivity.getTime()) > timeout) {
        this.removeConnection(connectionId);
      }
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    activeConnections: number;
    connectionsByUser: Record<string, number>;
    eventTypes: Record<SSEEventType, number>;
  } {
    const stats = {
      totalConnections: this.connections.size,
      activeConnections: 0,
      connectionsByUser: {} as Record<string, number>,
      eventTypes: {} as Record<SSEEventType, number>
    };

    for (const connection of this.connections.values()) {
      if (connection.isActive) {
        stats.activeConnections++;
      }

      stats.connectionsByUser[connection.userId] =
        (stats.connectionsByUser[connection.userId] || 0) + 1;

      for (const eventType of connection.subscriptions) {
        stats.eventTypes[eventType] = (stats.eventTypes[eventType] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Subscribe connection to additional event types
   */
  async subscribeToEvents(connectionId: string, eventTypes: SSEEventType[]): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isActive) {
      return false;
    }

    for (const eventType of eventTypes) {
      connection.subscriptions.add(eventType);
    }

    return true;
  }

  /**
   * Unsubscribe connection from event types
   */
  async unsubscribeFromEvents(connectionId: string, eventTypes: SSEEventType[]): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isActive) {
      return false;
    }

    for (const eventType of eventTypes) {
      connection.subscriptions.delete(eventType);
    }

    return true;
  }

  /**
   * Graceful shutdown
   */
  shutdown(): void {
    clearInterval(this.cleanupInterval);

    // Close all connections
    for (const connection of this.connections.values()) {
      try {
        connection.controller.close();
      } catch (error) {
        // Ignore errors during shutdown
      }
    }

    this.connections.clear();
    this.userConnections.clear();
    this.eventQueues.clear();
  }
}

// Global SSE manager instance
export const sseManager = new SSEManager();

// Helper functions for creating specific event types

export function createDocumentProcessingEvent(
  documentId: string,
  productId: string,
  organizationId: string,
  stage: DocumentProcessingEvent['data']['stage'],
  progress: number,
  filename: string,
  status: DocumentProcessingEvent['data']['status'],
  error?: string
): DocumentProcessingEvent {
  return {
    id: `doc_${documentId}_${Date.now()}`,
    type: 'document_processing',
    timestamp: new Date().toISOString(),
    organizationId,
    data: {
      documentId,
      productId,
      stage,
      progress,
      filename,
      status,
      error
    },
    priority: error ? 'high' : 'medium'
  };
}

export function createConversationActivityEvent(
  chatbotId: string,
  sessionId: string,
  messageId: string,
  messageType: ConversationActivityEvent['data']['messageType'],
  organizationId?: string,
  userId?: string,
  responseTime?: number,
  error?: string
): ConversationActivityEvent {
  return {
    id: `conv_${messageId}_${Date.now()}`,
    type: 'conversation_activity',
    timestamp: new Date().toISOString(),
    organizationId,
    userId,
    chatbotId,
    sessionId,
    data: {
      messageId,
      messageType,
      responseTime,
      status: error ? 'failed' : 'completed',
      error
    },
    priority: error ? 'medium' : 'low'
  };
}

export function createSystemHealthEvent(
  component: SystemHealthEvent['data']['component'],
  status: SystemHealthEvent['data']['status'],
  metric: string,
  value: number,
  message: string,
  threshold?: number,
  organizationId?: string
): SystemHealthEvent {
  return {
    id: `health_${component}_${Date.now()}`,
    type: 'system_health',
    timestamp: new Date().toISOString(),
    organizationId,
    data: {
      component,
      status,
      metric,
      value,
      threshold,
      message,
      recommendation: status !== 'healthy' ? 'Check system logs and consider scaling resources' : undefined
    },
    priority: status === 'down' ? 'critical' : status === 'degraded' ? 'high' : 'medium'
  };
}

export function createErrorNotificationEvent(
  errorId: string,
  component: string,
  severity: ErrorNotificationEvent['data']['severity'],
  message: string,
  organizationId?: string,
  sentryIssueId?: string
): ErrorNotificationEvent {
  return {
    id: `error_${errorId}_${Date.now()}`,
    type: 'error_notification',
    timestamp: new Date().toISOString(),
    organizationId,
    data: {
      errorId,
      component,
      severity,
      message,
      userImpact: severity === 'critical' ? 'critical' : severity === 'high' ? 'major' : 'minor',
      sentryIssueId
    },
    priority: severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'medium'
  };
}

export function createChatbotMetricsEvent(
  chatbotId: string,
  organizationId: string,
  metrics: Omit<ChatbotMetricsEvent['data'], 'trends'>
): ChatbotMetricsEvent {
  return {
    id: `metrics_${chatbotId}_${Date.now()}`,
    type: 'chatbot_metrics',
    timestamp: new Date().toISOString(),
    organizationId,
    chatbotId,
    data: {
      ...metrics,
      trends: {
        responseTimeChange: 0, // Calculate based on historical data
        successRateChange: 0,
        usageChange: 0
      }
    },
    priority: 'low'
  };
}

// Export types for external use
export type {
  SSEEventType,
  SSEEvent,
  DocumentProcessingEvent,
  ConversationActivityEvent,
  SystemHealthEvent,
  ErrorNotificationEvent,
  ChatbotMetricsEvent,
  SSEConnection
};