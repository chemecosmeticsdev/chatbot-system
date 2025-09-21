/**
 * Real-time Server-Sent Events (SSE) Module
 *
 * Comprehensive real-time update system for the chatbot management dashboard.
 * Provides instant notifications for document processing, conversations,
 * system health, errors, and performance metrics.
 *
 * @author Claude Code
 * @version 1.0.0
 */

// Core SSE functionality
export { sseManager, SSEManager } from './sse';
export type {
  SSEEventType,
  SSEEvent,
  SSEConnection,
  DocumentProcessingEvent,
  ConversationActivityEvent,
  SystemHealthEvent,
  ErrorNotificationEvent,
  ChatbotMetricsEvent
} from './sse';

// Event creation helpers
export {
  createDocumentProcessingEvent,
  createConversationActivityEvent,
  createSystemHealthEvent,
  createErrorNotificationEvent,
  createChatbotMetricsEvent
} from './sse';

// React hooks for client-side integration
export {
  useSSE,
  useDocumentProcessingEvents,
  useConversationEvents,
  useSystemHealthEvents,
  useChatbotMetricsEvents
} from './useSSE';
export type {
  SSEConnectionStatus,
  UseSSEConfig,
  UseSSEReturn
} from './useSSE';

// Service integrations
export {
  DocumentProcessingSSE,
  ConversationSSE,
  SystemHealthSSE,
  ErrorMonitoringSSE,
  ChatbotMetricsSSE,
  withSSEIntegration,
  sseMiddleware
} from './integrations';

// React components
export {
  SSEDashboard,
  DocumentProcessingMonitor,
  SystemHealthMonitor,
  StatusIndicator,
  EventList
} from './SSEDashboard';

/**
 * Quick Start Guide
 *
 * ## Server-side Integration
 *
 * ### 1. Document Processing
 * ```typescript
 * import { DocumentProcessingSSE } from '@/lib/realtime';
 *
 * // Notify about upload start
 * await DocumentProcessingSSE.notifyUploadStarted(
 *   documentId,
 *   productId,
 *   organizationId,
 *   filename
 * );
 *
 * // Notify about completion
 * await DocumentProcessingSSE.notifyProcessingCompleted(
 *   documentId,
 *   productId,
 *   organizationId,
 *   filename,
 *   processingTime
 * );
 * ```
 *
 * ### 2. Conversation Events
 * ```typescript
 * import { ConversationSSE } from '@/lib/realtime';
 *
 * // Notify about new user message
 * await ConversationSSE.notifyUserMessage(
 *   chatbotId,
 *   sessionId,
 *   messageId,
 *   organizationId,
 *   userId
 * );
 *
 * // Notify about bot response completion
 * await ConversationSSE.notifyBotResponseCompleted(
 *   chatbotId,
 *   sessionId,
 *   messageId,
 *   responseTime,
 *   organizationId,
 *   userId
 * );
 * ```
 *
 * ### 3. System Health Monitoring
 * ```typescript
 * import { SystemHealthSSE } from '@/lib/realtime';
 *
 * // Monitor database performance
 * await SystemHealthSSE.notifyDatabaseHealth(
 *   'healthy', // or 'degraded', 'down'
 *   responseTime,
 *   organizationId
 * );
 *
 * // Monitor vector search performance
 * await SystemHealthSSE.notifyVectorSearchHealth(
 *   'healthy',
 *   searchTime,
 *   organizationId
 * );
 * ```
 *
 * ### 4. Error Notifications
 * ```typescript
 * import { ErrorMonitoringSSE } from '@/lib/realtime';
 *
 * // Notify about application errors
 * await ErrorMonitoringSSE.notifyError(
 *   errorId,
 *   'component_name',
 *   'high', // severity
 *   'Error message',
 *   organizationId,
 *   sentryIssueId
 * );
 *
 * // Notify about critical failures
 * await ErrorMonitoringSSE.notifyCriticalFailure(
 *   'component_name',
 *   'Critical failure message',
 *   organizationId
 * );
 * ```
 *
 * ### 5. Chatbot Metrics
 * ```typescript
 * import { ChatbotMetricsSSE } from '@/lib/realtime';
 *
 * // Update chatbot performance metrics
 * await ChatbotMetricsSSE.notifyMetricsUpdate(
 *   chatbotId,
 *   organizationId,
 *   {
 *     activeConversations: 15,
 *     responseTime: 1200,
 *     successRate: 0.95,
 *     tokenUsage: 50000,
 *     cost: 12.50,
 *     userSatisfaction: 4.2
 *   }
 * );
 * ```
 *
 * ## Client-side Integration
 *
 * ### 1. Basic SSE Hook
 * ```tsx
 * import { useSSE } from '@/lib/realtime';
 *
 * function Dashboard() {
 *   const sse = useSSE({
 *     subscriptions: ['document_processing', 'conversation_activity'],
 *     organizationId: 'org-123',
 *     autoReconnect: true
 *   });
 *
 *   return (
 *     <div>
 *       <div>Status: {sse.status}</div>
 *       <div>Events: {sse.events.length}</div>
 *       {sse.lastEvent && (
 *         <div>Latest: {sse.lastEvent.type}</div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * ### 2. Specialized Hooks
 * ```tsx
 * import {
 *   useDocumentProcessingEvents,
 *   useConversationEvents,
 *   useSystemHealthEvents
 * } from '@/lib/realtime';
 *
 * function SpecializedDashboard() {
 *   const docs = useDocumentProcessingEvents('org-123');
 *   const conversations = useConversationEvents('chatbot-456', 'org-123');
 *   const health = useSystemHealthEvents();
 *
 *   return (
 *     <div>
 *       <div>Document Events: {docs.documentEvents.length}</div>
 *       <div>Conversation Events: {conversations.conversationEvents.length}</div>
 *       <div>Critical Errors: {health.criticalErrors.length}</div>
 *     </div>
 *   );
 * }
 * ```
 *
 * ### 3. Complete Dashboard Component
 * ```tsx
 * import { SSEDashboard } from '@/lib/realtime';
 *
 * function RealtimeDashboard() {
 *   return (
 *     <SSEDashboard
 *       organizationId="org-123"
 *       chatbotId="chatbot-456"
 *     />
 *   );
 * }
 * ```
 *
 * ### 4. Specialized Monitors
 * ```tsx
 * import {
 *   DocumentProcessingMonitor,
 *   SystemHealthMonitor
 * } from '@/lib/realtime';
 *
 * function MonitoringPage() {
 *   return (
 *     <div className="grid grid-cols-2 gap-6">
 *       <DocumentProcessingMonitor organizationId="org-123" />
 *       <SystemHealthMonitor />
 *     </div>
 *   );
 * }
 * ```
 *
 * ## API Endpoints
 *
 * ### 1. Establish SSE Connection
 * ```
 * GET /api/v1/realtime/sse?subscriptions=document_processing,conversation_activity&organizationId=org-123
 * ```
 *
 * ### 2. Update Subscriptions
 * ```
 * POST /api/v1/realtime/sse
 * {
 *   "connectionId": "user_123_1234567890_abc123",
 *   "action": "subscribe",
 *   "eventTypes": ["system_health", "error_notification"]
 * }
 * ```
 *
 * ### 3. Get Connection Statistics (Admin)
 * ```
 * GET /api/v1/realtime/stats
 * ```
 *
 * ## Event Types
 *
 * - `document_processing`: File uploads, OCR, chunking, embedding, indexing
 * - `conversation_activity`: User messages, bot responses, system messages
 * - `system_health`: Database, vector search, LLM API health metrics
 * - `error_notification`: Application errors, system failures
 * - `chatbot_metrics`: Performance metrics, cost tracking, user satisfaction
 * - `connection_status`: Connection establishment, reconnection events
 * - `user_activity`: User actions, login/logout events
 * - `performance_alert`: Performance degradation alerts
 *
 * ## Security Features
 *
 * - **Authentication**: Stack Auth integration for user verification
 * - **Authorization**: Event filtering based on user permissions
 * - **Rate Limiting**: Maximum connections per user and events per minute
 * - **Data Filtering**: Sensitive data removed based on user role
 * - **Organization Isolation**: Events filtered by organization membership
 * - **Connection Management**: Automatic cleanup of inactive connections
 *
 * ## Performance Features
 *
 * - **Connection Pooling**: Efficient management of multiple connections
 * - **Event Queuing**: Important events queued for delivery to new connections
 * - **Automatic Reconnection**: Exponential backoff for failed connections
 * - **Memory Management**: Limited event history to prevent memory leaks
 * - **Graceful Degradation**: System continues working if SSE fails
 *
 * ## AWS Lambda Compatibility
 *
 * This SSE implementation is designed to work with AWS Lambda and Amplify:
 * - Uses ReadableStream for Lambda streaming responses
 * - Handles cold starts gracefully
 * - Optimized for serverless environments
 * - Automatic cleanup on Lambda termination
 *
 * ## Monitoring Integration
 *
 * - **Sentry Integration**: All SSE operations logged to Sentry
 * - **Performance Tracking**: Connection duration and event throughput
 * - **Error Tracking**: Connection failures and event delivery issues
 * - **Usage Analytics**: Connection patterns and subscription preferences
 */