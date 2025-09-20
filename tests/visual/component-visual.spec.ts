import { test, expect } from '@playwright/test'

test.describe('Component Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport for visual tests
    await page.setViewportSize({ width: 1200, height: 800 })
  })

  test('Button component variants', async ({ page }) => {
    await page.goto('/components/demo/button')

    // Test default button
    await expect(page.locator('[data-testid="button-default"]')).toHaveScreenshot('button-default.png')

    // Test all button variants
    const variants = ['secondary', 'destructive', 'outline', 'ghost', 'link']
    for (const variant of variants) {
      await expect(page.locator(`[data-testid="button-${variant}"]`)).toHaveScreenshot(`button-${variant}.png`)
    }

    // Test different sizes
    const sizes = ['sm', 'md', 'lg', 'xl']
    for (const size of sizes) {
      await expect(page.locator(`[data-testid="button-size-${size}"]`)).toHaveScreenshot(`button-size-${size}.png`)
    }

    // Test loading state
    await expect(page.locator('[data-testid="button-loading"]')).toHaveScreenshot('button-loading.png')

    // Test disabled state
    await expect(page.locator('[data-testid="button-disabled"]')).toHaveScreenshot('button-disabled.png')
  })

  test('Card component variants', async ({ page }) => {
    await page.goto('/components/demo/card')

    // Test different card variants
    await expect(page.locator('[data-testid="card-default"]')).toHaveScreenshot('card-default.png')
    await expect(page.locator('[data-testid="card-elevated"]')).toHaveScreenshot('card-elevated.png')
    await expect(page.locator('[data-testid="card-interactive"]')).toHaveScreenshot('card-interactive.png')
    await expect(page.locator('[data-testid="card-ghost"]')).toHaveScreenshot('card-ghost.png')

    // Test hover states
    await page.locator('[data-testid="card-interactive"]').hover()
    await expect(page.locator('[data-testid="card-interactive"]')).toHaveScreenshot('card-interactive-hover.png')
  })

  test('Input component variants', async ({ page }) => {
    await page.goto('/components/demo/input')

    // Test different input states
    await expect(page.locator('[data-testid="input-default"]')).toHaveScreenshot('input-default.png')
    await expect(page.locator('[data-testid="input-error"]')).toHaveScreenshot('input-error.png')
    await expect(page.locator('[data-testid="input-success"]')).toHaveScreenshot('input-success.png')
    await expect(page.locator('[data-testid="input-disabled"]')).toHaveScreenshot('input-disabled.png')

    // Test focus state
    await page.locator('[data-testid="input-default"]').focus()
    await expect(page.locator('[data-testid="input-default"]')).toHaveScreenshot('input-focused.png')
  })

  test('Typography components', async ({ page }) => {
    await page.goto('/components/demo/typography')

    // Test headings
    await expect(page.locator('[data-testid="typography-h1"]')).toHaveScreenshot('typography-h1.png')
    await expect(page.locator('[data-testid="typography-h2"]')).toHaveScreenshot('typography-h2.png')
    await expect(page.locator('[data-testid="typography-h3"]')).toHaveScreenshot('typography-h3.png')
    await expect(page.locator('[data-testid="typography-h4"]')).toHaveScreenshot('typography-h4.png')

    // Test body text
    await expect(page.locator('[data-testid="typography-paragraph"]')).toHaveScreenshot('typography-paragraph.png')
    await expect(page.locator('[data-testid="typography-lead"]')).toHaveScreenshot('typography-lead.png')
    await expect(page.locator('[data-testid="typography-muted"]')).toHaveScreenshot('typography-muted.png')

    // Test special elements
    await expect(page.locator('[data-testid="typography-blockquote"]')).toHaveScreenshot('typography-blockquote.png')
    await expect(page.locator('[data-testid="typography-code"]')).toHaveScreenshot('typography-code.png')
  })

  test('Badge component variants', async ({ page }) => {
    await page.goto('/components/demo/badge')

    const variants = ['default', 'secondary', 'destructive', 'outline', 'success', 'warning', 'info']
    for (const variant of variants) {
      await expect(page.locator(`[data-testid="badge-${variant}"]`)).toHaveScreenshot(`badge-${variant}.png`)
    }
  })

  test('Avatar component variants', async ({ page }) => {
    await page.goto('/components/demo/avatar')

    const sizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl']
    for (const size of sizes) {
      await expect(page.locator(`[data-testid="avatar-${size}"]`)).toHaveScreenshot(`avatar-${size}.png`)
    }

    // Test avatar with image
    await expect(page.locator('[data-testid="avatar-with-image"]')).toHaveScreenshot('avatar-with-image.png')

    // Test avatar fallback
    await expect(page.locator('[data-testid="avatar-fallback"]')).toHaveScreenshot('avatar-fallback.png')
  })

  test('Alert component variants', async ({ page }) => {
    await page.goto('/components/demo/alert')

    const variants = ['default', 'destructive', 'success', 'warning', 'info']
    for (const variant of variants) {
      await expect(page.locator(`[data-testid="alert-${variant}"]`)).toHaveScreenshot(`alert-${variant}.png`)
    }
  })

  test('Progress component variants', async ({ page }) => {
    await page.goto('/components/demo/progress')

    const sizes = ['xs', 'sm', 'md', 'lg']
    for (const size of sizes) {
      await expect(page.locator(`[data-testid="progress-${size}"]`)).toHaveScreenshot(`progress-${size}.png`)
    }

    // Test different progress values
    const values = [0, 25, 50, 75, 100]
    for (const value of values) {
      await expect(page.locator(`[data-testid="progress-${value}"]`)).toHaveScreenshot(`progress-value-${value}.png`)
    }
  })

  test('Loading spinner variants', async ({ page }) => {
    await page.goto('/components/demo/spinner')

    const sizes = ['xs', 'sm', 'md', 'lg', 'xl']
    for (const size of sizes) {
      await expect(page.locator(`[data-testid="spinner-${size}"]`)).toHaveScreenshot(`spinner-${size}.png`)
    }
  })

  test('Skeleton component variants', async ({ page }) => {
    await page.goto('/components/demo/skeleton')

    const variants = ['default', 'circular', 'text', 'title', 'avatar']
    for (const variant of variants) {
      await expect(page.locator(`[data-testid="skeleton-${variant}"]`)).toHaveScreenshot(`skeleton-${variant}.png`)
    }
  })
})

test.describe('Responsive Visual Tests', () => {
  const viewports = [
    { width: 375, height: 667, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1024, height: 768, name: 'desktop' },
    { width: 1440, height: 900, name: 'wide' }
  ]

  viewports.forEach(({ width, height, name }) => {
    test(`Responsive layout - ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/components/demo/responsive')

      await expect(page).toHaveScreenshot(`responsive-layout-${name}.png`)
    })

    test(`Navigation - ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/components/demo/navigation')

      await expect(page).toHaveScreenshot(`navigation-${name}.png`)
    })

    test(`Grid layout - ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/components/demo/grid')

      await expect(page).toHaveScreenshot(`grid-layout-${name}.png`)
    })
  })
})

test.describe('Theme Visual Tests', () => {
  test('Light theme components', async ({ page }) => {
    await page.goto('/components/demo/theme')

    // Ensure light theme is active
    await page.locator('[data-testid="theme-toggle"]').click()
    await page.waitForTimeout(200) // Wait for theme transition

    await expect(page).toHaveScreenshot('theme-light-full.png')

    // Test individual components in light theme
    await expect(page.locator('[data-testid="theme-buttons"]')).toHaveScreenshot('theme-light-buttons.png')
    await expect(page.locator('[data-testid="theme-cards"]')).toHaveScreenshot('theme-light-cards.png')
    await expect(page.locator('[data-testid="theme-forms"]')).toHaveScreenshot('theme-light-forms.png')
  })

  test('Dark theme components', async ({ page }) => {
    await page.goto('/components/demo/theme')

    // Ensure dark theme is active
    await page.locator('[data-testid="theme-toggle"]').click()
    await page.waitForTimeout(200) // Wait for theme transition

    await expect(page).toHaveScreenshot('theme-dark-full.png')

    // Test individual components in dark theme
    await expect(page.locator('[data-testid="theme-buttons"]')).toHaveScreenshot('theme-dark-buttons.png')
    await expect(page.locator('[data-testid="theme-cards"]')).toHaveScreenshot('theme-dark-cards.png')
    await expect(page.locator('[data-testid="theme-forms"]')).toHaveScreenshot('theme-dark-forms.png')
  })
})

test.describe('Thai/English Typography Tests', () => {
  test('Thai text rendering', async ({ page }) => {
    await page.goto('/components/demo/typography-thai')

    // Test Thai headings
    await expect(page.locator('[data-testid="thai-h1"]')).toHaveScreenshot('thai-h1.png')
    await expect(page.locator('[data-testid="thai-h2"]')).toHaveScreenshot('thai-h2.png')
    await expect(page.locator('[data-testid="thai-h3"]')).toHaveScreenshot('thai-h3.png')

    // Test Thai paragraph
    await expect(page.locator('[data-testid="thai-paragraph"]')).toHaveScreenshot('thai-paragraph.png')

    // Test mixed Thai/English content
    await expect(page.locator('[data-testid="mixed-content"]')).toHaveScreenshot('mixed-content.png')
  })

  test('English text rendering', async ({ page }) => {
    await page.goto('/components/demo/typography-english')

    // Test English headings
    await expect(page.locator('[data-testid="english-h1"]')).toHaveScreenshot('english-h1.png')
    await expect(page.locator('[data-testid="english-h2"]')).toHaveScreenshot('english-h2.png')
    await expect(page.locator('[data-testid="english-h3"]')).toHaveScreenshot('english-h3.png')

    // Test English paragraph
    await expect(page.locator('[data-testid="english-paragraph"]')).toHaveScreenshot('english-paragraph.png')
  })

  test('Auto-detect typography', async ({ page }) => {
    await page.goto('/components/demo/typography-auto')

    // Test auto-detection of language
    await expect(page.locator('[data-testid="auto-thai"]')).toHaveScreenshot('auto-thai.png')
    await expect(page.locator('[data-testid="auto-english"]')).toHaveScreenshot('auto-english.png')
  })
})

test.describe('Animation Visual Tests', () => {
  test('Animation presets', async ({ page }) => {
    await page.goto('/components/demo/animations')

    // Test fade animations
    await page.locator('[data-testid="trigger-fade-in"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('[data-testid="fade-in-element"]')).toHaveScreenshot('animation-fade-in.png')

    // Test slide animations
    await page.locator('[data-testid="trigger-slide-in"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('[data-testid="slide-in-element"]')).toHaveScreenshot('animation-slide-in.png')

    // Test scale animations
    await page.locator('[data-testid="trigger-scale-in"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('[data-testid="scale-in-element"]')).toHaveScreenshot('animation-scale-in.png')

    // Test bounce animation
    await page.locator('[data-testid="trigger-bounce-in"]').click()
    await page.waitForTimeout(600)
    await expect(page.locator('[data-testid="bounce-in-element"]')).toHaveScreenshot('animation-bounce-in.png')
  })

  test('Loading animations', async ({ page }) => {
    await page.goto('/components/demo/loading')

    // Test shimmer effect
    await expect(page.locator('[data-testid="shimmer-element"]')).toHaveScreenshot('animation-shimmer.png')

    // Test pulse effect
    await expect(page.locator('[data-testid="pulse-element"]')).toHaveScreenshot('animation-pulse.png')

    // Test skeleton loading
    await expect(page.locator('[data-testid="skeleton-loading"]')).toHaveScreenshot('animation-skeleton.png')
  })
})

test.describe('Accessibility Visual Tests', () => {
  test('Focus indicators', async ({ page }) => {
    await page.goto('/components/demo/accessibility')

    // Test button focus
    await page.locator('[data-testid="focus-button"]').focus()
    await expect(page.locator('[data-testid="focus-button"]')).toHaveScreenshot('focus-button.png')

    // Test input focus
    await page.locator('[data-testid="focus-input"]').focus()
    await expect(page.locator('[data-testid="focus-input"]')).toHaveScreenshot('focus-input.png')

    // Test link focus
    await page.locator('[data-testid="focus-link"]').focus()
    await expect(page.locator('[data-testid="focus-link"]')).toHaveScreenshot('focus-link.png')
  })

  test('High contrast mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' })
    await page.goto('/components/demo/contrast')

    await expect(page).toHaveScreenshot('high-contrast-mode.png')
  })

  test('Reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/components/demo/animations')

    // Verify animations are disabled
    await expect(page).toHaveScreenshot('reduced-motion-page.png')
  })
})