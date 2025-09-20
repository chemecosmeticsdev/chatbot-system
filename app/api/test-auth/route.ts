import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { validateEnvironment } from '@/lib/config';

export async function GET() {
  try {
    // Check if Stack Auth is available
    if (!stackServerApp) {
      return NextResponse.json({
        success: false,
        service: 'neon-auth',
        message: 'Stack Auth not initialized - missing required environment variables',
        data: {
          stackAuthConfigured: false,
          missingVars: validateEnvironment().missing.filter(v => v.includes('STACK')),
          projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID || 'not-set'
        },
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