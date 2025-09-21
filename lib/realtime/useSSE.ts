/**
 * React hook for Server-Sent Events (SSE) integration
 *
 * Provides real-time updates for dashboard components with:
 * - Automatic connection management and reconnection
 * - Event type filtering and subscription management
 * - Error handling and connection status tracking
 * - Integration with authentication system
 * - TypeScript support for all event types
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// Temporary stub for Stack Auth useUser hook
// TODO: Replace with real useUser when @stackframe/stack is installed
const useUserStub = () => null;
import type {
  SSEEvent,
  SSEEventType,
  DocumentProcessingEvent,
  ConversationActivityEvent,
  SystemHealthEvent,
  ErrorNotificationEvent,
  ChatbotMetricsEvent
} from './sse';

// Connection status types
export type SSEConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

// Hook configuration
export interface UseSSEConfig {
  /** Event types to subscribe to */
  subscriptions?: SSEEventType[];
  /** Organization ID filter */
  organizationId?: string;
  /** Auto-reconnect on connection loss */
  autoReconnect?: boolean;
  /** Reconnection delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  /** Enable debug logging */
  debug?: boolean;
}

// Hook return type
export interface UseSSEReturn {
  /** Current connection status */
  status: SSEConnectionStatus;
  /** Last received event */
  lastEvent: SSEEvent | null;
  /** All events received during session (limited to last 100) */
  events: SSEEvent[];
  /** Error information */
  error: string | null;
  /** Connection statistics */
  stats: {
    eventsReceived: number;
    reconnectAttempts: number;
    connectionDuration: number;
  };
  /** Manual reconnection */
  reconnect: () => void;
  /** Disconnect manually */
  disconnect: () => void;
  /** Subscribe to additional event types */
  subscribe: (eventTypes: SSEEventType[]) => Promise<void>;
  /** Unsubscribe from event types */
  unsubscribe: (eventTypes: SSEEventType[]) => Promise<void>;
  /** Clear all events */
  clearEvents: () => void;
}

// Default configuration
const defaultConfig = {
  subscriptions: ['document_processing', 'conversation_activity', 'system_health', 'chatbot_metrics'],
  autoReconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 10,
  debug: false
} as const;

/**
 * Custom hook for SSE integration
 */
export function useSSE(config: UseSSEConfig = {}): UseSSEReturn {
  const mergedConfig = { ...defaultConfig, ...config };
  const user = useUserStub();

  // State
  const [status, setStatus] = useState<SSEConnectionStatus>('disconnected');
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    eventsReceived: 0,
    reconnectAttempts: 0,
    connectionDuration: 0
  });

  // Refs for cleanup and state management
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionStartTimeRef = useRef<number>(0);
  const connectionIdRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Debug logging
  const log = useCallback((message: string, data?: any) => {
    if (mergedConfig.debug) {
      console.log(`[SSE] ${message}`, data || '');
    }
  }, [mergedConfig.debug]);

  // Clear reconnection timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Update connection duration
  const updateConnectionDuration = useCallback(() => {
    if (connectionStartTimeRef.current > 0) {
      setStats(prev => ({
        ...prev,
        connectionDuration: Date.now() - connectionStartTimeRef.current
      }));
    }
  }, []);

  // Handle SSE events
  const handleSSEEvent = useCallback((event: MessageEvent) => {
    try {
      const sseEvent: SSEEvent = JSON.parse(event.data);

      log('Received SSE event', { type: sseEvent.type, id: sseEvent.id });

      // Extract connection ID from connection_status events
      if (sseEvent.type === 'connection_status' && sseEvent.data.connectionId) {
        connectionIdRef.current = sseEvent.data.connectionId;
      }

      setLastEvent(sseEvent);
      setEvents(prev => {
        const newEvents = [...prev, sseEvent];
        // Keep only last 100 events
        return newEvents.slice(-100);
      });
      setStats(prev => ({
        ...prev,
        eventsReceived: prev.eventsReceived + 1
      }));

    } catch (error) {
      log('Failed to parse SSE event', error);
      setError('Failed to parse server event');
    }
  }, [log]);

  // Connect to SSE endpoint
  const connect = useCallback(async () => {
    if (!user) {
      log('Cannot connect - user not authenticated');
      return;
    }

    if (eventSourceRef.current) {
      log('Already connected or connecting');
      return;
    }

    try {
      setStatus('connecting');
      setError(null);
      clearReconnectTimeout();

      // Build URL with parameters
      const params = new URLSearchParams();
      if (mergedConfig.subscriptions.length > 0) {
        params.set('subscriptions', mergedConfig.subscriptions.join(','));
      }
      if (mergedConfig.organizationId) {
        params.set('organizationId', mergedConfig.organizationId);
      }

      const url = `/api/v1/realtime/sse?${params.toString()}`;
      log('Connecting to SSE endpoint', url);

      // Create EventSource
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;
      connectionStartTimeRef.current = Date.now();

      // Set up event handlers
      eventSource.onopen = () => {
        log('SSE connection established');
        setStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
        updateConnectionDuration();
      };

      eventSource.onerror = (error) => {
        log('SSE connection error', error);

        if (eventSource.readyState === EventSource.CLOSED) {
          setStatus('disconnected');
          eventSourceRef.current = null;

          // Auto-reconnect if enabled and under max attempts
          if (mergedConfig.autoReconnect && reconnectAttemptsRef.current < mergedConfig.maxReconnectAttempts) {
            setStatus('reconnecting');
            reconnectAttemptsRef.current++;
            setStats(prev => ({
              ...prev,
              reconnectAttempts: prev.reconnectAttempts + 1
            }));

            const delay = mergedConfig.reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1);
            log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            setStatus('error');
            setError('Connection lost and max reconnection attempts reached');
          }
        }
      };

      // Handle specific event types
      for (const eventType of mergedConfig.subscriptions) {
        eventSource.addEventListener(eventType, handleSSEEvent);
      }

      // Handle connection status events
      eventSource.addEventListener('connection_status', handleSSEEvent);

    } catch (error) {
      log('Failed to connect to SSE', error);
      setStatus('error');
      setError('Failed to establish connection');
      eventSourceRef.current = null;
    }
  }, [user, mergedConfig, handleSSEEvent, log, clearReconnectTimeout, updateConnectionDuration]);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    log('Disconnecting from SSE');

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    clearReconnectTimeout();
    setStatus('disconnected');
    connectionStartTimeRef.current = 0;
    connectionIdRef.current = null;
  }, [log, clearReconnectTimeout]);

  // Manual reconnection
  const reconnect = useCallback(() => {
    log('Manual reconnection requested');
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(connect, 100);
  }, [log, disconnect, connect]);

  // Subscribe to additional event types
  const subscribe = useCallback(async (eventTypes: SSEEventType[]) => {
    if (!connectionIdRef.current) {
      throw new Error('No active connection');
    }

    const response = await fetch('/api/v1/realtime/sse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connectionId: connectionIdRef.current,
        action: 'subscribe',
        eventTypes
      })
    });

    if (!response.ok) {
      throw new Error('Failed to subscribe to events');
    }

    log('Subscribed to additional events', eventTypes);
  }, [log]);

  // Unsubscribe from event types
  const unsubscribe = useCallback(async (eventTypes: SSEEventType[]) => {
    if (!connectionIdRef.current) {
      throw new Error('No active connection');
    }

    const response = await fetch('/api/v1/realtime/sse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connectionId: connectionIdRef.current,
        action: 'unsubscribe',
        eventTypes
      })
    });

    if (!response.ok) {
      throw new Error('Failed to unsubscribe from events');
    }

    log('Unsubscribed from events', eventTypes);
  }, [log]);

  // Clear all events
  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
    setStats(prev => ({
      ...prev,
      eventsReceived: 0
    }));
  }, []);

  // Connect when user is available and subscriptions change
  useEffect(() => {
    if (user && mergedConfig.subscriptions.length > 0) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [user, mergedConfig.subscriptions, mergedConfig.organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update connection duration periodically
  useEffect(() => {
    if (status === 'connected') {
      const interval = setInterval(updateConnectionDuration, 1000);
      return () => clearInterval(interval);
    }
  }, [status, updateConnectionDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    status,
    lastEvent,
    events,
    error,
    stats,
    reconnect,
    disconnect,
    subscribe,
    unsubscribe,
    clearEvents
  };
}

// Specialized hooks for specific event types

/**
 * Hook specifically for document processing events
 */
export function useDocumentProcessingEvents(organizationId?: string) {
  const sse = useSSE({
    subscriptions: ['document_processing'],
    organizationId,
    debug: false
  });

  const documentEvents = sse.events.filter(
    (event): event is DocumentProcessingEvent => event.type === 'document_processing'
  );

  return {
    ...sse,
    documentEvents,
    lastDocumentEvent: sse.lastEvent?.type === 'document_processing' ? sse.lastEvent as DocumentProcessingEvent : null
  };
}

/**
 * Hook specifically for conversation activity events
 */
export function useConversationEvents(chatbotId?: string, organizationId?: string) {
  const sse = useSSE({
    subscriptions: ['conversation_activity'],
    organizationId,
    debug: false
  });

  const conversationEvents = sse.events.filter(
    (event): event is ConversationActivityEvent =>
      event.type === 'conversation_activity' &&
      (!chatbotId || event.chatbotId === chatbotId)
  );

  return {
    ...sse,
    conversationEvents,
    lastConversationEvent: sse.lastEvent?.type === 'conversation_activity' ? sse.lastEvent as ConversationActivityEvent : null
  };
}

/**
 * Hook specifically for system health events
 */
export function useSystemHealthEvents() {
  const sse = useSSE({
    subscriptions: ['system_health', 'error_notification'],
    debug: false
  });

  const healthEvents = sse.events.filter(
    (event): event is SystemHealthEvent => event.type === 'system_health'
  );

  const errorEvents = sse.events.filter(
    (event): event is ErrorNotificationEvent => event.type === 'error_notification'
  );

  return {
    ...sse,
    healthEvents,
    errorEvents,
    criticalErrors: errorEvents.filter(event => event.priority === 'critical'),
    lastHealthEvent: sse.lastEvent?.type === 'system_health' ? sse.lastEvent as SystemHealthEvent : null
  };
}

/**
 * Hook specifically for chatbot metrics events
 */
export function useChatbotMetricsEvents(chatbotId?: string, organizationId?: string) {
  const sse = useSSE({
    subscriptions: ['chatbot_metrics'],
    organizationId,
    debug: false
  });

  const metricsEvents = sse.events.filter(
    (event): event is ChatbotMetricsEvent =>
      event.type === 'chatbot_metrics' &&
      (!chatbotId || event.chatbotId === chatbotId)
  );

  return {
    ...sse,
    metricsEvents,
    lastMetricsEvent: sse.lastEvent?.type === 'chatbot_metrics' ? sse.lastEvent as ChatbotMetricsEvent : null
  };
}

