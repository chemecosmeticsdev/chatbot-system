import { NextRequest, NextResponse } from 'next/server';
import { runSecurityAudit } from '@/lib/security/audit-and-rate-limiting';
import { withAdminSecurity } from '@/lib/security/middleware';

async function handler(req: NextRequest): Promise<NextResponse> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return NextResponse.json(
      { success: false, error: 'Method not allowed' },
      { status: 405 }
    );
  }

  try {
    // Run comprehensive security audit
    const auditResult = await runSecurityAudit(req);

    return NextResponse.json({
      success: true,
      data: auditResult,
      message: `Security audit completed with ${auditResult.overallStatus} status`
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Security audit failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Apply admin security middleware
export const GET = withAdminSecurity(handler, 'security_audit_get');
export const POST = withAdminSecurity(handler, 'security_audit_post');