# /test-visual

Run visual regression tests with Playwright for UI consistency

Captures screenshots of all components, compares against baseline images, tests responsive design breakpoints, and validates cross-browser compatibility.

```bash
echo "Starting visual regression tests..."

# Run Playwright visual tests
npm run test:visual

# Run full visual regression suite if available
if npm run test:e2e 2>/dev/null; then
    echo "Running comprehensive visual tests..."
    npx playwright test tests/e2e/visual-regression.spec.ts
fi

# Generate visual test report
echo "Generating visual test report..."

echo "Visual regression testing completed"
```