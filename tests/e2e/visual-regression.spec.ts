import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('should match main dashboard screenshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for any loading indicators to disappear
    await page.waitForTimeout(2000);

    // Take screenshot of the main dashboard
    await expect(page).toHaveScreenshot('main-dashboard.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match admin page screenshot', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Wait for any animations to complete
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('admin-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match authentication page screenshot', async ({ page }) => {
    await page.goto('/handler/sign-in');
    await page.waitForLoadState('networkidle');

    // Wait for authentication form to load
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('auth-sign-in.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match mobile dashboard layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('mobile-dashboard.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match tablet layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('tablet-dashboard.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should handle loading states visually', async ({ page }) => {
    await page.goto('/');

    // Take screenshot during loading if possible
    await expect(page).toHaveScreenshot('loading-state.png', {
      animations: 'disabled',
      timeout: 5000,
    });

    await page.waitForLoadState('networkidle');
  });

  test('should test dark mode if available', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for dark mode toggle
    const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"], button:has-text("dark"), button:has-text("theme")');

    if (await darkModeToggle.isVisible()) {
      await darkModeToggle.click();
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('dark-mode-dashboard.png', {
        fullPage: true,
        animations: 'disabled',
      });
    }
  });

  test('should test component hover states', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find interactive elements and test hover states
    const buttons = page.locator('button, a[href]');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      const firstButton = buttons.first();
      await firstButton.hover();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('hover-states.png', {
        animations: 'disabled',
      });
    }
  });

  test('should test error state visuals', async ({ page }) => {
    // Navigate to a non-existent page to trigger error
    await page.goto('/non-existent-page');
    await page.waitForLoadState('networkidle');

    // Should show 404 or error page
    await expect(page).toHaveScreenshot('error-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should test form validation visuals', async ({ page }) => {
    await page.goto('/handler/sign-in');
    await page.waitForLoadState('networkidle');

    // Try to find form inputs and trigger validation
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill('invalid-email');
      await emailInput.blur();

      const submitButton = page.locator('button[type="submit"], button:has-text("Sign In")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        await expect(page).toHaveScreenshot('form-validation.png', {
          animations: 'disabled',
        });
      }
    }
  });

  test('should test responsive breakpoints', async ({ page }) => {
    const breakpoints = [
      { width: 320, height: 568, name: 'mobile-small' },
      { width: 375, height: 667, name: 'mobile-medium' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1024, height: 768, name: 'desktop-small' },
      { width: 1440, height: 900, name: 'desktop-large' },
    ];

    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot(`responsive-${breakpoint.name}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    }
  });
});