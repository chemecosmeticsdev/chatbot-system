#!/usr/bin/env node

const http = require('http');

async function testAPIEndpoints() {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  console.log(`🧪 Testing API endpoints at ${baseUrl}`);

  try {
    // Start the Next.js server if running locally
    if (!process.env.VERCEL_URL) {
      console.log('🚀 Starting local server...');
      const { spawn } = require('child_process');
      const server = spawn('npm', ['run', 'start'], { stdio: 'pipe' });

      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    const response = await fetch(`${baseUrl}/api/test-all`);
    const results = await response.json();

    console.log('\n📊 API Test Results:');
    console.log(`Total: ${results.summary?.total || 0}`);
    console.log(`Passed: ${results.summary?.passed || 0}`);
    console.log(`Failed: ${results.summary?.failed || 0}`);

    if (results.results) {
      results.results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.service.toUpperCase()}: ${result.message}`);
      });
    }

    // Exit with error code if any tests failed
    const allPassed = results.summary?.passed === results.summary?.total;
    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('❌ API test suite failed:', error.message);
    process.exit(1);
  }
}

testAPIEndpoints();