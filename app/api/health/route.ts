import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check without external dependencies
    const envVarsPresent = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      STACK_SECRET_SERVER_KEY: !!process.env.STACK_SECRET_SERVER_KEY,
      BAWS_ACCESS_KEY_ID: !!process.env.BAWS_ACCESS_KEY_ID,
      MISTRAL_API_KEY: !!process.env.MISTRAL_API_KEY,
      NODE_ENV: process.env.NODE_ENV || 'unknown'
    };

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: envVarsPresent,
      message: 'Basic health check passed'
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