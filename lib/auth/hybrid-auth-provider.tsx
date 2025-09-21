'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser as useStackUser } from '@stackframe/stack';
import { FallbackAuthProvider, useFallbackAuth } from './fallback-auth-provider';

interface HybridAuthContextType {
  authMode: 'stack' | 'fallback' | 'loading';
  networkError: string | null;
  retryStackAuth: () => void;
}

const HybridAuthContext = createContext<HybridAuthContextType | null>(null);

interface HybridAuthProviderProps {
  children: ReactNode;
}

/**
 * Hybrid authentication provider that attempts Stack Auth first,
 * then falls back to mock authentication if there are network issues
 */
export function HybridAuthProvider({ children }: HybridAuthProviderProps) {
  const [authMode, setAuthMode] = useState<'stack' | 'fallback' | 'loading'>('loading');
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const checkStackAuth = async () => {
      try {
        // Test if Stack Auth is available by making a simple request
        const response = await fetch('https://api.stack-auth.com/api/v1/health', {
          method: 'GET',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (response.ok) {
          setAuthMode('stack');
          setNetworkError(null);
        } else {
          throw new Error('Stack Auth API not responding');
        }
      } catch (error: any) {
        console.warn('Stack Auth unavailable, falling back to development auth:', error.message);
        setNetworkError(
          'Stack Auth service is currently unavailable. Using development authentication mode.'
        );
        setAuthMode('fallback');
      }
    };

    checkStackAuth();
  }, [retryCount]);

  const retryStackAuth = () => {
    setAuthMode('loading');
    setRetryCount(prev => prev + 1);
  };

  const value: HybridAuthContextType = {
    authMode,
    networkError,
    retryStackAuth,
  };

  if (authMode === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <h2 className="text-xl font-semibold text-gray-900">Initializing Authentication</h2>
          <p className="text-gray-600">Checking authentication services...</p>
        </div>
      </div>
    );
  }

  if (authMode === 'fallback') {
    return (
      <FallbackAuthProvider>
        <HybridAuthContext.Provider value={value}>
          {children}
        </HybridAuthContext.Provider>
      </FallbackAuthProvider>
    );
  }

  // Stack Auth mode
  return (
    <HybridAuthContext.Provider value={value}>
      {children}
    </HybridAuthContext.Provider>
  );
}

export function useHybridAuth() {
  const context = useContext(HybridAuthContext);
  if (!context) {
    throw new Error('useHybridAuth must be used within a HybridAuthProvider');
  }
  return context;
}

/**
 * Universal user hook that works with both Stack Auth and fallback auth
 */
export function useUniversalUser(options?: { or?: 'redirect' }) {
  const { authMode } = useHybridAuth();
  const stackUser = authMode === 'stack' ? useStackUser(options as any) : null;
  const fallbackAuth = authMode === 'fallback' ? useFallbackAuth() : null;

  if (authMode === 'stack') {
    return stackUser;
  }

  if (authMode === 'fallback' && fallbackAuth) {
    if (options?.or === 'redirect') {
      return fallbackAuth.user;
    }
    return fallbackAuth.user;
  }

  return undefined; // Loading state
}