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
    // Use client-safe validation since this runs in the browser
    const clientValidation = validateClientStackAuth();

    // Only show error if client-accessible variables are actually missing
    if (clientValidation.isValid) {
      // If client variables are fine, this is likely a server initialization issue
      return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center p-4">
          <div className="text-center space-y-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6 border border-yellow-200">
              <div className="text-yellow-600 text-4xl mb-4">🔄</div>
              <h2 className="text-xl font-semibold text-yellow-900 mb-2">Stack Auth Initializing</h2>
              <p className="text-yellow-700 mb-4">
                Stack Auth configuration appears correct, but server initialization is still in progress.
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
                <p className="text-sm font-medium text-yellow-800 mb-2">Environment Status:</p>
                <div className="grid grid-cols-2 gap-2 text-sm text-yellow-700">
                  <div>Project ID: {clientValidation.projectId ? '✅' : '❌'}</div>
                  <div>Publishable Key: {clientValidation.publishableKey ? '✅' : '❌'}</div>
                  <div>Client Variables: ✅ Complete</div>
                  <div>Server Status: 🔄 Initializing</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm font-medium"
                >
                  Retry Loading
                </button>
                <a
                  href="/api/auth-health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Check Server Status
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // If client variables are missing, show proper error
    const authStatus = getStackAuthStatus();
    const troubleshootingInfo = generateStackAuthTroubleshootingInfo(authStatus.validation);

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-2xl mx-auto">
          {/* Main Error Display */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-red-200">
            <div className="text-red-600 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">Client Authentication Variables Missing</h2>
            <p className="text-red-700 mb-4">
              Required client-side environment variables for Stack Auth are not configured.
            </p>

            {/* Quick Status */}
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="text-sm font-medium text-red-800 mb-2">Missing Client Variables:</p>
              <ul className="text-sm text-red-700 list-disc list-inside">
                {clientValidation.missing.map(variable => (
                  <li key={variable}>{variable}</li>
                ))}
              </ul>
            </div>

            {/* Environment Info */}
            <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-4">
              <p className="text-sm font-medium text-gray-800 mb-2">Environment Context:</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                <div>Context: Client-Side Browser</div>
                <div>Variables Scope: NEXT_PUBLIC_* only</div>
                <div>Has Project ID: {clientValidation.projectId ? '✅' : '❌'}</div>
                <div>Has Publishable Key: {clientValidation.publishableKey ? '✅' : '❌'}</div>
              </div>
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                <strong>Note:</strong> STACK_SECRET_SERVER_KEY is server-only and not accessible in the browser for security reasons.
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
          <div className="text-xs text-gray-500 space-y-1">
            <div>
              If you continue to experience issues, check the browser console and server logs for additional details.
            </div>
            <div className="flex justify-center space-x-4 mt-2">
              <a href="/api/health" target="_blank" className="text-blue-500 hover:text-blue-700">General Health</a>
              <a href="/api/auth-health" target="_blank" className="text-green-500 hover:text-green-700">Auth Diagnostics</a>
              <a href="https://docs.stack-auth.com/" target="_blank" className="text-purple-500 hover:text-purple-700">Documentation</a>
            </div>
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