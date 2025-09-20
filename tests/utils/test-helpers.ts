import { Page, expect } from '@playwright/test';

/**
 * Test utilities for common testing patterns
 */

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for API test results to load on the dashboard
   */
  async waitForApiTestResults(timeout = 30000) {
    await this.page.waitForSelector(
      '[data-testid*="test-result"], .test-result, .api-test',
      { timeout }
    );
  }

  /**
   * Check if authentication is required for a page
   */
  async isAuthenticationRequired(): Promise<boolean> {
    const authIndicators = [
      'text=Sign In',
      'text=Please sign in',
      'text=Authentication required',
      'text=SuperAdmin Access'
    ];

    for (const indicator of authIndicators) {
      if (await this.page.locator(indicator).isVisible()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Navigate to admin and handle authentication redirect
   */
  async navigateToAdmin() {
    await this.page.goto('/admin');
    await this.page.waitForLoadState('networkidle');

    if (await this.isAuthenticationRequired()) {
      console.log('Authentication required for admin access');
      return false;
    }
    return true;
  }

  /**
   * Check if the current page shows an error state
   */
  async hasErrorState(): Promise<boolean> {
    const errorIndicators = [
      'text=Error',
      'text=404',
      'text=Not Found',
      'text=Something went wrong',
      '[role="alert"]'
    ];

    for (const indicator of errorIndicators) {
      if (await this.page.locator(indicator).isVisible()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Validate API response structure
   */
  async validateApiResponse(endpoint: string, expectedFields: string[]) {
    const response = await this.page.request.get(endpoint);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    for (const field of expectedFields) {
      expect(data).toHaveProperty(field);
    }

    return data;
  }

  /**
   * Test responsive design at different breakpoints
   */
  async testResponsiveBreakpoints(callback: () => Promise<void>) {
    const breakpoints = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1440, height: 900, name: 'desktop' }
    ];

    for (const breakpoint of breakpoints) {
      await this.page.setViewportSize({
        width: breakpoint.width,
        height: breakpoint.height
      });
      await this.page.reload();
      await this.page.waitForLoadState('networkidle');

      await callback();
    }
  }

  /**
   * Fill and submit authentication form if present
   */
  async attemptAuthentication(email: string, password: string) {
    const emailInput = this.page.locator('input[type="email"]');
    const passwordInput = this.page.locator('input[type="password"]');

    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill(email);
      await passwordInput.fill(password);

      const submitButton = this.page.locator('button[type="submit"], button:has-text("Sign In")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await this.page.waitForLoadState('networkidle');
        return true;
      }
    }

    return false;
  }

  /**
   * Check for accessibility issues
   */
  async checkBasicAccessibility() {
    // Check for proper heading structure
    const h1Count = await this.page.locator('h1').count();
    expect(h1Count).toBeLessThanOrEqual(1);

    // Check for alt text on images
    const images = this.page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const altText = await img.getAttribute('alt');
      expect(altText).toBeDefined();
    }

    // Check for form labels
    const inputs = this.page.locator('input[type="email"], input[type="password"], input[type="text"]');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const hasLabel = await input.locator('..').locator('label').count() > 0;
      const hasAriaLabel = await input.getAttribute('aria-label');
      const hasAriaLabelledby = await input.getAttribute('aria-labelledby');

      expect(hasLabel || hasAriaLabel || hasAriaLabelledby).toBeTruthy();
    }
  }

  /**
   * Wait for loading indicators to disappear
   */
  async waitForLoadingToComplete() {
    // Wait for common loading indicators to disappear
    const loadingSelectors = [
      'text=Loading...',
      '[data-testid="loading"]',
      '.loading',
      '.spinner',
      '[role="progressbar"]'
    ];

    for (const selector of loadingSelectors) {
      try {
        await this.page.waitForSelector(selector, { state: 'hidden', timeout: 5000 });
      } catch {
        // Ignore if selector not found
      }
    }
  }

  /**
   * Take screenshot with standardized settings
   */
  async takeStandardScreenshot(name: string, options: { fullPage?: boolean } = {}) {
    await this.waitForLoadingToComplete();
    await this.page.waitForTimeout(1000); // Allow for animations to complete

    return await this.page.screenshot({
      path: `test-results/screenshots/${name}`,
      fullPage: options.fullPage || false,
      animations: 'disabled'
    });
  }

  /**
   * Test form validation
   */
  async testFormValidation(formSelector: string, invalidData: Record<string, string>) {
    for (const [field, value] of Object.entries(invalidData)) {
      const input = this.page.locator(`${formSelector} input[name="${field}"], ${formSelector} input[type="${field}"]`);

      if (await input.isVisible()) {
        await input.fill(value);
        await input.blur();

        // Look for validation error
        const errorMessage = this.page.locator(`${formSelector} [role="alert"], ${formSelector} .error, ${formSelector} .invalid`);
        await expect(errorMessage).toBeVisible({ timeout: 2000 });
      }
    }
  }

  /**
   * Check performance metrics
   */
  async checkPerformanceMetrics() {
    const performanceEntry = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime || 0
      };
    });

    // Basic performance assertions
    expect(performanceEntry.domContentLoaded).toBeLessThan(3000); // 3 seconds
    expect(performanceEntry.loadComplete).toBeLessThan(5000); // 5 seconds

    return performanceEntry;
  }
}

/**
 * Mock API responses for testing
 */
export class ApiMocker {
  constructor(private page: Page) {}

  /**
   * Mock a successful API response
   */
  async mockApiSuccess(endpoint: string, responseData: any) {
    await this.page.route(endpoint, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseData)
      });
    });
  }

  /**
   * Mock an API error
   */
  async mockApiError(endpoint: string, statusCode: number, errorMessage: string) {
    await this.page.route(endpoint, route => {
      route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({ error: errorMessage })
      });
    });
  }

  /**
   * Mock slow API response
   */
  async mockSlowApi(endpoint: string, delay: number, responseData: any) {
    await this.page.route(endpoint, async route => {
      await new Promise(resolve => setTimeout(resolve, delay));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseData)
      });
    });
  }
}

/**
 * Database test utilities
 */
export class DatabaseTestUtils {
  constructor(private page: Page) {}

  /**
   * Test database connectivity through API
   */
  async testDatabaseConnection() {
    const response = await this.page.request.get('/api/test-neon');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBeTruthy();
    expect(data.service).toBe('neon-postgresql');

    return data;
  }

  /**
   * Validate database health
   */
  async validateDatabaseHealth() {
    const dbTest = await this.testDatabaseConnection();

    // Check for required database features
    if (dbTest.data && dbTest.data.features) {
      expect(dbTest.data.features).toContain('vector');
      expect(dbTest.data.features).toContain('postgresql');
    }

    return dbTest;
  }
}