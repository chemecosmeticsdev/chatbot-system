#!/usr/bin/env node

/**
 * Test script for Stack Auth configuration validation
 *
 * This script tests the auth configuration validator with different
 * environment variable scenarios to ensure it works correctly.
 */

const path = require('path');

// Test scenarios with different environment setups
const testScenarios = [
  {
    name: 'All Variables Present',
    env: {
      NEXT_PUBLIC_STACK_PROJECT_ID: 'test_project_id_123456',
      STACK_SECRET_SERVER_KEY: 'test_secret_key_that_is_exactly_64_characters_long_for_testing_purposes',
      NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: 'test_publishable_key_123456',
      NODE_ENV: 'development'
    }
  },
  {
    name: 'Missing Secret Key',
    env: {
      NEXT_PUBLIC_STACK_PROJECT_ID: 'test_project_id_123456',
      NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: 'test_publishable_key_123456',
      NODE_ENV: 'development'
    }
  },
  {
    name: 'Missing Project ID',
    env: {
      STACK_SECRET_SERVER_KEY: 'test_secret_key_that_is_exactly_64_characters_long_for_testing_purposes',
      NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: 'test_publishable_key_123456',
      NODE_ENV: 'development'
    }
  },
  {
    name: 'All Variables Missing',
    env: {
      NODE_ENV: 'development'
    }
  },
  {
    name: 'Invalid Secret Key (Too Short)',
    env: {
      NEXT_PUBLIC_STACK_PROJECT_ID: 'test_project_id_123456',
      STACK_SECRET_SERVER_KEY: 'short_key',
      NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: 'test_publishable_key_123456',
      NODE_ENV: 'development'
    }
  }
];

async function runTest(scenario) {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log('=' .repeat(50));

  // Backup original environment
  const originalEnv = {};
  ['NEXT_PUBLIC_STACK_PROJECT_ID', 'STACK_SECRET_SERVER_KEY', 'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY', 'NODE_ENV'].forEach(key => {
    originalEnv[key] = process.env[key];
    delete process.env[key];
  });

  // Set test environment
  Object.assign(process.env, scenario.env);

  try {
    // Clear module cache to get fresh import
    const configValidatorPath = path.resolve(__dirname, '../lib/auth/config-validator.ts');
    delete require.cache[configValidatorPath];

    // Import and test the validator
    const { validateStackAuthConfig, getStackAuthStatus } = require('../lib/auth/config-validator.ts');

    const validation = validateStackAuthConfig();
    const status = getStackAuthStatus();

    console.log(`Status: ${status.status.toUpperCase()}`);
    console.log(`Valid: ${validation.isValid ? '✅' : '❌'}`);
    console.log(`Missing: ${validation.missing.join(', ') || 'None'}`);
    console.log(`Warnings: ${validation.warnings.length}`);

    if (validation.missing.length > 0) {
      console.log(`📋 Missing Variables: ${validation.missing.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      console.log(`⚠️ Warnings:`);
      validation.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    console.log(`Environment: ${validation.environment.nodeEnv}`);
    console.log(`Context: ${validation.context.isServer ? 'Server' : 'Client'}`);

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  } finally {
    // Restore original environment
    ['NEXT_PUBLIC_STACK_PROJECT_ID', 'STACK_SECRET_SERVER_KEY', 'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY', 'NODE_ENV'].forEach(key => {
      delete process.env[key];
      if (originalEnv[key] !== undefined) {
        process.env[key] = originalEnv[key];
      }
    });
  }
}

async function runAllTests() {
  console.log('🔍 Stack Auth Configuration Validator Tests');
  console.log('============================================');

  for (const scenario of testScenarios) {
    await runTest(scenario);
  }

  console.log('\n✅ All tests completed!');
  console.log('\n💡 To test in your actual environment:');
  console.log('   1. Check /api/health for general environment status');
  console.log('   2. Check /api/auth-health for detailed auth diagnostics');
  console.log('   3. Start the dev server and check console output');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testScenarios };