import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility Tests', () => {
  test('Component accessibility compliance - WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/components/demo/all')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Button accessibility', async ({ page }) => {
    await page.goto('/components/demo/button')

    // Scan for accessibility violations
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid^="button-"]')
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="button-default"]:focus')).toBeVisible()

    // Test Enter key activation
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-testid="button-click-count"]')).toContainText('1')

    // Test Space key activation
    await page.keyboard.press('Space')
    await expect(page.locator('[data-testid="button-click-count"]')).toContainText('2')

    // Test disabled button is not focusable
    await page.locator('[data-testid="button-disabled"]').focus().catch(() => {
      // Expected to fail - disabled buttons should not be focusable
    })
    await expect(page.locator('[data-testid="button-disabled"]:focus')).not.toBeVisible()
  })

  test('Form accessibility', async ({ page }) => {
    await page.goto('/components/demo/form')

    // Scan for accessibility violations
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('form')
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    // Test label associations
    const inputs = page.locator('input')
    const count = await inputs.count()

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i)
      const id = await input.getAttribute('id')
      const ariaLabel = await input.getAttribute('aria-label')
      const ariaLabelledby = await input.getAttribute('aria-labelledby')

      // Each input should have either an id with corresponding label, aria-label, or aria-labelledby
      if (id) {
        const label = page.locator(`label[for="${id}"]`)
        await expect(label).toBeVisible()
      } else {
        expect(ariaLabel || ariaLabelledby).toBeTruthy()
      }
    }

    // Test required field indicators
    const requiredInputs = page.locator('input[required]')
    const requiredCount = await requiredInputs.count()

    for (let i = 0; i < requiredCount; i++) {
      const input = requiredInputs.nth(i)
      const ariaRequired = await input.getAttribute('aria-required')
      expect(ariaRequired).toBe('true')
    }

    // Test error message associations
    const errorInputs = page.locator('input[aria-describedby]')
    const errorCount = await errorInputs.count()

    for (let i = 0; i < errorCount; i++) {
      const input = errorInputs.nth(i)
      const describedBy = await input.getAttribute('aria-describedby')
      if (describedBy) {
        const errorMessage = page.locator(`#${describedBy}`)
        await expect(errorMessage).toBeVisible()
      }
    }
  })

  test('Navigation accessibility', async ({ page }) => {
    await page.goto('/components/demo/navigation')

    // Scan for accessibility violations
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('nav')
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    // Test keyboard navigation
    await page.keyboard.press('Tab')
    const firstFocusable = page.locator('nav a:first-child, nav button:first-child')
    await expect(firstFocusable).toBeFocused()

    // Test arrow key navigation for menu items
    await page.keyboard.press('ArrowDown')
    const nextItem = page.locator('nav [role="menuitem"]:nth-child(2)')
    if (await nextItem.count() > 0) {
      await expect(nextItem).toBeFocused()
    }

    // Test Escape key closes menus
    await page.keyboard.press('Escape')
    const openMenu = page.locator('[aria-expanded="true"]')
    if (await openMenu.count() > 0) {
      await expect(openMenu).toHaveAttribute('aria-expanded', 'false')
    }

    // Test ARIA landmarks
    const navigation = page.locator('nav')
    const ariaLabel = await navigation.getAttribute('aria-label')
    const ariaLabelledby = await navigation.getAttribute('aria-labelledby')
    expect(ariaLabel || ariaLabelledby).toBeTruthy()
  })

  test('Modal accessibility', async ({ page }) => {
    await page.goto('/components/demo/modal')

    // Open modal
    await page.locator('[data-testid="open-modal"]').click()

    // Scan for accessibility violations
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    // Test modal has proper ARIA attributes
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    await expect(modal).toHaveAttribute('aria-modal', 'true')

    const ariaLabelledby = await modal.getAttribute('aria-labelledby')
    const ariaLabel = await modal.getAttribute('aria-label')
    expect(ariaLabelledby || ariaLabel).toBeTruthy()

    // Test focus trap
    await page.keyboard.press('Tab')
    const firstFocusable = modal.locator('button, input, select, textarea, a[href]').first()
    await expect(firstFocusable).toBeFocused()

    // Test Escape key closes modal
    await page.keyboard.press('Escape')
    await expect(modal).not.toBeVisible()

    // Test focus returns to trigger
    await expect(page.locator('[data-testid="open-modal"]')).toBeFocused()
  })

  test('Table accessibility', async ({ page }) => {
    await page.goto('/components/demo/table')

    // Scan for accessibility violations
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('table')
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    // Test table has proper structure
    const table = page.locator('table')
    await expect(table).toBeVisible()

    // Test table has caption or aria-label
    const caption = table.locator('caption')
    const ariaLabel = await table.getAttribute('aria-label')
    const ariaLabelledby = await table.getAttribute('aria-labelledby')

    const hasCaption = await caption.count() > 0
    expect(hasCaption || ariaLabel || ariaLabelledby).toBeTruthy()

    // Test headers are properly associated
    const headers = table.locator('th')
    const headerCount = await headers.count()

    for (let i = 0; i < headerCount; i++) {
      const header = headers.nth(i)
      const scope = await header.getAttribute('scope')
      expect(scope).toBeTruthy()
    }

    // Test sortable columns have proper ARIA attributes
    const sortableHeaders = table.locator('th[aria-sort]')
    const sortableCount = await sortableHeaders.count()

    for (let i = 0; i < sortableCount; i++) {
      const header = sortableHeaders.nth(i)
      const ariaSort = await header.getAttribute('aria-sort')
      expect(['ascending', 'descending', 'none']).toContain(ariaSort)
    }
  })

  test('Alert accessibility', async ({ page }) => {
    await page.goto('/components/demo/alert')

    // Scan for accessibility violations
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[role="alert"], [role="alertdialog"]')
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    // Test alert announcements
    const alerts = page.locator('[role="alert"]')
    const alertCount = await alerts.count()

    for (let i = 0; i < alertCount; i++) {
      const alert = alerts.nth(i)
      await expect(alert).toBeVisible()

      // Alert should have accessible text
      const text = await alert.textContent()
      expect(text?.trim()).toBeTruthy()
    }

    // Test dismissible alerts
    const dismissibleAlerts = page.locator('[data-testid^="alert-"] button')
    const dismissibleCount = await dismissibleAlerts.count()

    for (let i = 0; i < dismissibleCount; i++) {
      const button = dismissibleAlerts.nth(i)
      const ariaLabel = await button.getAttribute('aria-label')
      expect(ariaLabel?.toLowerCase()).toContain('dismiss')
    }
  })

  test('Color contrast compliance', async ({ page }) => {
    await page.goto('/components/demo/colors')

    // Scan for color contrast violations
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('[data-testid^="color-"]')
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    // Test specific color combinations
    const colorElements = page.locator('[data-testid^="color-"]')
    const colorCount = await colorElements.count()

    for (let i = 0; i < colorCount; i++) {
      const element = colorElements.nth(i)

      // Use axe to check contrast for this specific element
      const elementResults = await new AxeBuilder({ page })
        .include(await element.getAttribute('data-testid') || 'body')
        .withTags(['wcag2aa'])
        .withRules(['color-contrast'])
        .analyze()

      expect(elementResults.violations).toEqual([])
    }
  })

  test('Screen reader compatibility', async ({ page }) => {
    await page.goto('/components/demo/screen-reader')

    // Test screen reader only content
    const srOnly = page.locator('.sr-only')
    const srOnlyCount = await srOnly.count()

    for (let i = 0; i < srOnlyCount; i++) {
      const element = srOnly.nth(i)

      // Element should not be visible but should exist in DOM
      await expect(element).not.toBeVisible()
      await expect(element).toBeInViewport({ ratio: 0 }) // Should be in DOM
    }

    // Test ARIA live regions
    const liveRegions = page.locator('[aria-live]')
    const liveCount = await liveRegions.count()

    for (let i = 0; i < liveCount; i++) {
      const region = liveRegions.nth(i)
      const ariaLive = await region.getAttribute('aria-live')
      expect(['polite', 'assertive', 'off']).toContain(ariaLive)
    }

    // Test landmark roles
    const landmarks = page.locator('[role="main"], [role="banner"], [role="navigation"], [role="contentinfo"], [role="complementary"]')
    const landmarkCount = await landmarks.count()

    expect(landmarkCount).toBeGreaterThan(0) // Page should have at least one landmark
  })

  test('Keyboard navigation comprehensive', async ({ page }) => {
    await page.goto('/components/demo/keyboard-nav')

    // Test tab order
    const focusableElements = page.locator('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])')
    const focusableCount = await focusableElements.count()

    let currentIndex = 0

    // Tab through all focusable elements
    for (let i = 0; i < focusableCount; i++) {
      await page.keyboard.press('Tab')
      const focused = page.locator(':focus')
      await expect(focused).toBeVisible()
      currentIndex++
    }

    // Shift+Tab should go backwards
    await page.keyboard.press('Shift+Tab')
    currentIndex--

    if (currentIndex >= 0) {
      const expectedFocused = focusableElements.nth(currentIndex)
      await expect(expectedFocused).toBeFocused()
    }

    // Test Home/End keys if applicable
    const hasHome = await page.locator('[data-supports-home-end="true"]').count() > 0
    if (hasHome) {
      await page.keyboard.press('Home')
      const firstElement = focusableElements.first()
      await expect(firstElement).toBeFocused()

      await page.keyboard.press('End')
      const lastElement = focusableElements.last()
      await expect(lastElement).toBeFocused()
    }
  })

  test('Mobile accessibility', async ({ page, isMobile }) => {
    if (!isMobile) {
      // Set mobile viewport for this test
      await page.setViewportSize({ width: 375, height: 667 })
    }

    await page.goto('/components/demo/mobile')

    // Scan for accessibility violations on mobile
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    // Test touch targets are at least 44px
    const touchTargets = page.locator('button, a, input[type="checkbox"], input[type="radio"], select')
    const targetCount = await touchTargets.count()

    for (let i = 0; i < targetCount; i++) {
      const target = touchTargets.nth(i)
      const box = await target.boundingBox()

      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
    }

    // Test mobile-specific ARIA attributes
    const mobileElements = page.locator('[data-mobile="true"]')
    const mobileCount = await mobileElements.count()

    for (let i = 0; i < mobileCount; i++) {
      const element = mobileElements.nth(i)

      // Check for mobile-specific accessibility features
      const role = await element.getAttribute('role')
      const ariaLabel = await element.getAttribute('aria-label')

      if (role === 'button' || role === 'link') {
        expect(ariaLabel).toBeTruthy()
      }
    }
  })
})