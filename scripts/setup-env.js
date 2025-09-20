#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function setupEnvironment() {
  console.log('🔧 Setting up environment...');

  // Check if .env.local exists
  const envPath = path.join(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath)) {
    console.log('⚠️ .env.local not found - using environment variables from system');
    return;
  }

  // Validate required environment variables
  const requiredVars = [
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

  const missing = [];

  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    console.log('❌ Missing environment variables:');
    missing.forEach(varName => console.log(`   - ${varName}`));
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
  console.log(`📋 Found ${requiredVars.length} required environment variables`);
}

setupEnvironment();