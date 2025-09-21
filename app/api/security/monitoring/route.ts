import { NextRequest, NextResponse } from 'next/server';
import { securityMonitor } from '@/lib/security/monitoring';
import { withAdminSecurity } from '@/lib/security/middleware';

async function getHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = req.nextUrl;
    const type = searchParams.get('type');
    const hours = parseInt(searchParams.get('hours') || '24');

    let data;

    switch (type) {
      case 'metrics':
        data = securityMonitor.getSecurityMetrics();
        break;
      case 'events':
        data = securityMonitor.getRecentSecurityEvents(hours);
        break;
      case 'unresolved':
        data = securityMonitor.getUnresolvedEvents();
        break;
      case 'critical':
        data = securityMonitor.getCriticalEvents();
        break;
      case 'health':
        data = await securityMonitor.runSecurityHealthCheck();
        break;
      default:
        data = {
          metrics: securityMonitor.getSecurityMetrics(),
          recentEvents: securityMonitor.getRecentSecurityEvents(24),
          unresolvedEvents: securityMonitor.getUnresolvedEvents(),
          criticalEvents: securityMonitor.getCriticalEvents()
        };
    }

    return NextResponse.json({
      success: true,
      data,
      message: `Security monitoring data retrieved: ${type || 'overview'}`
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve security monitoring data',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

async function postHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { action, eventId, resolvedBy, resolution, event } = body;

    switch (action) {
      case 'resolve':
        if (!eventId || !resolvedBy || !resolution) {
          return NextResponse.json({
            success: false,
            error: 'Missing required fields',
            message: 'eventId, resolvedBy, and resolution are required'
          }, { status: 400 });
        }

        const resolved = securityMonitor.resolveEvent(eventId, resolvedBy, resolution);
        if (!resolved) {
          return NextResponse.json({
            success: false,
            error: 'Event not found',
            message: `Security event ${eventId} not found`
          }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          message: `Security event ${eventId} resolved successfully`
        });

      case 'record':
        if (!event || !event.type || !event.severity || !event.source || !event.details) {
          return NextResponse.json({
            success: false,
            error: 'Invalid event data',
            message: 'Event must include type, severity, source, and details'
          }, { status: 400 });
        }

        const recordedEventId = securityMonitor.recordSecurityEvent(event);
        return NextResponse.json({
          success: true,
          data: { eventId: recordedEventId },
          message: 'Security event recorded successfully'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
          message: 'Supported actions: resolve, record'
        }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to process security monitoring request',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Apply admin security middleware
export const GET = withAdminSecurity(getHandler, 'security_monitoring_get');
export const POST = withAdminSecurity(postHandler, 'security_monitoring_post');