import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { sseManager } from '@/lib/realtime/sse';
import { SentryUtils } from '@/lib/monitoring/sentry-utils';

/**
 * GET /api/v1/realtime/stats
 *
 * Get SSE connection statistics
 *
 * Returns:
 * - 200: Connection statistics
 * - 401: Unauthorized (not authenticated)
 * - 403: Forbidden (not admin)
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
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

    // Check if user is admin
    const isAdmin = user.serverMetadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get SSE statistics
    const stats = sseManager.getStats();

    SentryUtils.addBreadcrumb('SSE stats accessed', {
      userId: user.id,
      totalConnections: stats.totalConnections,
      activeConnections: stats.activeConnections
    });

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString(),
        serverUptime: process.uptime()
      }
    });

  } catch (error) {
    SentryUtils.captureError(error as Error, {
      operation: 'sse_stats_api'
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}