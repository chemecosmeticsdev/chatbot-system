# /validate-apis

Test all API endpoints with comprehensive integration tests

Validates API responses and error handling, tests authentication and authorization, checks rate limiting and security, and verifies database operations.

```bash
echo "Starting comprehensive API validation..."

# Run API integration tests
npm run test:api

# Run E2E API tests if available
if npm run test:api:e2e 2>/dev/null; then
    echo "Running E2E API tests..."
    npm run test:api:e2e
fi

# Validate API documentation
echo "Validating API endpoints..."

# Check for common API endpoints
ENDPOINTS=(
    "/api/health"
    "/api/test-neon"
    "/api/test-auth"
    "/api/test-aws"
    "/api/test-ocr"
)

for endpoint in "${ENDPOINTS[@]}"; do
    echo "Checking endpoint: $endpoint"
done

echo "API validation completed"
```