import { NextResponse } from 'next/server';
import { testS3Connection } from '@/lib/aws';
import { validateEnvironment } from '@/lib/config';

export async function GET() {
  try {
    // Validate environment
    const envCheck = validateEnvironment();
    if (!envCheck.isValid) {
      return NextResponse.json({
        success: false,
        service: 's3',
        message: `Missing environment variables: ${envCheck.missing.join(', ')}`,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Test S3 connection
    const result = await testS3Connection();

    return NextResponse.json({
      success: result.success,
      service: 's3',
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    }, { status: result.success ? 200 : 500 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      service: 's3',
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}