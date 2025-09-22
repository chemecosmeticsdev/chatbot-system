/**
 * Stack Auth Configuration Validator
 *
 * Provides safe validation and diagnostics for Stack Auth environment variables
 * across different deployment environments and contexts.
 */

export interface AuthEnvironmentVariables {
  projectId: string | null;
  secretKey: string | null;
  publishableKey: string | null;
  nodeEnv: string;
  hasRequiredVars: boolean;
  hasPublishableKey: boolean;
}

export interface AuthConfigValidation {
  isValid: boolean;
  missing: string[];
  warnings: string[];
  environment: AuthEnvironmentVariables;
  context: {
    isServer: boolean;
    isClient: boolean;
    isBuild: boolean;
    timestamp: string;
  };
  diagnostics: {
    projectIdValid: boolean;
    secretKeyValid: boolean;
    publishableKeyValid: boolean;
    lengthCheck: {
      projectId: number;
      secretKey: number;
      publishableKey: number;
    };
  };
}

/**
 * Safe environment variable access without throwing errors
 */
export function getAuthEnvironmentVariables(): AuthEnvironmentVariables {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
  const secretKey = process.env.STACK_SECRET_SERVER_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;
  const nodeEnv = process.env.NODE_ENV || 'unknown';

  return {
    projectId: projectId?.trim() || null,
    secretKey: secretKey?.trim() || null,
    publishableKey: publishableKey?.trim() || null,
    nodeEnv,
    hasRequiredVars: !!(projectId?.trim() && secretKey?.trim()),
    hasPublishableKey: !!(publishableKey?.trim())
  };
}

/**
 * Comprehensive Stack Auth configuration validation
 */
export function validateStackAuthConfig(): AuthConfigValidation {
  const authEnv = getAuthEnvironmentVariables();
  const missing: string[] = [];
  const warnings: string[] = [];

  // Detect context
  const isServer = typeof window === 'undefined';
  const isClient = typeof window !== 'undefined';
  const isBuild = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.NETLIFY;

  // Required variables check
  if (!authEnv.projectId) {
    missing.push('NEXT_PUBLIC_STACK_PROJECT_ID');
  }

  if (!authEnv.secretKey) {
    missing.push('STACK_SECRET_SERVER_KEY');
  }

  if (!authEnv.publishableKey) {
    missing.push('NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY');
  }

  // Validation checks
  const projectIdValid = !!(authEnv.projectId && authEnv.projectId.length > 10);
  const secretKeyValid = !!(authEnv.secretKey && authEnv.secretKey.length >= 64);
  const publishableKeyValid = !!(authEnv.publishableKey && authEnv.publishableKey.length > 10);

  // Warnings for invalid formats
  if (authEnv.projectId && !projectIdValid) {
    warnings.push('NEXT_PUBLIC_STACK_PROJECT_ID appears to be too short or invalid format');
  }

  if (authEnv.secretKey && !secretKeyValid) {
    warnings.push('STACK_SECRET_SERVER_KEY should be at least 64 characters long');
  }

  if (authEnv.publishableKey && !publishableKeyValid) {
    warnings.push('NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY appears to be invalid format');
  }

  // Context-specific warnings
  if (isClient && !authEnv.projectId) {
    warnings.push('Client-side Stack Auth requires NEXT_PUBLIC_STACK_PROJECT_ID');
  }

  if (isServer && !authEnv.secretKey) {
    warnings.push('Server-side Stack Auth requires STACK_SECRET_SERVER_KEY');
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
    environment: authEnv,
    context: {
      isServer,
      isClient,
      isBuild,
      timestamp: new Date().toISOString()
    },
    diagnostics: {
      projectIdValid,
      secretKeyValid,
      publishableKeyValid,
      lengthCheck: {
        projectId: authEnv.projectId?.length || 0,
        secretKey: authEnv.secretKey?.length || 0,
        publishableKey: authEnv.publishableKey?.length || 0
      }
    }
  };
}

/**
 * Get Stack Auth configuration status with detailed diagnostics
 */
export function getStackAuthStatus(): {
  status: 'configured' | 'partial' | 'missing';
  message: string;
  validation: AuthConfigValidation;
} {
  const validation = validateStackAuthConfig();

  if (validation.isValid) {
    return {
      status: 'configured',
      message: 'Stack Auth is properly configured',
      validation
    };
  }

  if (validation.missing.length < 3) {
    return {
      status: 'partial',
      message: `Stack Auth partially configured. Missing: ${validation.missing.join(', ')}`,
      validation
    };
  }

  return {
    status: 'missing',
    message: 'Stack Auth is not configured. All required environment variables are missing.',
    validation
  };
}

/**
 * Client-safe Stack Auth validation (only uses NEXT_PUBLIC_ variables)
 */
export function validateClientStackAuth(): {
  isValid: boolean;
  projectId: string | null;
  publishableKey: string | null;
  missing: string[];
} {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID?.trim() || null;
  const publishableKey = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY?.trim() || null;
  const missing: string[] = [];

  if (!projectId) {
    missing.push('NEXT_PUBLIC_STACK_PROJECT_ID');
  }

  if (!publishableKey) {
    missing.push('NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY');
  }

  return {
    isValid: missing.length === 0,
    projectId,
    publishableKey,
    missing
  };
}

/**
 * Server-safe Stack Auth validation (includes server-only variables)
 */
export function validateServerStackAuth(): {
  isValid: boolean;
  projectId: string | null;
  secretKey: string | null;
  publishableKey: string | null;
  missing: string[];
} {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID?.trim() || null;
  const secretKey = process.env.STACK_SECRET_SERVER_KEY?.trim() || null;
  const publishableKey = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY?.trim() || null;
  const missing: string[] = [];

  if (!projectId) {
    missing.push('NEXT_PUBLIC_STACK_PROJECT_ID');
  }

  if (!secretKey) {
    missing.push('STACK_SECRET_SERVER_KEY');
  }

  if (!publishableKey) {
    missing.push('NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY');
  }

  return {
    isValid: missing.length === 0,
    projectId,
    secretKey,
    publishableKey,
    missing
  };
}

/**
 * Generate troubleshooting information for Stack Auth configuration issues
 */
export function generateStackAuthTroubleshootingInfo(validation: AuthConfigValidation): string[] {
  const info: string[] = [];

  info.push('🔧 Stack Auth Troubleshooting Information:');
  info.push('');

  // Environment context
  info.push(`Environment: ${validation.environment.nodeEnv}`);
  info.push(`Context: ${validation.context.isServer ? 'Server' : 'Client'} ${validation.context.isBuild ? '(Build)' : '(Runtime)'}`);
  info.push(`Timestamp: ${validation.context.timestamp}`);
  info.push('');

  // Missing variables
  if (validation.missing.length > 0) {
    info.push('❌ Missing Environment Variables:');
    validation.missing.forEach(variable => {
      info.push(`   - ${variable}`);
    });
    info.push('');
  }

  // Warnings
  if (validation.warnings.length > 0) {
    info.push('⚠️ Configuration Warnings:');
    validation.warnings.forEach(warning => {
      info.push(`   - ${warning}`);
    });
    info.push('');
  }

  // Variable diagnostics
  info.push('🔍 Variable Diagnostics:');
  info.push(`   Project ID: ${validation.diagnostics.projectIdValid ? '✅' : '❌'} (${validation.diagnostics.lengthCheck.projectId} chars)`);
  info.push(`   Secret Key: ${validation.diagnostics.secretKeyValid ? '✅' : '❌'} (${validation.diagnostics.lengthCheck.secretKey} chars)`);
  info.push(`   Publishable Key: ${validation.diagnostics.publishableKeyValid ? '✅' : '❌'} (${validation.diagnostics.lengthCheck.publishableKey} chars)`);
  info.push('');

  // Platform-specific instructions
  info.push('💡 Platform-Specific Instructions:');
  info.push('   📦 AWS Amplify: Set variables in Environment Variables section');
  info.push('   🔺 Vercel: Use Environment Variables in project settings');
  info.push('   🌐 Netlify: Configure in Site Settings > Environment Variables');
  info.push('   🐳 Docker: Pass via -e flags or .env file');
  info.push('   💻 Local: Create .env.local file in project root');
  info.push('');

  // Next steps
  info.push('🚀 Next Steps:');
  info.push('   1. Verify environment variables are set in your deployment platform');
  info.push('   2. Check variable names match exactly (case-sensitive)');
  info.push('   3. Ensure variables are available during both build and runtime');
  info.push('   4. Restart your application after setting variables');
  info.push('   5. Check Stack Auth dashboard for correct values');

  return info;
}