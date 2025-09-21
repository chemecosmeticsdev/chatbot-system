"use client"

import * as React from "react"
import { LanguageSwitcher, LanguageToggle, LanguageIndicator, useLanguage } from "./language-switcher"

/**
 * Language Switcher Component Examples
 *
 * This file demonstrates various usage patterns for the language switching components.
 * Use these examples as a reference for implementing language switching in your application.
 */

// Example 1: Header Navigation Dropdown
export const HeaderLanguageSwitcher: React.FC = () => {
  return (
    <div className="flex items-center gap-4">
      <nav className="flex items-center space-x-4">
        <a href="#" className="text-foreground hover:text-foreground/80">Dashboard</a>
        <a href="#" className="text-foreground hover:text-foreground/80">Settings</a>
      </nav>

      {/* Full dropdown with labels and flags */}
      <LanguageSwitcher
        variant="dropdown"
        size="md"
        showLabel={true}
        showFlag={true}
        onLanguageChange={(locale) => {
          console.log(`Language changed to: ${locale}`)
          // Handle language change (e.g., update app state, analytics)
        }}
      />
    </div>
  )
}

// Example 2: Mobile/Compact Version
export const MobileLanguageSwitcher: React.FC = () => {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <h1 className="text-lg font-semibold">Mobile Header</h1>

      {/* Compact version for mobile */}
      <LanguageSwitcher
        variant="compact"
        size="sm"
        showLabel={false}
        showFlag={true}
        className="sm:hidden"
      />

      {/* Toggle button for space-constrained areas */}
      <LanguageToggle
        size="sm"
        className="hidden sm:flex"
      />
    </div>
  )
}

// Example 3: Inline Language Selection (for forms)
export const InlineLanguageSelector: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Content Language</label>
        <LanguageSwitcher
          variant="inline"
          size="sm"
          showLabel={true}
          showFlag={true}
        />
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          Select your preferred language for content display. This setting will be saved automatically.
        </p>
      </div>
    </div>
  )
}

// Example 4: Footer Language Options
export const FooterLanguageSelector: React.FC = () => {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-muted-foreground">
              © 2024 Chatbot Management System. All rights reserved.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <LanguageIndicator variant="text" />
            <LanguageSwitcher
              variant="footer"
              size="sm"
              showLabel={true}
              showFlag={true}
            />
          </div>
        </div>
      </div>
    </footer>
  )
}

// Example 5: Floating Action Button
export const FloatingLanguageSwitcher: React.FC = () => {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <LanguageSwitcher
        variant="floating"
        size="lg"
        showLabel={false}
        showFlag={false}
        align="end"
        position="top"
      />
    </div>
  )
}

// Example 6: Custom Language Change Handler
export const CustomLanguageHandler: React.FC = () => {
  const { currentLocale, changeLanguage, isLoading, error } = useLanguage()

  const handleLanguageChange = async (newLocale: string) => {
    try {
      // Show confirmation for important forms
      const confirmed = window.confirm(
        `Are you sure you want to change language? This might reload the page.`
      )

      if (confirmed) {
        await changeLanguage(newLocale as any)

        // Custom analytics tracking
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'language_change', {
            'event_category': 'localization',
            'event_label': newLocale,
            'value': 1
          })
        }

        // Show success message
        // You could use a toast notification here
        console.log(`Successfully changed language to ${newLocale}`)
      }
    } catch (err) {
      console.error('Failed to change language:', err)
      // Show error message to user
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Language Settings</h3>
          <p className="text-sm text-muted-foreground">
            Current language: <LanguageIndicator variant="badge" />
          </p>
        </div>

        <LanguageSwitcher
          variant="dropdown"
          size="md"
          onLanguageChange={handleLanguageChange}
          loading={isLoading}
        />
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          Error: {error}
        </div>
      )}

      {isLoading && (
        <div className="p-3 bg-primary/10 text-primary rounded-md text-sm">
          Changing language...
        </div>
      )}
    </div>
  )
}

// Example 7: Responsive Language Switcher
export const ResponsiveLanguageSwitcher: React.FC = () => {
  return (
    <div className="flex items-center gap-2">
      {/* Desktop version */}
      <div className="hidden md:block">
        <LanguageSwitcher
          variant="dropdown"
          size="md"
          showLabel={true}
          showFlag={true}
        />
      </div>

      {/* Tablet version */}
      <div className="hidden sm:block md:hidden">
        <LanguageSwitcher
          variant="compact"
          size="md"
          showLabel={false}
          showFlag={true}
        />
      </div>

      {/* Mobile version */}
      <div className="block sm:hidden">
        <LanguageToggle size="sm" />
      </div>
    </div>
  )
}

// Example 8: Language Switcher with Keyboard Navigation
export const AccessibleLanguageSwitcher: React.FC = () => {
  return (
    <div className="space-y-2">
      <label htmlFor="language-switcher" className="text-sm font-medium">
        Interface Language
      </label>

      <LanguageSwitcher
        variant="dropdown"
        size="md"
        showLabel={true}
        showFlag={true}
        className="w-full max-w-xs"
        onLanguageChange={(locale) => {
          // Announce language change to screen readers
          const announcement = `Language changed to ${locale === 'en' ? 'English' : 'Thai'}`

          // Create a temporary element for screen reader announcement
          const announcer = document.createElement('div')
          announcer.setAttribute('aria-live', 'polite')
          announcer.setAttribute('aria-atomic', 'true')
          announcer.className = 'sr-only'
          announcer.textContent = announcement

          document.body.appendChild(announcer)
          setTimeout(() => {
            document.body.removeChild(announcer)
          }, 1000)
        }}
      />

      <p className="text-xs text-muted-foreground">
        Use Tab to navigate, Enter or Space to open menu, arrow keys to select language
      </p>
    </div>
  )
}

// Example 9: Language Switcher with Persistence Indicator
export const PersistentLanguageSwitcher: React.FC = () => {
  const { currentLocale } = useLanguage()
  const [showSaved, setShowSaved] = React.useState(false)

  React.useEffect(() => {
    // Check if language was loaded from storage
    const stored = localStorage.getItem('preferred-locale')
    if (stored === currentLocale) {
      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 3000)
    }
  }, [currentLocale])

  return (
    <div className="relative">
      <LanguageSwitcher
        variant="dropdown"
        size="md"
        showLabel={true}
        showFlag={true}
        onLanguageChange={() => {
          setShowSaved(true)
          setTimeout(() => setShowSaved(false), 3000)
        }}
      />

      {showSaved && (
        <div className="absolute top-full left-0 mt-1 px-2 py-1 bg-success text-success-foreground text-xs rounded shadow-lg animate-in fade-in duration-200">
          Language preference saved
        </div>
      )}
    </div>
  )
}

// Example Usage in a Complete Layout
export const CompleteLayoutExample: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <HeaderLanguageSwitcher />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Language Switcher Demo</h1>
            <p className="text-xl text-muted-foreground">
              Choose your preferred language for the best experience
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-6">
              <div className="p-6 border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Mobile Version</h3>
                <MobileLanguageSwitcher />
              </div>

              <div className="p-6 border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Inline Selection</h3>
                <InlineLanguageSelector />
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Custom Handler</h3>
                <CustomLanguageHandler />
              </div>

              <div className="p-6 border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Accessible Version</h3>
                <AccessibleLanguageSwitcher />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <FooterLanguageSelector />

      {/* Floating Action Button */}
      <FloatingLanguageSwitcher />
    </div>
  )
}

export default CompleteLayoutExample