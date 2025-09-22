import { StackServerApp } from "@stackframe/stack";
import { getAuthEnvironmentVariables, validateServerStackAuth } from "./lib/auth/config-validator";

// Initialize Stack Auth conditionally with safe environment access
let stackServerApp: StackServerApp | null = null;

try {
  const authEnv = getAuthEnvironmentVariables();
  const serverValidation = validateServerStackAuth();

  // Detailed logging for debugging
  console.log('🔍 Stack Auth Environment Check:', {
    nodeEnv: authEnv.nodeEnv,
    hasProjectId: !!authEnv.projectId,
    hasSecretKey: !!authEnv.secretKey,
    hasPublishableKey: !!authEnv.hasPublishableKey,
    projectIdLength: authEnv.projectId?.length || 0,
    secretKeyLength: authEnv.secretKey?.length || 0,
    validationStatus: serverValidation.isValid ? 'VALID' : 'INVALID'
  });

  if (serverValidation.isValid) {
    stackServerApp = new StackServerApp({
      tokenStore: "nextjs-cookie", // storing auth tokens in cookies
    });
    console.log('✅ Stack Auth initialized successfully');
    console.log(`   Project ID: ${authEnv.projectId?.substring(0, 8)}...`);
    console.log(`   Secret Key: ${authEnv.secretKey?.substring(0, 8)}...`);
    console.log('   📊 Check /api/auth-health for detailed diagnostics');
  } else {
    console.warn('⚠️ Stack Auth not initialized - configuration validation failed');

    if (serverValidation.missing.length > 0) {
      console.warn(`   Missing variables: ${serverValidation.missing.join(', ')}`);
    }

    console.warn('💡 Troubleshooting steps:');
    console.warn('   1. Check /api/auth-health endpoint for detailed diagnostics');
    console.warn('   2. Verify environment variables in deployment platform');
    console.warn('   3. Ensure variable names match exactly (case-sensitive)');
    console.warn('   4. Check Stack Auth dashboard for correct values');
    console.warn(`   5. Current NODE_ENV: ${authEnv.nodeEnv}`);
  }
} catch (error) {
  console.error('❌ Failed to initialize Stack Auth:', error);
  console.error('   This error occurred during module initialization');
  console.error('   📊 Check /api/auth-health for comprehensive diagnostics');
  console.error('   🔧 Check /api/health for general environment status');
  stackServerApp = null;
}

export { stackServerApp };