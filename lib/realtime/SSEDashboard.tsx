/**
 * Example React component demonstrating SSE usage
 *
 * This component shows how to integrate the SSE system into dashboard components
 * for real-time updates across different types of events.
 */

'use client';

import React, { useState } from 'react';
import { useSSE, useDocumentProcessingEvents, useConversationEvents, useSystemHealthEvents } from './useSSE';
import type { SSEEvent, SSEEventType } from './sse';

// Status indicator component
interface StatusIndicatorProps {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
}

function StatusIndicator({ status }: StatusIndicatorProps) {
  const statusColors = {
    disconnected: 'bg-gray-500',
    connecting: 'bg-yellow-500 animate-pulse',
    connected: 'bg-green-500',
    reconnecting: 'bg-orange-500 animate-pulse',
    error: 'bg-red-500'
  };

  const statusTexts = {
    disconnected: 'Disconnected',
    connecting: 'Connecting...',
    connected: 'Connected',
    reconnecting: 'Reconnecting...',
    error: 'Connection Error'
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
      <span className="text-sm font-medium">{statusTexts[status]}</span>
    </div>
  );
}

// Event list component
interface EventListProps {
  events: SSEEvent[];
  title: string;
  maxEvents?: number;
}

function EventList({ events, title, maxEvents = 10 }: EventListProps) {
  const recentEvents = events.slice(-maxEvents).reverse();

  const getEventColor = (event: SSEEvent) => {
    switch (event.priority) {
      case 'critical': return 'border-l-red-500 bg-red-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'medium': return 'border-l-blue-500 bg-blue-50';
      case 'low': return 'border-l-gray-500 bg-gray-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-sm text-gray-500">{events.length} total events</span>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {recentEvents.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No events yet</p>
        ) : (
          recentEvents.map((event, index) => (
            <div
              key={`${event.id}-${index}`}
              className={`border-l-4 p-3 rounded-r ${getEventColor(event)}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{event.type.replace('_', ' ').toUpperCase()}</span>
                <span className="text-xs text-gray-500">{formatTimestamp(event.timestamp)}</span>
              </div>
              <div className="text-sm text-gray-700">
                {JSON.stringify(event.data, null, 2).slice(0, 200)}
                {JSON.stringify(event.data).length > 200 && '...'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Main SSE Dashboard component
interface SSEDashboardProps {
  organizationId?: string;
  chatbotId?: string;
}

export function SSEDashboard({ organizationId, chatbotId }: SSEDashboardProps) {
  const [selectedEventTypes, setSelectedEventTypes] = useState<SSEEventType[]>([
    'document_processing',
    'conversation_activity',
    'system_health',
    'chatbot_metrics'
  ]);

  // Main SSE connection
  const sse = useSSE({
    subscriptions: selectedEventTypes,
    organizationId,
    debug: true
  });

  // Specialized hooks for different event types
  const documentEvents = useDocumentProcessingEvents(organizationId);
  const conversationEvents = useConversationEvents(chatbotId, organizationId);
  const healthEvents = useSystemHealthEvents();

  const handleEventTypeToggle = (eventType: SSEEventType) => {
    setSelectedEventTypes(prev => {
      const newTypes = prev.includes(eventType)
        ? prev.filter(t => t !== eventType)
        : [...prev, eventType];
      return newTypes;
    });
  };

  const eventTypeOptions: { value: SSEEventType; label: string }[] = [
    { value: 'document_processing', label: 'Document Processing' },
    { value: 'conversation_activity', label: 'Conversations' },
    { value: 'system_health', label: 'System Health' },
    { value: 'error_notification', label: 'Error Notifications' },
    { value: 'chatbot_metrics', label: 'Chatbot Metrics' },
    { value: 'user_activity', label: 'User Activity' },
    { value: 'performance_alert', label: 'Performance Alerts' }
  ];

  return (
    <div className="space-y-6">
      {/* Connection Status and Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Real-time Event Stream</h2>
          <StatusIndicator status={sse.status} />
        </div>

        {/* Connection Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{sse.stats.eventsReceived}</div>
            <div className="text-sm text-gray-500">Events Received</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.floor(sse.stats.connectionDuration / 1000)}s
            </div>
            <div className="text-sm text-gray-500">Connected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{sse.stats.reconnectAttempts}</div>
            <div className="text-sm text-gray-500">Reconnects</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{selectedEventTypes.length}</div>
            <div className="text-sm text-gray-500">Subscriptions</div>
          </div>
        </div>

        {/* Error Display */}
        {sse.error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
            <div className="flex items-center">
              <div className="text-red-500 font-medium">Connection Error:</div>
              <div className="ml-2 text-red-700">{sse.error}</div>
            </div>
          </div>
        )}

        {/* Event Type Subscriptions */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Event Subscriptions
          </label>
          <div className="flex flex-wrap gap-2">
            {eventTypeOptions.map(option => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedEventTypes.includes(option.value)}
                  onChange={() => handleEventTypeToggle(option.value)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={sse.reconnect}
            disabled={sse.status === 'connecting'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Reconnect
          </button>
          <button
            onClick={sse.disconnect}
            disabled={sse.status === 'disconnected'}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            Disconnect
          </button>
          <button
            onClick={sse.clearEvents}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Clear Events
          </button>
        </div>
      </div>

      {/* Event Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* All Events */}
        <EventList
          events={sse.events}
          title="All Events"
          maxEvents={15}
        />

        {/* Document Processing Events */}
        <EventList
          events={documentEvents.documentEvents}
          title="Document Processing"
          maxEvents={10}
        />

        {/* Conversation Events */}
        <EventList
          events={conversationEvents.conversationEvents}
          title="Conversations"
          maxEvents={10}
        />

        {/* System Health Events */}
        <EventList
          events={healthEvents.healthEvents}
          title="System Health"
          maxEvents={10}
        />

        {/* Error Events */}
        <EventList
          events={healthEvents.errorEvents}
          title="Error Notifications"
          maxEvents={10}
        />

        {/* Critical Errors */}
        {healthEvents.criticalErrors.length > 0 && (
          <EventList
            events={healthEvents.criticalErrors}
            title="🚨 Critical Errors"
            maxEvents={5}
          />
        )}
      </div>

      {/* Latest Event Detail */}
      {sse.lastEvent && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Latest Event Detail</h3>
          <div className="bg-gray-100 rounded p-4 overflow-x-auto">
            <pre className="text-sm">
              {JSON.stringify(sse.lastEvent, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// Example specialized components

/**
 * Document Processing Monitor
 */
export function DocumentProcessingMonitor({ organizationId }: { organizationId?: string }) {
  const { documentEvents, lastDocumentEvent, status, error } = useDocumentProcessingEvents(organizationId);

  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'bg-green-500';
    if (progress > 50) return 'bg-blue-500';
    return 'bg-yellow-500';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Document Processing Monitor</h3>
        <StatusIndicator status={status} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-red-700">
          {error}
        </div>
      )}

      {lastDocumentEvent && (
        <div className="border rounded p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{lastDocumentEvent.data.filename}</span>
            <span className="text-sm text-gray-500">{lastDocumentEvent.data.stage}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(lastDocumentEvent.data.progress)}`}
              style={{ width: `${lastDocumentEvent.data.progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
            <span>{lastDocumentEvent.data.status}</span>
            <span>{lastDocumentEvent.data.progress}%</span>
          </div>
          {lastDocumentEvent.data.error && (
            <div className="mt-2 text-sm text-red-600">
              Error: {lastDocumentEvent.data.error}
            </div>
          )}
        </div>
      )}

      <div className="text-sm text-gray-500">
        Total documents processed: {documentEvents.length}
      </div>
    </div>
  );
}

/**
 * System Health Monitor
 */
export function SystemHealthMonitor() {
  const { healthEvents, errorEvents, criticalErrors, lastHealthEvent, status } = useSystemHealthEvents();

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">System Health Monitor</h3>
        <StatusIndicator status={status} />
      </div>

      {criticalErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <div className="font-medium text-red-800">🚨 {criticalErrors.length} Critical Errors</div>
          <div className="text-sm text-red-700 mt-1">
            Latest: {criticalErrors[criticalErrors.length - 1]?.data.message}
          </div>
        </div>
      )}

      {lastHealthEvent && (
        <div className="border rounded p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{lastHealthEvent.data.component}</span>
            <span className={`font-medium ${getHealthColor(lastHealthEvent.data.status)}`}>
              {lastHealthEvent.data.status.toUpperCase()}
            </span>
          </div>
          <div className="text-sm text-gray-600 mb-1">
            {lastHealthEvent.data.metric}: {lastHealthEvent.data.value}
            {lastHealthEvent.data.threshold && ` (threshold: ${lastHealthEvent.data.threshold})`}
          </div>
          <div className="text-sm text-gray-700">
            {lastHealthEvent.data.message}
          </div>
          {lastHealthEvent.data.recommendation && (
            <div className="text-sm text-blue-600 mt-1">
              💡 {lastHealthEvent.data.recommendation}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Health Events:</span>
          <span className="ml-2 font-medium">{healthEvents.length}</span>
        </div>
        <div>
          <span className="text-gray-500">Error Events:</span>
          <span className="ml-2 font-medium">{errorEvents.length}</span>
        </div>
      </div>
    </div>
  );
}

