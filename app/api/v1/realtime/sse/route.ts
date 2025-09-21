import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { sseManager, type SSEEventType } from '@/lib/realtime/sse';
import { SentryUtils } from '@/lib/monitoring/sentry-utils';

/**
 * GET /api/v1/realtime/sse
 *
 * Establishes Server-Sent Events connection for real-time dashboard updates
 *
 * Query Parameters:
 * - subscriptions: comma-separated list of event types to subscribe to
 * - organizationId: optional organization filter
 *
 * Headers:
 * - User-Agent: for connection identification
 *
 * Returns:
 * - 200: SSE stream established
 * - 401: Unauthorized (not authenticated)
 * - 429: Too many connections (rate limited)
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    if (!stackServerApp) {
      return new NextResponse('Authentication system not available', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const user = await stackServerApp.getUser();
    if (!user) {
      return new NextResponse('Unauthorized', {
        status: 401,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Extract parameters
    const { searchParams } = new URL(request.url);
    const subscriptionsParam = searchParams.get('subscriptions');
    const organizationId = searchParams.get('organizationId') || undefined;
    const userAgent = request.headers.get('User-Agent') || 'Unknown';

    // Parse subscriptions
    const subscriptions: SSEEventType[] = subscriptionsParam
      ? subscriptionsParam.split(',').map(s => s.trim() as SSEEventType)
      : ['document_processing', 'conversation_activity', 'system_health', 'chatbot_metrics'];

    // Validate subscriptions
    const validEventTypes: SSEEventType[] = [
      'document_processing',
      'conversation_activity',
      'system_health',
      'error_notification',
      'chatbot_metrics',
      'connection_status',
      'user_activity',
      'performance_alert'
    ];

    const validSubscriptions = subscriptions.filter(sub =>
      validEventTypes.includes(sub)
    );

    if (validSubscriptions.length === 0) {
      return new NextResponse('No valid subscriptions provided', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Create SSE connection
    const stream = await sseManager.createConnection(
      user.id,
      organizationId,
      userAgent,
      validSubscriptions
    );

    if (!stream) {
      return new NextResponse('Failed to create connection - rate limited or server error', {
        status: 429,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Log successful connection
    SentryUtils.addBreadcrumb('SSE connection established via API', {
      userId: user.id,
      organizationId,
      subscriptions: validSubscriptions,
      userAgent
    });

    // Return SSE stream with proper headers
    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'Access-Control-Allow-Credentials': 'true',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      }
    });

  } catch (error) {
    SentryUtils.captureError(error as Error, {
      operation: 'sse_api_endpoint',
      additionalData: {
        url: request.url,
        userAgent: request.headers.get('User-Agent')
      }
    });

    return new NextResponse('Internal server error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * POST /api/v1/realtime/sse
 *
 * Update SSE connection subscriptions
 *
 * Body:
 * {
 *   connectionId: string;
 *   action: 'subscribe' | 'unsubscribe';
 *   eventTypes: SSEEventType[];
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    if (!stackServerApp) {
      return NextResponse.json(
        { error: 'Authentication system not available' },
        { status: 500 }
      );
    }

    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { connectionId, action, eventTypes } = body;

    if (!connectionId || !action || !Array.isArray(eventTypes)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    if (!['subscribe', 'unsubscribe'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "subscribe" or "unsubscribe"' },
        { status: 400 }
      );
    }

    // Update subscriptions
    let success: boolean;
    if (action === 'subscribe') {
      success = await sseManager.subscribeToEvents(connectionId, eventTypes);
    } else {
      success = await sseManager.unsubscribeFromEvents(connectionId, eventTypes);
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Connection not found or inactive' },
        { status: 404 }
      );
    }

    SentryUtils.addBreadcrumb('SSE subscription updated', {
      userId: user.id,
      connectionId,
      action,
      eventTypes
    });

    return NextResponse.json({
      success: true,
      message: `Successfully ${action}d to event types`,
      eventTypes
    });

  } catch (error) {
    SentryUtils.captureError(error as Error, {
      operation: 'sse_subscription_update'
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/v1/realtime/sse
 *
 * CORS preflight support
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, User-Agent',
      'Access-Control-Max-Age': '86400',
    }
  });
}