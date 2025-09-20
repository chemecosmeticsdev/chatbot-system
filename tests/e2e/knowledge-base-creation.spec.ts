import { test, expect } from '@playwright/test';

/**
 * E2E Integration Test: Knowledge Base Creation
 *
 * This test validates the complete workflow of creating a knowledge base:
 * 1. Admin creates a product
 * 2. Admin uploads documents to the product
 * 3. System processes documents and creates embeddings
 * 4. Vector search returns relevant results
 *
 * Following TDD approach - this test MUST fail initially.
 */

test.describe('Knowledge Base Creation E2E', () => {
  test('Admin can create knowledge base and search documents', async ({ page }) => {
    // Step 1: Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for authentication to complete (assuming auto-login in test environment)
    await page.waitForLoadState('networkidle');

    // Step 2: Navigate to Products page
    await page.click('[data-testid="sidebar-products-link"]');
    await expect(page).toHaveURL('/dashboard/products');

    // Step 3: Create a new product
    await page.click('[data-testid="create-product-button"]');

    await page.fill('[data-testid="product-name-input"]', 'Test Electronics Product');
    await page.fill('[data-testid="product-description-input"]', 'A comprehensive test product for electronics category');
    await page.selectOption('[data-testid="product-category-select"]', 'Electronics');
    await page.fill('[data-testid="product-sku-input"]', 'TEST-ELEC-001');

    await page.click('[data-testid="create-product-submit"]');

    // Verify product creation success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-list"]')).toContainText('Test Electronics Product');

    // Step 4: Upload documents to the product
    await page.click('[data-testid="product-actions-menu"]');
    await page.click('[data-testid="upload-documents-action"]');

    // Simulate file upload (using test files)
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="file-upload-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(['tests/fixtures/test-document.pdf']);

    // Set document type
    await page.selectOption('[data-testid="document-type-select"]', 'technical');

    // Enable auto-processing
    await page.check('[data-testid="auto-process-checkbox"]');

    await page.click('[data-testid="upload-submit-button"]');

    // Step 5: Wait for document processing
    await expect(page.locator('[data-testid="upload-success-message"]')).toBeVisible();

    // Navigate to document processing status
    await page.click('[data-testid="view-processing-status"]');

    // Wait for processing to complete (with timeout)
    await expect(page.locator('[data-testid="processing-status"]')).toHaveText('completed', { timeout: 30000 });

    // Verify chunks were created
    const chunkCount = await page.locator('[data-testid="chunk-count"]').textContent();
    expect(parseInt(chunkCount || '0')).toBeGreaterThan(0);

    // Step 6: Test vector search functionality
    await page.goto('/dashboard/playground');

    // Select the chatbot that has access to our product
    await page.selectOption('[data-testid="chatbot-select"]', { label: 'Default Assistant' });

    // Send a query related to our uploaded document
    await page.fill('[data-testid="message-input"]', 'What are the technical specifications of the electronics product?');
    await page.click('[data-testid="send-message-button"]');

    // Wait for response
    await expect(page.locator('[data-testid="bot-response"]')).toBeVisible({ timeout: 10000 });

    // Verify response contains information from our document
    const response = await page.locator('[data-testid="bot-response"]').textContent();
    expect(response).toContain('electronics'); // Should reference our product

    // Verify sources are shown
    await expect(page.locator('[data-testid="response-sources"]')).toBeVisible();

    // Check that our document is listed as a source
    await expect(page.locator('[data-testid="source-document"]')).toContainText('test-document.pdf');

    // Step 7: Verify vector search API directly
    const searchResponse = await page.request.post('/api/v1/search/vector', {
      data: {
        query: 'electronics technical specifications',
        k: 5,
        score_threshold: 0.7
      }
    });

    expect(searchResponse.ok()).toBeTruthy();
    const searchData = await searchResponse.json();
    expect(searchData.success).toBe(true);
    expect(searchData.data.results.length).toBeGreaterThan(0);

    // Verify results contain our product
    const results = searchData.data.results;
    const hasOurProduct = results.some((result: any) =>
      result.product_name === 'Test Electronics Product'
    );
    expect(hasOurProduct).toBe(true);
  });

  test('System handles document processing errors gracefully', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Create a product for error testing
    await page.click('[data-testid="create-product-button"]');
    await page.fill('[data-testid="product-name-input"]', 'Error Test Product');
    await page.fill('[data-testid="product-category-input"]', 'Test');
    await page.click('[data-testid="create-product-submit"]');

    // Try to upload an invalid file (e.g., empty file or corrupted file)
    await page.click('[data-testid="upload-documents-action"]');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="file-upload-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(['tests/fixtures/corrupted-file.pdf']);

    await page.click('[data-testid="upload-submit-button"]');

    // Verify error handling
    await expect(page.locator('[data-testid="processing-status"]')).toHaveText('failed', { timeout: 30000 });

    // Error message should be displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

    // User should be able to retry or remove the failed document
    await expect(page.locator('[data-testid="retry-processing-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="remove-document-button"]')).toBeVisible();
  });

  test('Vector search performance meets requirements', async ({ page }) => {
    await page.goto('/dashboard/playground');

    // Measure search performance
    const startTime = Date.now();

    const response = await page.request.post('/api/v1/search/vector', {
      data: {
        query: 'performance test query for response time validation',
        k: 10,
        score_threshold: 0.5
      }
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Verify performance requirement: <200ms
    expect(responseTime).toBeLessThan(200);
    expect(response.ok()).toBeTruthy();

    const responseData = await response.json();
    expect(responseData.data.processing_time_ms).toBeLessThan(200);
  });

  test('Thai language content is processed correctly', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Create product with Thai name
    await page.click('[data-testid="create-product-button"]');
    await page.fill('[data-testid="product-name-input"]', 'ผลิตภัณฑ์ทดสอบ');
    await page.fill('[data-testid="product-description-input"]', 'คำอธิบายผลิตภัณฑ์สำหรับการทดสอบภาษาไทย');
    await page.selectOption('[data-testid="product-category-select"]', 'Electronics');
    await page.click('[data-testid="create-product-submit"]');

    // Verify Thai text is displayed correctly
    await expect(page.locator('[data-testid="product-list"]')).toContainText('ผลิตภัณฑ์ทดสอบ');

    // Test Thai search functionality
    const searchResponse = await page.request.post('/api/v1/search/vector', {
      data: {
        query: 'ผลิตภัณฑ์',
        k: 5,
        score_threshold: 0.6
      }
    });

    expect(searchResponse.ok()).toBeTruthy();
    const searchData = await searchResponse.json();
    expect(searchData.success).toBe(true);

    // Should handle Thai query without errors
    expect(searchData.data).toHaveProperty('results');
  });
});