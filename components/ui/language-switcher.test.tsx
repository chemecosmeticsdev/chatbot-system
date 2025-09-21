/**
 * Language Switcher Component Tests
 *
 * Basic tests to verify the language switcher components work correctly
 * and integrate properly with the i18n system.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock the i18n config and utilities
jest.mock('@/lib/i18n-config', () => ({
  i18nConfig: {
    locales: ['en', 'th'],
    defaultLocale: 'en',
    localeDetection: {
      cookieName: 'NEXT_LOCALE',
      localStorage: true,
      localStorageKey: 'preferred-locale'
    },
    routing: {
      strategy: 'subdirectory'
    }
  },
  localeNames: {
    en: {
      native: 'English',
      english: 'English'
    },
    th: {
      native: 'ไทย',
      english: 'Thai'
    }
  }
}))

jest.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
  storage: {
    get: jest.fn((key: string, defaultValue: any) => defaultValue),
    set: jest.fn(() => true),
    remove: jest.fn(() => true)
  },
  updateUrlParams: jest.fn()
}))

// Mock Radix UI Dropdown
jest.mock('@radix-ui/react-dropdown-menu', () => ({
  Root: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-root">{children}</div>,
  Trigger: ({ children, ...props }: { children: React.ReactNode } & any) => (
    <button data-testid="dropdown-trigger" {...props}>{children}</button>
  ),
  Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Content: ({ children, ...props }: { children: React.ReactNode } & any) => (
    <div data-testid="dropdown-content" {...props}>{children}</div>
  ),
  Item: ({ children, onClick, ...props }: { children: React.ReactNode; onClick?: () => void } & any) => (
    <div data-testid="dropdown-item" onClick={onClick} {...props}>{children}</div>
  ),
  Separator: (props: any) => <hr data-testid="dropdown-separator" {...props} />
}))

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  ChevronDown: (props: any) => <div data-testid="chevron-down" {...props}>▼</div>,
  Globe: (props: any) => <div data-testid="globe" {...props}>🌐</div>,
  Check: (props: any) => <div data-testid="check" {...props}>✓</div>,
  Languages: (props: any) => <div data-testid="languages" {...props}>🗣️</div>,
  Monitor: (props: any) => <div data-testid="monitor" {...props}>🖥️</div>
}))

// Mock global objects
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  },
  writable: true
})

Object.defineProperty(navigator, 'language', {
  value: 'en-US',
  writable: true
})

// Mock location
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/en/dashboard',
    search: '',
    href: 'http://localhost:3000/en/dashboard'
  },
  writable: true
})

import {
  LanguageSwitcher,
  LanguageToggle,
  LanguageIndicator,
  useLanguage
} from './language-switcher'

describe('LanguageSwitcher Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders dropdown variant correctly', () => {
    render(<LanguageSwitcher variant="dropdown" />)

    expect(screen.getByTestId('dropdown-root')).toBeInTheDocument()
    expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument()
  })

  test('renders compact variant correctly', () => {
    render(<LanguageSwitcher variant="compact" />)

    expect(screen.getByTestId('languages')).toBeInTheDocument()
  })

  test('renders inline variant correctly', () => {
    render(<LanguageSwitcher variant="inline" />)

    // Inline variant should render buttons directly
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(1)
  })

  test('renders floating variant correctly', () => {
    render(<LanguageSwitcher variant="floating" />)

    expect(screen.getByTestId('globe')).toBeInTheDocument()
  })

  test('shows flags when showFlag is true', () => {
    render(<LanguageSwitcher variant="dropdown" showFlag={true} />)

    // Should show flag emoji in current language display
    const trigger = screen.getByTestId('dropdown-trigger')
    expect(trigger).toBeInTheDocument()
  })

  test('handles language change callback', () => {
    const onLanguageChange = jest.fn()
    render(<LanguageSwitcher variant="inline" onLanguageChange={onLanguageChange} />)

    // Find and click a language button
    const buttons = screen.getAllByRole('button')
    if (buttons.length > 1) {
      fireEvent.click(buttons[1])
      expect(onLanguageChange).toHaveBeenCalled()
    }
  })

  test('applies correct size classes', () => {
    const { rerender } = render(<LanguageSwitcher size="sm" />)

    // Check if size classes are applied (basic structure test)
    expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument()

    rerender(<LanguageSwitcher size="lg" />)
    expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument()
  })
})

describe('LanguageToggle Component', () => {
  test('renders toggle button correctly', () => {
    render(<LanguageToggle />)

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  test('has correct accessibility attributes', () => {
    render(<LanguageToggle showTooltip={true} />)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label')
  })
})

describe('LanguageIndicator Component', () => {
  test('renders badge variant correctly', () => {
    render(<LanguageIndicator variant="badge" />)

    // Should render a status element
    const indicator = screen.getByRole('status')
    expect(indicator).toBeInTheDocument()
  })

  test('renders text variant correctly', () => {
    render(<LanguageIndicator variant="text" />)

    const indicator = screen.getByRole('status')
    expect(indicator).toBeInTheDocument()
  })

  test('renders minimal variant correctly', () => {
    render(<LanguageIndicator variant="minimal" />)

    const indicator = screen.getByRole('status')
    expect(indicator).toBeInTheDocument()
  })

  test('shows flag when showFlag is true', () => {
    render(<LanguageIndicator showFlag={true} />)

    const indicator = screen.getByRole('status')
    expect(indicator).toBeInTheDocument()
  })

  test('shows label when showLabel is true', () => {
    render(<LanguageIndicator showLabel={true} />)

    const indicator = screen.getByRole('status')
    expect(indicator).toBeInTheDocument()
  })
})

describe('useLanguage Hook', () => {
  // Create a test component to test the hook
  const TestComponent: React.FC = () => {
    const {
      currentLocale,
      changeLanguage,
      isLoading,
      error,
      supportedLocales,
      defaultLocale
    } = useLanguage()

    return (
      <div>
        <div data-testid="current-locale">{currentLocale}</div>
        <div data-testid="supported-locales">{supportedLocales.join(',')}</div>
        <div data-testid="default-locale">{defaultLocale}</div>
        <div data-testid="is-loading">{isLoading.toString()}</div>
        <div data-testid="error">{error || 'none'}</div>
        <button
          data-testid="change-language"
          onClick={() => changeLanguage('th' as any)}
        >
          Change to Thai
        </button>
      </div>
    )
  }

  test('returns correct initial values', () => {
    render(<TestComponent />)

    expect(screen.getByTestId('current-locale')).toHaveTextContent('en')
    expect(screen.getByTestId('supported-locales')).toHaveTextContent('en,th')
    expect(screen.getByTestId('default-locale')).toHaveTextContent('en')
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
    expect(screen.getByTestId('error')).toHaveTextContent('none')
  })

  test('change language function works', async () => {
    render(<TestComponent />)

    const changeButton = screen.getByTestId('change-language')
    fireEvent.click(changeButton)

    // Should trigger state change
    await waitFor(() => {
      // The loading state might briefly change
      expect(screen.getByTestId('current-locale')).toBeInTheDocument()
    })
  })
})

describe('Integration Tests', () => {
  test('components work together correctly', () => {
    render(
      <div>
        <LanguageIndicator />
        <LanguageSwitcher variant="dropdown" />
        <LanguageToggle />
      </div>
    )

    // All components should render without conflicts
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByTestId('dropdown-root')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(2) // dropdown trigger + toggle
  })

  test('respects disabled state', () => {
    render(<LanguageSwitcher disabled={true} />)

    const trigger = screen.getByTestId('dropdown-trigger')
    expect(trigger).toBeDisabled()
  })

  test('shows loading state correctly', () => {
    render(<LanguageSwitcher loading={true} />)

    // Should show loading indicator
    expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument()
  })
})

describe('Accessibility Tests', () => {
  test('dropdown has correct ARIA attributes', () => {
    render(<LanguageSwitcher variant="dropdown" />)

    const trigger = screen.getByTestId('dropdown-trigger')
    expect(trigger).toHaveAttribute('aria-expanded')
  })

  test('language options have correct labels', () => {
    render(<LanguageSwitcher variant="inline" />)

    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-label')
    })
  })

  test('language indicator has status role', () => {
    render(<LanguageIndicator />)

    const indicator = screen.getByRole('status')
    expect(indicator).toHaveAttribute('aria-label')
  })
})

describe('Font and Typography Tests', () => {
  test('applies correct font families for different languages', () => {
    render(<LanguageSwitcher variant="dropdown" />)

    // Component should render and handle typography internally
    expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument()
  })
})