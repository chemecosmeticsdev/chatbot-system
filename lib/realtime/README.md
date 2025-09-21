# Real-time Server-Sent Events (SSE) Implementation

## Overview

This implementation provides a comprehensive real-time update system for the chatbot management dashboard using Server-Sent Events (SSE). It enables instant notifications for document processing, conversations, system health, errors, and performance metrics.

## 📁 File Structure

```
lib/realtime/
├── sse.ts                    # Core SSE manager and event types
├── useSSE.ts                # React hooks for client-side integration
├── integrations.ts          # Service integration utilities
├── SSEDashboard.tsx         # Example React components
├── index.ts                 # Main exports and documentation
└── README.md               # This file

app/api/v1/realtime/
├── sse/route.ts            # SSE connection endpoint
└── stats/route.ts          # Connection statistics endpoint
```

## 🚀 Key Features

### Core SSE Manager (`sse.ts`)
- **Connection Management**: Automatic reconnection with exponential backoff
- **Event Filtering**: User permissions and organization-based filtering
- **Rate Limiting**: Prevents abuse with configurable limits
- **Security**: Authentication integration with Stack Auth
- **Performance**: Connection pooling and memory optimization
- **AWS Lambda Compatible**: Works with serverless deployments

### React Integration (`useSSE.ts`)
- **useSSE**: Main hook for SSE connections
- **Specialized Hooks**: Event-type specific hooks
- **Auto-reconnection**: Handles connection failures gracefully
- **TypeScript Support**: Full type safety for all events

### Service Integrations (`integrations.ts`)
- **DocumentProcessingSSE**: File upload and processing notifications
- **ConversationSSE**: Chat activity and response tracking
- **SystemHealthSSE**: Database and API health monitoring
- **ErrorMonitoringSSE**: Error notifications with Sentry integration
- **ChatbotMetricsSSE**: Performance and cost tracking

### React Components (`SSEDashboard.tsx`)
- **SSEDashboard**: Complete real-time dashboard
- **DocumentProcessingMonitor**: Document processing visualization
- **SystemHealthMonitor**: System health tracking
- **Specialized Components**: Event-specific displays

## 🔧 API Endpoints

### Connection Endpoint
```
GET /api/v1/realtime/sse
Query Parameters:
- subscriptions: comma-separated event types
- organizationId: optional organization filter
```

### Subscription Management
```
POST /api/v1/realtime/sse
Body: { connectionId, action: 'subscribe'|'unsubscribe', eventTypes }
```

### Statistics (Admin Only)
```
GET /api/v1/realtime/stats
Returns connection statistics and metrics
```

## 📊 Event Types

1. **document_processing**: File uploads, OCR, chunking, embedding
2. **conversation_activity**: Messages, responses, conversation flow
3. **system_health**: Database, vector search, LLM API health
4. **error_notification**: Application errors and failures
5. **chatbot_metrics**: Performance metrics and cost tracking
6. **connection_status**: Connection events
7. **user_activity**: User actions and sessions
8. **performance_alert**: Performance degradation alerts

## 🔒 Security Features

- **Authentication**: Stack Auth integration
- **Authorization**: Permission-based event filtering
- **Rate Limiting**: Connection and event limits
- **Data Filtering**: Sensitive data removal
- **Organization Isolation**: Multi-tenant security

## 📈 Performance Features

- **Connection Pooling**: Efficient resource management
- **Event Queuing**: Important events preserved
- **Memory Management**: Limited event history
- **Graceful Degradation**: Continues working if SSE fails
- **Serverless Optimized**: AWS Lambda compatible

## 🛠 Usage Examples

### Server-side Integration
```typescript
import { DocumentProcessingSSE } from '@/lib/realtime';

// Notify document processing start
await DocumentProcessingSSE.notifyUploadStarted(
  documentId,
  productId,
  organizationId,
  filename
);
```

### Client-side Integration
```tsx
import { useSSE } from '@/lib/realtime';

function Dashboard() {
  const sse = useSSE({
    subscriptions: ['document_processing', 'conversation_activity'],
    organizationId: 'org-123'
  });

  return <div>Events: {sse.events.length}</div>;
}
```

### Complete Dashboard
```tsx
import { SSEDashboard } from '@/lib/realtime';

function RealtimePage() {
  return (
    <SSEDashboard
      organizationId="org-123"
      chatbotId="chatbot-456"
    />
  );
}
```

## 🔌 Integration Points

The SSE system integrates with existing services:

- **Stack Auth**: User authentication and permissions
- **Sentry**: Error monitoring and logging
- **Database Services**: Document and conversation tracking
- **Vector Search**: Performance monitoring
- **AWS Bedrock**: LLM API health tracking

## 🎯 Production Ready

This implementation is production-ready with:

- ✅ Comprehensive error handling
- ✅ Performance monitoring
- ✅ Security best practices
- ✅ AWS Lambda compatibility
- ✅ TypeScript safety
- ✅ Extensive documentation
- ✅ Example components
- ✅ Service integrations

## 📝 Next Steps

To use this SSE system in your dashboard:

1. Import the hooks in your React components
2. Add SSE notifications to your service methods
3. Configure event subscriptions based on user needs
4. Monitor connection statistics for optimization

The system is ready for immediate use and scales automatically with your application growth.