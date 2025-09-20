import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');

  // Create a browser instance for setup tasks
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Verify the development server is running
    console.log('🔍 Checking development server...');
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');

    // Verify essential services are available
    console.log('🔍 Checking API health...');
    const healthResponse = await page.goto(`${baseURL}/api/health`);
    if (!healthResponse?.ok()) {
      throw new Error('Health check failed - API not responding correctly');
    }

    // Verify authentication service
    console.log('🔍 Checking authentication service...');
    const authResponse = await page.goto(`${baseURL}/api/test-auth`);
    if (!authResponse?.ok()) {
      console.warn('⚠️  Authentication service check failed - some tests may be skipped');
    }

    // Set up test data if needed
    console.log('📋 Setting up test environment...');

    // Create test user if not exists (for authenticated tests)
    // This would be expanded based on actual authentication requirements

    console.log('✅ Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;