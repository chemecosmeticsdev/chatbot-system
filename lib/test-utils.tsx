import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { ThemeProvider } from 'next-themes'

// Mock Next.js router
const mockRouter = {
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

// Test wrapper with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {children}
    </ThemeProvider>
  )
}

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Test utilities
export const mockUser = {
  id: 'test-user-id',
  displayName: 'John Doe',
  primaryEmail: 'john@example.com',
  profileImageUrl: null,
  signOut: jest.fn(),
  update: jest.fn(),
}

export const mockStackApp = {
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  getUser: jest.fn(),
}

// Setup Stack Auth mocks
export const setupStackAuthMocks = (authenticated: boolean = true) => {
  const { useUser, useStackApp } = require('@stackframe/stack')

  useUser.mockReturnValue(authenticated ? mockUser : null)
  useStackApp.mockReturnValue(mockStackApp)
}

// Mock API responses
export const mockApiResponse = (data: any, success: boolean = true) => {
  return {
    ok: success,
    status: success ? 200 : 500,
    json: async () => ({
      success,
      data: success ? data : undefined,
      error: success ? undefined : 'Mock API error',
    }),
  }
}

// Mock fetch
export const mockFetch = (response: any) => {
  global.fetch = jest.fn().mockResolvedValue(mockApiResponse(response))
}

// Database test utilities
export const mockDatabaseClient = {
  connect: jest.fn(),
  end: jest.fn(),
  query: jest.fn(),
}

// Security test utilities
export const mockSecurityEvent = {
  type: 'test_event',
  severity: 'low' as const,
  source: 'test',
  details: 'Test security event',
  metadata: {},
}

// Analytics test utilities
export const mockAnalyticsData = {
  conversations: 150,
  messages: 1200,
  avgResponseTime: 1.5,
  costPerConversation: 0.05,
  timestamp: new Date().toISOString(),
}

// Vector search test utilities
export const mockVectorSearchResult = {
  results: [
    {
      id: 'doc-1',
      content: 'Test document content',
      score: 0.95,
      metadata: { title: 'Test Document' },
    },
  ],
  totalResults: 1,
  searchTime: 125,
}

// Component test helpers
export const expectElementToBeVisible = (element: HTMLElement) => {
  expect(element).toBeInTheDocument()
  expect(element).toBeVisible()
}

export const expectButtonToBeClickable = (button: HTMLElement) => {
  expect(button).toBeInTheDocument()
  expect(button).toBeEnabled()
  expect(button).not.toHaveAttribute('aria-disabled', 'true')
}

// Accessibility test helpers
export const checkAccessibility = async (container: HTMLElement) => {
  // const { axe } = await import('@axe-core/playwright')
  // Note: This would need axe-core for React Testing Library
  // For now, basic accessibility checks

  // Check for proper heading structure
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
  if (headings.length > 0) {
    const h1Count = container.querySelectorAll('h1').length
    expect(h1Count).toBeLessThanOrEqual(1) // Should have at most one h1
  }

  // Check for alt text on images
  const images = container.querySelectorAll('img')
  images.forEach(img => {
    expect(img).toHaveAttribute('alt')
  })

  // Check for form labels
  const inputs = container.querySelectorAll('input[type="email"], input[type="password"], input[type="text"]')
  inputs.forEach(input => {
    const hasLabel = (input as HTMLInputElement).labels && (input as HTMLInputElement).labels!.length > 0
    const hasAriaLabel = input.getAttribute('aria-label')
    const hasAriaLabelledby = input.getAttribute('aria-labelledby')

    expect(hasLabel || hasAriaLabel || hasAriaLabelledby).toBeTruthy()
  })
}

// Async test helpers
export const waitForLoadingToFinish = async () => {
  const { waitForElementToBeRemoved, screen } = await import('@testing-library/react')

  try {
    await waitForElementToBeRemoved(() => screen.queryByText(/loading/i), { timeout: 5000 })
  } catch {
    // Loading element might not exist
  }
}

// Error boundary test helper
export const TestErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="error-boundary">
      {children}
    </div>
  )
}

// Performance test helpers
export const measureRenderTime = (renderFn: () => void) => {
  const start = performance.now()
  renderFn()
  const end = performance.now()
  return end - start
}

// Local storage mock
export const mockLocalStorage = () => {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  })

  return localStorageMock
}

// Session storage mock
export const mockSessionStorage = () => {
  const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }

  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
  })

  return sessionStorageMock
}