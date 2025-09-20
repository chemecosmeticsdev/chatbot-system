import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display authentication interface correctly', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Should show the SuperAdmin access page
    await expect(page.locator('text=SuperAdmin Access')).toBeVisible();
    await expect(page.locator('text=Please sign in')).toBeVisible();

    // Should have a sign-in link/button
    const signInButton = page.locator('a[href*="sign-in"], button:has-text("Sign In")');
    await expect(signInButton).toBeVisible();
  });

  test('should navigate to authentication handler correctly', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Click the sign-in button
    const signInButton = page.locator('a[href*="sign-in"], text=Sign In').first();
    await signInButton.click();

    await page.waitForLoadState('networkidle');

    // Should navigate to the Stack Auth handler
    expect(page.url()).toContain('/handler/sign-in');

    // Should display authentication options
    const hasGitHubAuth = await page.locator('text=GitHub, text=Sign in with GitHub').isVisible();
    const hasGoogleAuth = await page.locator('text=Google, text=Sign in with Google').isVisible();
    const hasEmailAuth = await page.locator('input[type="email"]').isVisible();

    // Should have at least one authentication method available
    expect(hasGitHubAuth || hasGoogleAuth || hasEmailAuth).toBeTruthy();
  });

  test('should handle authentication errors gracefully', async ({ page }) => {
    await page.goto('/handler/sign-in');
    await page.waitForLoadState('networkidle');

    // If there's an email form, test invalid input
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill('invalid-email');

      const submitButton = page.locator('button:has-text("Sign In"), button[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Should show some form of validation error
        await expect(page.locator('text=invalid, text=error, [role="alert"]')).toBeVisible();
      }
    }
  });

  test('should provide fallback when Stack Auth is not configured', async ({ page }) => {
    // Test the fallback scenario by going to handler directly
    await page.goto('/handler/sign-up');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Should either show the sign-up form or a configuration error
    const hasSignUpForm = await page.locator('text=Create, text=Sign Up, input[type="email"]').isVisible();
    const hasConfigError = await page.locator('text=Authentication Service Error, text=not properly configured').isVisible();

    // Should have either a working form or a helpful error message
    expect(hasSignUpForm || hasConfigError).toBeTruthy();
  });

  test('should maintain authentication state across navigation', async ({ page }) => {
    await page.goto('/admin');

    // Navigate away and back
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Should still show the authentication requirement
    await expect(page.locator('text=SuperAdmin Access, text=Sign In')).toBeVisible();
  });

  test('should handle different device sizes for auth interface', async ({ page }) => {
    // Test on mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/handler/sign-in');
    await page.waitForLoadState('networkidle');

    // Auth interface should be mobile-friendly
    const authContainer = page.locator('form, [role="form"], .auth-container').first();
    if (await authContainer.isVisible()) {
      const boundingBox = await authContainer.boundingBox();
      expect(boundingBox?.width).toBeLessThanOrEqual(375);
    }

    // Test on tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be usable on tablet
    await expect(page.locator('text=Sign in, text=authentication')).toBeVisible();
  });
});