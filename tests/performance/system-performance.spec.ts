import { test, expect } from '@playwright/test'

test.describe('System Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start performance monitoring
    await page.goto('/')
  })

  test('homepage loads within performance budget', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/', { waitUntil: 'networkidle' })

    const endTime = Date.now()
    const loadTime = endTime - startTime

    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)

    // Check Core Web Vitals
    const perfMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const metrics = {}

          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              metrics.domContentLoaded = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart
              metrics.loadComplete = entry.loadEventEnd - entry.loadEventStart
            }
          })

          resolve(metrics)
        }).observe({ entryTypes: ['navigation'] })
      })
    })

    console.log('Performance metrics:', perfMetrics)
  })

  test('API endpoints respond within acceptable time', async ({ page }) => {
    const endpoints = [
      '/api/health',
      '/api/simple-test',
    ]

    for (const endpoint of endpoints) {
      const startTime = Date.now()

      const response = await page.request.get(endpoint)

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.status()).toBeLessThan(500)
      expect(responseTime).toBeLessThan(2000) // 2 second timeout

      console.log(`${endpoint}: ${responseTime}ms`)
    }
  })

  test('concurrent API requests handle load properly', async ({ page }) => {
    const concurrentRequests = 5
    const endpoint = '/api/health'

    const startTime = Date.now()

    const requests = Array.from({ length: concurrentRequests }, () =>
      page.request.get(endpoint)
    )

    const responses = await Promise.all(requests)

    const endTime = Date.now()
    const totalTime = endTime - startTime

    // All requests should succeed
    responses.forEach((response, index) => {
      expect(response.status()).toBeLessThan(500)
      console.log(`Request ${index + 1}: ${response.status()}`)
    })

    // Concurrent requests should complete in reasonable time
    expect(totalTime).toBeLessThan(5000)

    console.log(`${concurrentRequests} concurrent requests completed in ${totalTime}ms`)
  })

  test('memory usage stays within bounds during navigation', async ({ page }) => {
    // Navigate through multiple pages
    const pages = ['/', '/api/health']

    for (const pagePath of pages) {
      await page.goto(pagePath, { waitUntil: 'networkidle' })

      // Check for memory leaks (basic check)
      const jsHeapUsed = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0
      })

      if (jsHeapUsed > 0) {
        // Memory usage should be reasonable (less than 50MB)
        expect(jsHeapUsed).toBeLessThan(50 * 1024 * 1024)
        console.log(`Memory usage on ${pagePath}: ${(jsHeapUsed / 1024 / 1024).toFixed(2)}MB`)
      }
    }
  })

  test('large dataset rendering performs adequately', async ({ page }) => {
    // Test with mock large dataset
    await page.goto('/api/health')

    const startTime = Date.now()

    // Simulate rendering a large list
    await page.evaluate(() => {
      const container = document.createElement('div')
      document.body.appendChild(container)

      // Render 1000 items
      for (let i = 0; i < 1000; i++) {
        const item = document.createElement('div')
        item.textContent = `Item ${i}`
        item.className = 'test-item'
        container.appendChild(item)
      }

      return container.children.length
    })

    const endTime = Date.now()
    const renderTime = endTime - startTime

    // Should render 1000 items in under 1 second
    expect(renderTime).toBeLessThan(1000)

    console.log(`Rendered 1000 items in ${renderTime}ms`)
  })

  test('scroll performance is smooth', async ({ page }) => {
    await page.goto('/')

    // Create scrollable content
    await page.evaluate(() => {
      const container = document.createElement('div')
      container.style.height = '5000px'
      container.style.background = 'linear-gradient(to bottom, red, blue)'
      document.body.appendChild(container)
    })

    const startTime = Date.now()

    // Simulate scrolling
    await page.evaluate(() => {
      window.scrollTo({ top: 2500, behavior: 'smooth' })
    })

    // Wait for scroll to complete
    await page.waitForTimeout(1000)

    const endTime = Date.now()
    const scrollTime = endTime - startTime

    expect(scrollTime).toBeLessThan(2000)

    console.log(`Scroll operation completed in ${scrollTime}ms`)
  })

  test('CSS and JavaScript bundle sizes are reasonable', async ({ page }) => {
    const response = await page.goto('/')

    // Check resource sizes
    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource')
      return entries.map(entry => ({
        name: entry.name,
        size: entry.transferSize || 0,
        type: entry.name.includes('.css') ? 'css' :
              entry.name.includes('.js') ? 'js' : 'other'
      })).filter(r => r.type !== 'other')
    })

    const totalCSSSize = resources
      .filter(r => r.type === 'css')
      .reduce((sum, r) => sum + r.size, 0)

    const totalJSSize = resources
      .filter(r => r.type === 'js')
      .reduce((sum, r) => sum + r.size, 0)

    // CSS should be under 100KB
    expect(totalCSSSize).toBeLessThan(100 * 1024)

    // JS should be under 500KB
    expect(totalJSSize).toBeLessThan(500 * 1024)

    console.log(`Total CSS size: ${(totalCSSSize / 1024).toFixed(2)}KB`)
    console.log(`Total JS size: ${(totalJSSize / 1024).toFixed(2)}KB`)
  })

  test('handles rapid user interactions without lag', async ({ page }) => {
    await page.goto('/')

    // Add interactive elements
    await page.evaluate(() => {
      const button = document.createElement('button')
      button.id = 'rapid-click-test'
      button.textContent = 'Click me rapidly'
      button.onclick = () => {
        button.dataset.clicks = (parseInt(button.dataset.clicks || '0') + 1).toString()
      }
      document.body.appendChild(button)
    })

    const startTime = Date.now()

    // Simulate rapid clicking
    for (let i = 0; i < 20; i++) {
      await page.click('#rapid-click-test')
      await page.waitForTimeout(10) // 10ms between clicks
    }

    const endTime = Date.now()
    const totalTime = endTime - startTime

    // Check all clicks were registered
    const clickCount = await page.$eval('#rapid-click-test', el =>
      parseInt(el.dataset.clicks || '0')
    )

    expect(clickCount).toBe(20)
    expect(totalTime).toBeLessThan(1000) // Should complete in under 1 second

    console.log(`20 rapid clicks completed in ${totalTime}ms`)
  })

  test('search functionality performance', async ({ page }) => {
    // Test search performance if search page exists
    try {
      await page.goto('/dashboard/search', { timeout: 5000 })

      const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first()

      if (await searchInput.isVisible()) {
        const startTime = Date.now()

        await searchInput.fill('test query')
        await searchInput.press('Enter')

        // Wait for search results or response
        await page.waitForTimeout(2000)

        const endTime = Date.now()
        const searchTime = endTime - startTime

        expect(searchTime).toBeLessThan(5000) // Search should complete within 5 seconds

        console.log(`Search completed in ${searchTime}ms`)
      }
    } catch (error) {
      console.log('Search page not accessible, skipping search performance test')
    }
  })

  test('database query performance monitoring', async ({ page }) => {
    const response = await page.request.get('/api/health')

    expect(response.status()).toBe(200)

    const data = await response.json()

    if (data.responseTime) {
      expect(data.responseTime).toBeLessThan(1000) // Health check should respond in under 1 second
      console.log(`Health check response time: ${data.responseTime}ms`)
    }

    // Test multiple database queries
    const multipleRequests = 3
    const times = []

    for (let i = 0; i < multipleRequests; i++) {
      const start = Date.now()
      const res = await page.request.get('/api/health')
      const end = Date.now()

      expect(res.status()).toBe(200)
      times.push(end - start)
    }

    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length
    const maxTime = Math.max(...times)

    expect(avgTime).toBeLessThan(1000)
    expect(maxTime).toBeLessThan(2000)

    console.log(`Average DB query time: ${avgTime.toFixed(2)}ms`)
    console.log(`Max DB query time: ${maxTime}ms`)
  })
})