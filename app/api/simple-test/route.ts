import { NextResponse } from 'next/server';

export async function GET() {
  // Simple test without any external dependencies
  return NextResponse.json({
    success: true,
    message: 'Simple API endpoint working',
    timestamp: new Date().toISOString(),
    server: 'Amplify Next.js'
  });
}