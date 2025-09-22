'use client';

import React, { ReactNode } from 'react';
import { StackProvider, StackTheme } from '@stackframe/stack';
import { stackServerApp } from '@/stack';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication provider using Stack Auth
 */
export function AuthProvider({ children }: AuthProviderProps) {
  if (!stackServerApp) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="text-red-600 text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-red-900">Authentication Not Configured</h2>
          <p className="text-red-700">
            Stack Auth is not properly configured. Please check your environment variables.
          </p>
          <p className="text-sm text-red-600">
            Required: NEXT_PUBLIC_STACK_PROJECT_ID, STACK_SECRET_SERVER_KEY
          </p>
        </div>
      </div>
    );
  }

  return (
    <StackProvider app={stackServerApp as any}>
      <StackTheme>
        {children}
      </StackTheme>
    </StackProvider>
  );
}

// Re-export Stack Auth hooks for consistency
export { useUser, useStackApp } from '@stackframe/stack';