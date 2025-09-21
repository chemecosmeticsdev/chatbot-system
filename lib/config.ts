// Environment configuration and validation
interface Config {
  // Neon Auth
  NEXT_PUBLIC_STACK_PROJECT_ID: string;
  NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: string;
  STACK_SECRET_SERVER_KEY: string;

  // Database
  DATABASE_URL: string;

  // AWS (using BAWS prefix for Amplify)
  BAWS_ACCESS_KEY_ID: string;
  BAWS_SECRET_ACCESS_KEY: string;
  DEFAULT_REGION: string;
  BEDROCK_REGION: string;
  S3_BUCKET_NAME: string;

  // Third-party APIs
  MISTRAL_API_KEY: string;
  LLAMAINDEX_API_KEY: string;
}

const requiredEnvVars: (keyof Config)[] = [
  'NEXT_PUBLIC_STACK_PROJECT_ID',
  'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY',
  'STACK_SECRET_SERVER_KEY',
  'DATABASE_URL',
  'BAWS_ACCESS_KEY_ID',
  'BAWS_SECRET_ACCESS_KEY',
  'DEFAULT_REGION',
  'BEDROCK_REGION',
  'S3_BUCKET_NAME',
  'MISTRAL_API_KEY',
  'LLAMAINDEX_API_KEY'
];

export function validateEnvironment(): { isValid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (!value || value.trim() === '') {
      missing.push(envVar);
    }
  }

  // Specific validations based on validation report issues
  const stackSecretKey = process.env.STACK_SECRET_SERVER_KEY;
  if (stackSecretKey && stackSecretKey.length < 64) {
    warnings.push(`STACK_SECRET_SERVER_KEY should be at least 64 characters (current: ${stackSecretKey.length})`);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && databaseUrl.includes('sslmode=require') && !databaseUrl.includes('ssl=true')) {
    warnings.push('DATABASE_URL uses sslmode=require format, consider using ssl=true parameter format for better compatibility');
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings
  };
}

export function getConfig(): Config {
  const { isValid, missing, warnings } = validateEnvironment();

  // Log warnings but don't block execution
  if (warnings.length > 0) {
    console.warn('⚠️ Configuration warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  }

  if (!isValid) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('💡 For Amplify deployment, ensure all environment variables are:');
    console.error('   1. Set in the Amplify Console Environment Variables section');
    console.error('   2. Properly referenced in amplify.yml env section');
    console.error('   3. Available during both build and runtime phases');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    NEXT_PUBLIC_STACK_PROJECT_ID: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
    NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
    STACK_SECRET_SERVER_KEY: process.env.STACK_SECRET_SERVER_KEY!,
    DATABASE_URL: process.env.DATABASE_URL!,
    BAWS_ACCESS_KEY_ID: process.env.BAWS_ACCESS_KEY_ID!,
    BAWS_SECRET_ACCESS_KEY: process.env.BAWS_SECRET_ACCESS_KEY!,
    DEFAULT_REGION: process.env.DEFAULT_REGION!,
    BEDROCK_REGION: process.env.BEDROCK_REGION!,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME!,
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY!,
    LLAMAINDEX_API_KEY: process.env.LLAMAINDEX_API_KEY!,
  };
}

export function getConfigSafe(): Partial<Config> {
  // Non-blocking version that never throws - safe for SSR
  const { missing, warnings } = validateEnvironment();

  if (warnings.length > 0) {
    console.warn('⚠️ Configuration warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  }

  if (missing.length > 0) {
    console.warn(`⚠️ Some environment variables are missing: ${missing.join(', ')}`);
    console.warn('Application will continue with limited functionality');
  }

  return {
    NEXT_PUBLIC_STACK_PROJECT_ID: process.env.NEXT_PUBLIC_STACK_PROJECT_ID || undefined,
    NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY || undefined,
    STACK_SECRET_SERVER_KEY: process.env.STACK_SECRET_SERVER_KEY || undefined,
    DATABASE_URL: process.env.DATABASE_URL || undefined,
    BAWS_ACCESS_KEY_ID: process.env.BAWS_ACCESS_KEY_ID || undefined,
    BAWS_SECRET_ACCESS_KEY: process.env.BAWS_SECRET_ACCESS_KEY || undefined,
    DEFAULT_REGION: process.env.DEFAULT_REGION || undefined,
    BEDROCK_REGION: process.env.BEDROCK_REGION || undefined,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || undefined,
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || undefined,
    LLAMAINDEX_API_KEY: process.env.LLAMAINDEX_API_KEY || undefined,
  };
}

export function getClientConfig() {
  return {
    NEXT_PUBLIC_STACK_PROJECT_ID: process.env.NEXT_PUBLIC_STACK_PROJECT_ID,
    NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
  };
}

// Development-friendly configuration that allows missing variables
export function getConfigForDevelopment(): Partial<Config> {
  const { warnings } = validateEnvironment();

  if (warnings.length > 0) {
    console.warn('⚠️ Configuration warnings (development mode):');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  }

  // Return partial config with defaults for development
  return {
    NEXT_PUBLIC_STACK_PROJECT_ID: process.env.NEXT_PUBLIC_STACK_PROJECT_ID || 'dev-project-id',
    NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY || 'dev-publishable-key',
    STACK_SECRET_SERVER_KEY: process.env.STACK_SECRET_SERVER_KEY || 'dev-secret-server-key-that-is-exactly-64-characters-long-enough',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://dev:dev@localhost:5432/dev_chatbot',
    BAWS_ACCESS_KEY_ID: process.env.BAWS_ACCESS_KEY_ID || 'dev-access-key',
    BAWS_SECRET_ACCESS_KEY: process.env.BAWS_SECRET_ACCESS_KEY || 'dev-secret-access-key',
    DEFAULT_REGION: process.env.DEFAULT_REGION || 'ap-southeast-1',
    BEDROCK_REGION: process.env.BEDROCK_REGION || 'us-east-1',
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || 'dev-chatbot-bucket',
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || 'dev-mistral-key',
    LLAMAINDEX_API_KEY: process.env.LLAMAINDEX_API_KEY || 'dev-llamaindex-key',
  };
}

// Environment check utilities
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

// Safe config getter that adapts to environment
export function getConfigAdaptive(): Partial<Config> {
  if (isTest()) {
    // In test environment, use test configurations
    return getConfigSafe();
  }

  if (isDevelopment()) {
    // In development, be more lenient
    return getConfigForDevelopment();
  }

  // In production, use strict validation
  return getConfig();
}

