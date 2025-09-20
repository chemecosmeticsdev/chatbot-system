import { NextResponse } from 'next/server';
import { validateEnvironment } from '@/lib/config';

export async function GET() {
  try {
    // Enhanced environment variable check
    const requiredVars = [
      'NEXT_PUBLIC_STACK_PROJECT_ID',
      'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY',
      'STACK_SECRET_SERVER_KEY',
      'DATABASE_URL',
      'BAWS_ACCESS_KEY_ID',
      'BAWS_SECRET_ACCESS_KEY',
      'DEFAULT_REGION',
      'BEDROCK_REGION',
      'MISTRAL_API_KEY',
      'LLAMAINDEX_API_KEY'
    ];

    const envStatus = {};
    const missingVars = [];
    const presentVars = [];

    requiredVars.forEach(varName => {
      const value = process.env[varName];
      const isPresent = !!(value && value.trim() !== '');
      envStatus[varName] = isPresent;

      if (isPresent) {
        presentVars.push(varName);
      } else {
        missingVars.push(varName);
      }
    });

    const envValidation = validateEnvironment();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: {
        variables: envStatus,
        summary: {
          total: requiredVars.length,
          present: presentVars.length,
          missing: missingVars.length,
          missingList: missingVars,
          presentList: presentVars
        },
        validation: {
          isValid: envValidation.isValid,
          missingFromValidation: envValidation.missing
        },
        nodeEnv: process.env.NODE_ENV || 'unknown'
      },
      message: missingVars.length === 0
        ? 'All environment variables present'
        : `${missingVars.length} environment variables missing`
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Health check failed'
    }, { status: 500 });
  }
}