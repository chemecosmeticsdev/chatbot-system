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
  'MISTRAL_API_KEY',
  'LLAMAINDEX_API_KEY'
];

export function validateEnvironment(): { isValid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (!value || value.trim() === '') {
      missing.push(envVar);
    }
  }

  return {
    isValid: missing.length === 0,
    missing
  };
}

export function getConfig(): Config {
  const { isValid, missing } = validateEnvironment();

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
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY!,
    LLAMAINDEX_API_KEY: process.env.LLAMAINDEX_API_KEY!,
  };
}

export function getClientConfig() {
  return {
    NEXT_PUBLIC_STACK_PROJECT_ID: process.env.NEXT_PUBLIC_STACK_PROJECT_ID,
    NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
  };
}

export function getSafeConfig(): Partial<Config> {
  // Safe version that doesn't throw errors - for use in SSR components
  const { isValid, missing } = validateEnvironment();

  if (!isValid) {
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
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || undefined,
    LLAMAINDEX_API_KEY: process.env.LLAMAINDEX_API_KEY || undefined,
  };
}