#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function setupEnvironment() {
  console.log('🔧 Setting up environment...');

  // Check if .env.local exists
  const envPath = path.join(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath)) {
    console.log('⚠️ .env.local not found - using environment variables from system');
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
  const found = [];

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    } else {
      found.push(varName);
      // Log masked value for debugging (show first 4 and last 4 chars)
      const maskedValue = value.length > 8
        ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
        : '***';
      console.log(`   ✓ ${varName}: ${maskedValue}`);
    }
  });

  if (missing.length > 0) {
    console.log('❌ Missing environment variables:');
    missing.forEach(varName => console.log(`   - ${varName}`));
    console.log('');
    console.log('💡 For Amplify deployment, ensure all environment variables are:');
    console.log('   1. Set in the Amplify Console Environment Variables section');
    console.log('   2. Properly referenced in amplify.yml env section');
    console.log('   3. Available during both build and runtime phases');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
  console.log(`📋 Found ${found.length}/${requiredVars.length} required environment variables`);
}

setupEnvironment();