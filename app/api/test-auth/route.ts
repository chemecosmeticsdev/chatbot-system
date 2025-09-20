import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { validateEnvironment } from '@/lib/config';

export async function GET() {
  try {
    // Validate environment
    const envCheck = validateEnvironment();
    if (!envCheck.isValid) {
      return NextResponse.json({
        success: false,
        service: 'neon-auth',
        message: `Missing environment variables: ${envCheck.missing.join(', ')}`,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Test Stack Auth configuration
    const user = await stackServerApp.getUser();

    // Check if there are any users in the system
    const allUsers = await stackServerApp.listUsers();

    return NextResponse.json({
      success: true,
      service: 'neon-auth',
      message: 'Neon Auth (Stack Auth) configuration successful',
      data: {
        currentUser: user ? {
          id: user.id,
          displayName: user.displayName,
          primaryEmail: user.primaryEmail
        } : null,
        totalUsers: allUsers.length,
        stackAuthConfigured: true,
        projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      service: 'neon-auth',
      message: `Neon Auth test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}