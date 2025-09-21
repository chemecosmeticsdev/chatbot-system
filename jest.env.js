// Environment variables for Jest testing
process.env.NODE_ENV = 'test'

// Stack Auth test configuration
process.env.NEXT_PUBLIC_STACK_PROJECT_ID = 'test-project-12345678-1234-1234-1234-123456789012'
process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY = 'test-publishable-key-32-characters-long'
process.env.STACK_SECRET_SERVER_KEY = 'test-secret-server-key-that-is-exactly-64-characters-long-enough'

// Database test configuration
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db?sslmode=disable'

// AWS test configuration (BAWS prefix for Amplify)
process.env.BAWS_ACCESS_KEY_ID = 'test-access-key'
process.env.BAWS_SECRET_ACCESS_KEY = 'test-secret-key'
process.env.DEFAULT_REGION = 'ap-southeast-1'
process.env.BEDROCK_REGION = 'us-east-1'

// OCR service test configuration
process.env.MISTRAL_API_KEY = 'test-mistral-api-key'
process.env.LLAMAINDEX_API_KEY = 'test-llamaindex-api-key'

// Sentry test configuration (disable in tests)
process.env.SENTRY_DSN = ''
process.env.SENTRY_ORG = 'test-org'
process.env.SENTRY_PROJECT = 'test-project'

// Next.js configuration
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret-key'

// Test database configuration
process.env.TEST_DATABASE_URL = 'postgresql://test:test@localhost:5432/test_chatbot'

// Disable analytics and monitoring in tests
process.env.DISABLE_ANALYTICS = 'true'
process.env.DISABLE_MONITORING = 'true'

console.log('Jest environment variables loaded for testing')