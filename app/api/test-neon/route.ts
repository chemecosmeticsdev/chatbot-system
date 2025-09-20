import { NextResponse } from 'next/server';
import { testNeonConnection, createTestTable } from '@/lib/neon';
import { validateEnvironment } from '@/lib/config';

export async function GET() {
  try {
    // First validate environment
    const envCheck = validateEnvironment();
    if (!envCheck.isValid) {
      return NextResponse.json({
        success: false,
        service: 'neon',
        message: `Missing environment variables: ${envCheck.missing.join(', ')}`,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Test database connection
    const connectionTest = await testNeonConnection();
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        service: 'neon',
        message: connectionTest.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Test table operations
    const tableTest = await createTestTable();

    return NextResponse.json({
      success: true,
      service: 'neon',
      message: 'Neon PostgreSQL connection and operations successful',
      data: {
        connection: connectionTest.data,
        tableOperations: tableTest
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      service: 'neon',
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}