import { NextResponse } from 'next/server';
import {
  getStackAuthStatus,
  validateStackAuthConfig,
  validateClientStackAuth,
  validateServerStackAuth,
  generateStackAuthTroubleshootingInfo
} from '@/lib/auth/config-validator';
import { stackServerApp } from '@/stack';

/**
 * Dedicated Stack Auth configuration health check endpoint
 *
 * This endpoint provides comprehensive diagnostics for Stack Auth configuration
 * and initialization status, separate from the general application health check.
 */
export async function GET() {
  try {
    // Get comprehensive Stack Auth status
    const authStatus = getStackAuthStatus();
    const fullValidation = validateStackAuthConfig();
    const clientValidation = validateClientStackAuth();
    const serverValidation = validateServerStackAuth();

    // Check if Stack Auth is actually initialized
    const isInitialized = !!stackServerApp;
    const troubleshootingInfo = generateStackAuthTroubleshootingInfo(fullValidation);

    // Determine overall health status
    let healthStatus: 'healthy' | 'degraded' | 'unhealthy';
    let healthMessage: string;

    if (isInitialized && authStatus.status === 'configured') {
      healthStatus = 'healthy';
      healthMessage = 'Stack Auth is properly configured and initialized';
    } else if (authStatus.status === 'partial') {
      healthStatus = 'degraded';
      healthMessage = 'Stack Auth is partially configured - some features may not work';
    } else {
      healthStatus = 'unhealthy';
      healthMessage = 'Stack Auth is not properly configured';
    }

    // Test Stack Auth functionality if initialized
    let functionalityTest: any = null;
    if (isInitialized && stackServerApp) {
      try {
        // Basic functionality test - get project info
        const project = await stackServerApp.getProject();
        functionalityTest = {
          status: 'success',
          message: 'Stack Auth server app is functional',
          projectId: project.id,
          projectDisplayName: project.displayName
        };
      } catch (error) {
        functionalityTest = {
          status: 'error',
          message: 'Stack Auth server app initialization failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        healthStatus = 'unhealthy';
        healthMessage = 'Stack Auth is configured but not functional';
      }
    }

    return NextResponse.json({
      status: healthStatus,
      message: healthMessage,
      timestamp: new Date().toISOString(),

      // Stack Auth specific status
      stackAuth: {
        isInitialized,
        configurationStatus: authStatus.status,
        configurationMessage: authStatus.message,
        functionalityTest
      },

      // Detailed validation results
      validation: {
        overall: fullValidation,
        client: clientValidation,
        server: serverValidation
      },

      // Environment diagnostics
      environment: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        hasProjectId: !!process.env.NEXT_PUBLIC_STACK_PROJECT_ID,
        hasSecretKey: !!process.env.STACK_SECRET_SERVER_KEY,
        hasPublishableKey: !!process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
        projectIdLength: process.env.NEXT_PUBLIC_STACK_PROJECT_ID?.length || 0,
        secretKeyLength: process.env.STACK_SECRET_SERVER_KEY?.length || 0,
        publishableKeyLength: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY?.length || 0
      },

      // Configuration recommendations
      recommendations: generateConfigurationRecommendations(fullValidation, isInitialized),

      // Troubleshooting information
      troubleshooting: {
        summary: troubleshootingInfo.slice(0, 10), // First 10 lines for quick reference
        full: troubleshootingInfo, // Complete troubleshooting info
        links: {
          stackAuthDashboard: 'https://app.stack-auth.com/',
          documentation: 'https://docs.stack-auth.com/',
          generalHealthCheck: '/api/health'
        }
      }
    });

  } catch (error) {
    console.error('Auth health check failed:', error);

    return NextResponse.json({
      status: 'error',
      message: 'Auth health check endpoint failed',
      timestamp: new Date().toISOString(),
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : 'UnknownError'
      },
      troubleshooting: {
        summary: [
          'The auth health check endpoint encountered an unexpected error.',
          'This may indicate a serious configuration or runtime issue.',
          'Check the server logs for more detailed error information.',
          'Verify that all required environment variables are properly set.'
        ]
      }
    }, { status: 500 });
  }
}

/**
 * Generate configuration recommendations based on validation results
 */
function generateConfigurationRecommendations(
  validation: ReturnType<typeof validateStackAuthConfig>,
  isInitialized: boolean
): string[] {
  const recommendations: string[] = [];

  if (!isInitialized) {
    recommendations.push('Initialize Stack Auth by setting required environment variables');
  }

  if (validation.missing.includes('NEXT_PUBLIC_STACK_PROJECT_ID')) {
    recommendations.push('Set NEXT_PUBLIC_STACK_PROJECT_ID from your Stack Auth dashboard');
  }

  if (validation.missing.includes('STACK_SECRET_SERVER_KEY')) {
    recommendations.push('Set STACK_SECRET_SERVER_KEY from your Stack Auth dashboard');
  }

  if (validation.missing.includes('NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY')) {
    recommendations.push('Set NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY for client-side features');
  }

  if (validation.warnings.length > 0) {
    recommendations.push('Review configuration warnings for potential issues');
  }

  if (validation.environment.nodeEnv === 'production' && validation.missing.length > 0) {
    recommendations.push('CRITICAL: Production environment has missing authentication variables');
  }

  if (!validation.diagnostics.secretKeyValid && validation.environment.secretKey) {
    recommendations.push('Verify STACK_SECRET_SERVER_KEY is the correct format and length');
  }

  if (validation.context.isClient && validation.missing.includes('NEXT_PUBLIC_STACK_PROJECT_ID')) {
    recommendations.push('Client-side authentication requires NEXT_PUBLIC_STACK_PROJECT_ID');
  }

  if (recommendations.length === 0) {
    recommendations.push('Stack Auth configuration appears to be correct');
  }

  return recommendations;
}