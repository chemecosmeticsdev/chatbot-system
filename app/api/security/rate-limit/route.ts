import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/security/audit-and-rate-limiting';
import { withAdminSecurity } from '@/lib/security/middleware';

async function getHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = req.nextUrl;
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        const stats = rateLimiter.getRateLimitStats();
        return NextResponse.json({
          success: true,
          data: stats,
          message: 'Rate limiting statistics retrieved successfully'
        });

      case 'check':
        // Check rate limit for current request without consuming
        const result = await rateLimiter.checkRateLimit(req);
        return NextResponse.json({
          success: true,
          data: {
            allowed: result.allowed,
            limit: result.limit,
            remaining: result.remaining,
            resetTime: result.resetTime,
            retryAfter: result.retryAfter
          },
          message: 'Rate limit check completed'
        });

      default:
        return NextResponse.json({
          success: true,
          data: {
            stats: rateLimiter.getRateLimitStats(),
            message: 'Rate limiting service is operational'
          },
          message: 'Rate limiting status retrieved'
        });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve rate limiting data',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

async function postHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { action, config } = body;

    switch (action) {
      case 'update-config':
        if (!config) {
          return NextResponse.json({
            success: false,
            error: 'Missing configuration',
            message: 'Rate limiting configuration is required'
          }, { status: 400 });
        }

        rateLimiter.updateConfig(config);
        return NextResponse.json({
          success: true,
          message: 'Rate limiting configuration updated successfully'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
          message: 'Supported actions: update-config'
        }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to process rate limiting request',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Apply admin security middleware
export const GET = withAdminSecurity(getHandler, 'rate_limit_get');
export const POST = withAdminSecurity(postHandler, 'rate_limit_post');