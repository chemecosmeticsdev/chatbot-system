'use client';

import * as Sentry from '@sentry/nextjs';
import { ErrorBoundary as SentryErrorBoundary } from '@sentry/react';
import { ReactNode } from 'react';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  eventId: string | null;
}

function ErrorFallback({ error, resetError, eventId }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-red-50 p-4">
      <div className="max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center">
          <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Something went wrong
            </h2>
            <p className="text-sm text-gray-600">
              An unexpected error occurred in the chatbot system
            </p>
          </div>
        </div>

        <div className="mb-4 rounded bg-gray-50 p-3">
          <p className="text-sm font-medium text-gray-700">Error Details:</p>
          <p className="text-xs text-gray-600 font-mono mt-1">
            {error.message}
          </p>
          {eventId && (
            <p className="text-xs text-gray-500 mt-2">
              Event ID: {eventId}
            </p>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={resetError}
            className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 rounded bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Go Home
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            This error has been automatically reported to our team.
          </p>
        </div>
      </div>
    </div>
  );
}

interface ChatbotErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  tags?: Record<string, string>;
  context?: Record<string, any>;
}

export function ChatbotErrorBoundary({
  children,
  fallback,
  tags = {},
  context = {}
}: ChatbotErrorBoundaryProps) {
  return (
    <SentryErrorBoundary
      fallback={fallback || ErrorFallback}
      beforeCapture={(scope, error, errorInfo) => {
        // Add chatbot-specific context
        scope.setTag('component', 'chatbot');
        scope.setTag('error_boundary', 'chatbot_error_boundary');

        // Add custom tags
        Object.entries(tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });

        // Add error context
        scope.setContext('chatbot_error', {
          component_stack: errorInfo.componentStack,
          error_boundary: 'ChatbotErrorBoundary',
          timestamp: new Date().toISOString(),
          ...context
        });

        // Add user context if available
        const user = getUserContext();
        if (user) {
          scope.setUser(user);
        }
      }}
      showDialog={false}
    >
      {children}
    </SentryErrorBoundary>
  );
}

// API Error Boundary specifically for API route errors
export function APIErrorBoundary({
  children,
  apiRoute,
}: {
  children: ReactNode;
  apiRoute?: string;
}) {
  return (
    <ChatbotErrorBoundary
      tags={{
        error_type: 'api_error',
        api_route: apiRoute || 'unknown'
      }}
      context={{
        api_context: {
          route: apiRoute,
          timestamp: new Date().toISOString()
        }
      }}
    >
      {children}
    </ChatbotErrorBoundary>
  );
}

// Vector Operations Error Boundary
export function VectorErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ChatbotErrorBoundary
      tags={{
        error_type: 'vector_operation',
        system_component: 'vector_search'
      }}
      context={{
        vector_context: {
          operation_type: 'vector_search',
          timestamp: new Date().toISOString()
        }
      }}
    >
      {children}
    </ChatbotErrorBoundary>
  );
}

// Conversation Error Boundary
export function ConversationErrorBoundary({
  children,
  sessionId,
  chatbotId
}: {
  children: ReactNode;
  sessionId?: string;
  chatbotId?: string;
}) {
  return (
    <ChatbotErrorBoundary
      tags={{
        error_type: 'conversation_error',
        session_id: sessionId || 'unknown',
        chatbot_id: chatbotId || 'unknown'
      }}
      context={{
        conversation_context: {
          session_id: sessionId,
          chatbot_id: chatbotId,
          timestamp: new Date().toISOString()
        }
      }}
    >
      {children}
    </ChatbotErrorBoundary>
  );
}

// Helper function to get user context
function getUserContext() {
  try {
    // This would integrate with your auth system
    // For now, return basic browser info
    return {
      ip_address: '{{auto}}',
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
  } catch {
    return null;
  }
}

export default ChatbotErrorBoundary;