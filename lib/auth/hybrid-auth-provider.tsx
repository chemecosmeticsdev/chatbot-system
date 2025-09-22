'use client';

import React, { ReactNode, useState } from 'react';
import { StackProvider, StackTheme } from '@stackframe/stack';
import { stackServerApp } from '@/stack';
import {
  getStackAuthStatus,
  generateStackAuthTroubleshootingInfo,
  validateClientStackAuth
} from './config-validator';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Enhanced authentication provider with detailed diagnostics
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!stackServerApp) {
    // Get detailed diagnostics for the error
    const authStatus = getStackAuthStatus();
    const clientValidation = validateClientStackAuth();
    const troubleshootingInfo = generateStackAuthTroubleshootingInfo(authStatus.validation);

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-2xl mx-auto">
          {/* Main Error Display */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-red-200">
            <div className="text-red-600 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">Authentication Not Configured</h2>
            <p className="text-red-700 mb-4">
              Stack Auth initialization failed. Your environment variables may not be properly configured.
            </p>

            {/* Quick Status */}
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="text-sm font-medium text-red-800 mb-2">Status: {authStatus.status.toUpperCase()}</p>
              <p className="text-sm text-red-700">{authStatus.message}</p>

              {authStatus.validation.missing.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-red-800 mb-1">Missing Variables:</p>
                  <ul className="text-sm text-red-700 list-disc list-inside">
                    {authStatus.validation.missing.map(variable => (
                      <li key={variable}>{variable}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Environment Info */}
            <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-4">
              <p className="text-sm font-medium text-gray-800 mb-2">Environment Context:</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                <div>Environment: {authStatus.validation.environment.nodeEnv}</div>
                <div>Context: {authStatus.validation.context.isServer ? 'Server' : 'Client'}</div>
                <div>Has Project ID: {clientValidation.projectId ? '✅' : '❌'}</div>
                <div>Has Publishable Key: {clientValidation.publishableKey ? '✅' : '❌'}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
              >
                {showDetails ? 'Hide Details' : 'Show Troubleshooting Details'}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Retry Initialization
              </button>
            </div>
          </div>

          {/* Detailed Troubleshooting Info */}
          {showDetails && (
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Troubleshooting</h3>
              <div className="bg-gray-900 text-gray-100 rounded p-4 overflow-auto max-h-96">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {troubleshootingInfo.join('\n')}
                </pre>
              </div>

              {/* Quick Actions */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-800 mb-2">Quick Actions:</h4>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/api/health"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                  >
                    Check API Health
                  </a>
                  <a
                    href="/api/auth-health"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                  >
                    Check Auth Config
                  </a>
                  <a
                    href="https://app.stack-auth.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors"
                  >
                    Stack Auth Dashboard
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-xs text-gray-500">
            If you continue to experience issues, check the browser console and server logs for additional details.
          </div>
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