import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {
  test('should have healthy API endpoints', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test health endpoint
    const healthResponse = await page.request.get('/api/health');
    expect(healthResponse.ok()).toBeTruthy();

    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('healthy');
    expect(healthData.environment).toBeDefined();
    expect(healthData.environment.variables).toBeDefined();
  });

  test('should validate authentication API', async ({ page }) => {
    const authResponse = await page.request.get('/api/test-auth');
    expect(authResponse.ok()).toBeTruthy();

    const authData = await authResponse.json();
    expect(authData.service).toBe('neon-auth');
    expect(authData.data).toBeDefined();
    expect(authData.data.stackAuthConfigured).toBeDefined();
  });

  test('should test database connectivity', async ({ page }) => {
    const dbResponse = await page.request.get('/api/test-neon');
    expect(dbResponse.ok()).toBeTruthy();

    const dbData = await dbResponse.json();
    expect(dbData.service).toBe('neon-postgresql');
    expect(dbData.success).toBeTruthy();
  });

  test('should validate AWS service connections', async ({ page }) => {
    // Test S3 connectivity
    const s3Response = await page.request.get('/api/test-s3');
    expect(s3Response.ok()).toBeTruthy();

    const s3Data = await s3Response.json();
    expect(s3Data.service).toBe('aws-s3');

    // Test Bedrock connectivity
    const bedrockResponse = await page.request.get('/api/test-bedrock');
    expect(bedrockResponse.ok()).toBeTruthy();

    const bedrockData = await bedrockResponse.json();
    expect(bedrockData.service).toBe('aws-bedrock');
  });

  test('should validate OCR service connections', async ({ page }) => {
    // Test Mistral OCR
    const mistralResponse = await page.request.get('/api/test-mistral');
    expect(mistralResponse.ok()).toBeTruthy();

    const mistralData = await mistralResponse.json();
    expect(mistralData.service).toBe('mistral-ocr');

    // Test LlamaIndex OCR
    const llamaResponse = await page.request.get('/api/test-llamaindex');
    expect(llamaResponse.ok()).toBeTruthy();

    const llamaData = await llamaResponse.json();
    expect(llamaData.service).toBe('llamaindex-ocr');
  });

  test('should run comprehensive API test suite', async ({ page }) => {
    // This test runs the full API test suite
    const testAllResponse = await page.request.get('/api/test-all');
    expect(testAllResponse.ok()).toBeTruthy();

    const testResults = await testAllResponse.json();
    expect(testResults.summary).toBeDefined();
    expect(testResults.summary.total).toBeGreaterThan(0);
    expect(testResults.summary.passed).toBeGreaterThanOrEqual(0);

    // Ensure most tests are passing (allow for some failures in development)
    const successRate = testResults.summary.passed / testResults.summary.total;
    expect(successRate).toBeGreaterThan(0.7); // At least 70% success rate
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Test a non-existent endpoint
    const response = await page.request.get('/api/non-existent-endpoint');
    expect(response.status()).toBe(404);
  });

  test('should validate API response times', async ({ page, browserName }) => {
    // Skip performance tests on slower browsers in CI
    if (browserName === 'webkit' && process.env.CI) {
      test.skip();
    }

    const startTime = Date.now();
    const healthResponse = await page.request.get('/api/health');
    const responseTime = Date.now() - startTime;

    expect(healthResponse.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
  });

  test('should validate API response formats', async ({ page }) => {
    const healthResponse = await page.request.get('/api/health');
    const healthData = await healthResponse.json();

    // Validate response structure
    expect(healthData).toHaveProperty('status');
    expect(healthData).toHaveProperty('timestamp');
    expect(healthData).toHaveProperty('environment');
    expect(healthData.environment).toHaveProperty('variables');
    expect(healthData.environment).toHaveProperty('summary');

    // Validate timestamp format
    expect(new Date(healthData.timestamp).toISOString()).toBe(healthData.timestamp);
  });

  test('should handle concurrent API requests', async ({ page }) => {
    // Test concurrent requests to health endpoint
    const requests = Array(5).fill(null).map(() =>
      page.request.get('/api/health')
    );

    const responses = await Promise.all(requests);

    // All requests should succeed
    responses.forEach(response => {
      expect(response.ok()).toBeTruthy();
    });
  });
});