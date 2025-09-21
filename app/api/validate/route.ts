/**
 * Deployment Validation API Endpoint
 * Provides detailed validation for deployment readiness
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  DeploymentValidator,
  validateEnvironmentOnly,
  validateDatabaseOnly,
  validateAWSOnly,
  runValidationCLI
} from '@/lib/validation/deployment-validation';
import * as Sentry from '@sentry/nextjs';

export async function GET(request: NextRequest) {
  const start = Date.now();

  try {
    console.log('🔍 Deployment validation requested at:', new Date().toISOString());

    const { searchParams } = new URL(request.url);
    const component = searchParams.get('component');
    const format = searchParams.get('format') || 'json';

    // Handle specific component validation
    if (component) {
      let result;

      switch (component) {
        case 'environment':
          result = await validateEnvironmentOnly();
          break;
        case 'database':
          result = await validateDatabaseOnly();
          break;
        case 'aws':
          result = await validateAWSOnly();
          break;
        default:
          return NextResponse.json({
            error: 'Invalid component',
            validComponents: ['environment', 'database', 'aws'],
            usage: '/api/validate?component=environment'
          }, { status: 400 });
      }

      return NextResponse.json({
        component,
        result,
        timestamp: new Date().toISOString(),
        duration: Date.now() - start
      }, { status: result.success ? 200 : 422 });
    }

    // Full deployment validation
    const validator = new DeploymentValidator({
      timeout: 30000,
      skipOptional: false,
      enablePerformanceTests: true,
      enableSecurityScans: true
    });

    const report = await validator.runDeploymentHealthCheck();

    // Format response based on requested format
    if (format === 'summary') {
      return NextResponse.json({
        overall: report.overall,
        summary: {
          environment: { success: report.environment.success, message: report.environment.message },
          database: { success: report.database.success, message: report.database.message },
          vectorDatabase: { success: report.vectorDatabase.success, message: report.vectorDatabase.message },
          awsServices: { success: report.awsServices.success, message: report.awsServices.message },
          llmProviders: { success: report.llmProviders.success, message: report.llmProviders.message },
          integrations: { success: report.integrations.success, message: report.integrations.message },
          monitoring: { success: report.monitoring.success, message: report.monitoring.message },
          security: { success: report.security.success, message: report.security.message },
          performance: { success: report.performance.success, message: report.performance.message }
        },
        criticalIssues: report.criticalIssues,
        recommendations: report.recommendations.slice(0, 5) // Top 5 recommendations
      }, { status: report.overall.success ? 200 : 422 });
    }

    // Full detailed report
    return NextResponse.json(report, {
      status: report.overall.success ? 200 : 422
    });

  } catch (error) {
    console.error('Deployment validation failed:', error);

    Sentry.captureException(error, {
      tags: {
        component: 'deployment-validation',
        endpoint: '/api/validate'
      },
      extra: {
        duration: Date.now() - start
      }
    });

    return NextResponse.json({
      error: 'Validation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      duration: Date.now() - start
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now();

  try {
    const body = await request.json();
    const { environment = 'production', timeout = 30000, components = [] } = body;

    console.log(`🔍 Custom deployment validation requested for environment: ${environment}`);

    const validator = new DeploymentValidator({
      timeout,
      environment: environment as any,
      skipOptional: components.length > 0,
      enablePerformanceTests: !components.includes('skip-performance'),
      enableSecurityScans: !components.includes('skip-security')
    });

    let report;

    if (components.length > 0) {
      // Run specific component validations
      const results: any = {};

      for (const component of components) {
        switch (component) {
          case 'environment':
            results.environment = await validator.validateEnvironment();
            break;
          case 'database':
            results.database = await validator.validateDatabaseConnection();
            break;
          case 'vectorDatabase':
            results.vectorDatabase = await validator.validateVectorDatabase();
            break;
          case 'awsServices':
            results.awsServices = await validator.validateAWSServices();
            break;
          case 'llmProviders':
            results.llmProviders = await validator.validateLLMProviders();
            break;
          case 'integrations':
            results.integrations = await validator.validateIntegrations();
            break;
          case 'monitoring':
            results.monitoring = await validator.validateMonitoring();
            break;
          case 'security':
            results.security = await validator.validateSecurity();
            break;
          case 'performance':
            results.performance = await validator.validatePerformance();
            break;
        }
      }

      const successCount = Object.values(results).filter((r: any) => r.success).length;
      const totalCount = Object.keys(results).length;

      return NextResponse.json({
        customValidation: true,
        overall: {
          success: successCount === totalCount,
          score: Math.round((successCount / totalCount) * 100),
          duration: Date.now() - start,
          timestamp: new Date().toISOString()
        },
        results,
        summary: {
          requested: components,
          successful: successCount,
          total: totalCount
        }
      }, { status: successCount === totalCount ? 200 : 422 });
    } else {
      // Run full validation
      report = await validator.runDeploymentHealthCheck();
      return NextResponse.json(report, {
        status: report.overall.success ? 200 : 422
      });
    }

  } catch (error) {
    console.error('Custom deployment validation failed:', error);

    Sentry.captureException(error, {
      tags: {
        component: 'deployment-validation',
        endpoint: '/api/validate',
        method: 'POST'
      },
      extra: {
        duration: Date.now() - start
      }
    });

    return NextResponse.json({
      error: 'Custom validation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      duration: Date.now() - start
    }, { status: 500 });
  }
}