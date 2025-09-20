import { test, expect } from '@playwright/test';

test.describe('Core Application Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the main dashboard', async ({ page }) => {
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');

    // Check for main page elements
    await expect(page).toHaveTitle(/Chatbot Starter/);

    // Verify the main dashboard components are present
    await expect(page.locator('h1')).toBeVisible();

    // Check for API test dashboard
    await expect(page.locator('text=API Test Dashboard')).toBeVisible();
  });

  test('should display API test results', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for test result indicators
    const testResults = page.locator('[data-testid*="test-result"], .test-result, .api-test');

    // Wait for at least one test result to appear
    await expect(testResults.first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle navigation correctly', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Test admin page navigation if available
    const adminLink = page.locator('a[href*="/admin"], text=Admin');
    if (await adminLink.isVisible()) {
      await adminLink.click();
      await page.waitForLoadState('networkidle');

      // Should show authentication requirement or admin panel
      await expect(page.locator('text=SuperAdmin, text=Sign In')).toBeVisible();
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify the page is still usable on mobile
    await expect(page.locator('h1')).toBeVisible();

    // Check that content doesn't overflow
    const body = page.locator('body');
    const boundingBox = await body.boundingBox();
    expect(boundingBox?.width).toBeLessThanOrEqual(375);
  });

  test('should load without accessibility violations', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Basic accessibility checks
    // Check for proper heading structure
    const h1Elements = page.locator('h1');
    await expect(h1Elements).toHaveCount(1); // Should have exactly one h1

    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      await expect(img).toHaveAttribute('alt');
    }

    // Check for proper form labels if any forms exist
    const inputs = page.locator('input[type="email"], input[type="password"], input[type="text"]');
    const inputCount = await inputs.count();
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const hasLabel = await input.locator('..').locator('label').count() > 0;
      const hasAriaLabel = await input.getAttribute('aria-label');
      const hasAriaLabelledby = await input.getAttribute('aria-labelledby');

      expect(hasLabel || hasAriaLabel || hasAriaLabelledby).toBeTruthy();
    }
  });
});