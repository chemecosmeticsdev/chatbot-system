import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Stack Auth
jest.mock('@stackframe/stack', () => ({
  useUser: jest.fn(),
  useStackApp: jest.fn(),
  StackProvider: ({ children }) => children,
  StackTheme: ({ children }) => children,
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  },
}))

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_STACK_PROJECT_ID = 'test-project-id'
process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY = 'test-publishable-key'
process.env.STACK_SECRET_SERVER_KEY = 'test-secret-key'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock console methods in tests
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
})

// Setup test utilities
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()

  // Reset fetch mock
  if (global.fetch) {
    global.fetch.mockClear()
  }
})

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks()
})