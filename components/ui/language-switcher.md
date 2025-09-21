# Language Switcher Component

A comprehensive language switching component system for Thai/English applications built with Shadcn/ui components and Next.js i18n integration.

## Overview

The Language Switcher provides a complete solution for managing language preferences in your application with multiple component variants, automatic persistence, browser detection, and accessibility features.

## Components

### 1. LanguageSwitcher (Main Component)

The primary language switching component with multiple variants and full customization options.

```tsx
import { LanguageSwitcher } from "@/components/ui/language-switcher"

// Basic usage
<LanguageSwitcher />

// Advanced usage
<LanguageSwitcher
  variant="dropdown"
  size="md"
  showLabel={true}
  showFlag={true}
  onLanguageChange={(locale) => console.log('Changed to:', locale)}
  className="w-48"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"dropdown" \| "compact" \| "inline" \| "footer" \| "floating"` | `"dropdown"` | Visual style variant |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Component size |
| `showLabel` | `boolean` | `true` | Display language names |
| `showFlag` | `boolean` | `true` | Display flag emojis |
| `onLanguageChange` | `(locale: Locale) => void` | - | Callback when language changes |
| `disabled` | `boolean` | `false` | Disable interaction |
| `loading` | `boolean` | `false` | Show loading state |
| `position` | `"bottom" \| "top" \| "left" \| "right"` | `"bottom"` | Dropdown position |
| `align` | `"start" \| "center" \| "end"` | `"center"` | Dropdown alignment |
| `className` | `string` | - | Additional CSS classes |

#### Variants

**Dropdown** - Full dropdown menu with options
```tsx
<LanguageSwitcher variant="dropdown" showLabel={true} showFlag={true} />
```

**Compact** - Icon-only version for constrained spaces
```tsx
<LanguageSwitcher variant="compact" showLabel={false} size="sm" />
```

**Inline** - Toggle buttons side by side
```tsx
<LanguageSwitcher variant="inline" />
```

**Footer** - Minimal version for footers
```tsx
<LanguageSwitcher variant="footer" size="sm" />
```

**Floating** - Floating action button
```tsx
<LanguageSwitcher variant="floating" showLabel={false} />
```

### 2. LanguageToggle

A simple toggle button for quick language switching between two languages.

```tsx
import { LanguageToggle } from "@/components/ui/language-switcher"

<LanguageToggle size="md" showTooltip={true} />
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Button size |
| `showTooltip` | `boolean` | `true` | Show tooltip on hover |
| `className` | `string` | - | Additional CSS classes |

### 3. LanguageIndicator

A read-only display of the current language.

```tsx
import { LanguageIndicator } from "@/components/ui/language-switcher"

<LanguageIndicator variant="badge" showFlag={true} showLabel={true} />
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"badge" \| "text" \| "minimal"` | `"badge"` | Display style |
| `showFlag` | `boolean` | `true` | Display flag emoji |
| `showLabel` | `boolean` | `true` | Display language name |
| `className` | `string` | - | Additional CSS classes |

### 4. useLanguage Hook

A React hook for managing language state and operations.

```tsx
import { useLanguage } from "@/components/ui/language-switcher"

function MyComponent() {
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
      Current: {currentLocale}
      <button onClick={() => changeLanguage('th')}>
        Switch to Thai
      </button>
    </div>
  )
}
```

#### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `currentLocale` | `Locale` | Currently active locale |
| `changeLanguage` | `(locale: Locale) => Promise<void>` | Function to change language |
| `isLoading` | `boolean` | Language change in progress |
| `error` | `string \| null` | Last error message |
| `supportedLocales` | `readonly Locale[]` | Available locales |
| `defaultLocale` | `Locale` | Default fallback locale |

## Features

### 1. Automatic Language Detection

The component automatically detects language preference from multiple sources:

1. **URL Path** - `/th/dashboard` or `/en/dashboard`
2. **localStorage** - Previously saved user preference
3. **Browser Language** - Accept-Language header
4. **Cookies** - Server-side language preference

### 2. Persistent Storage

Language preferences are automatically saved to:
- **localStorage** - Client-side persistence
- **Cookies** - Server-side rendering support
- **URL** - SEO-friendly language routing

### 3. Typography Integration

Automatically applies appropriate typography for each language:

**English (Inter font)**
```css
font-family: Inter, system-ui, sans-serif;
line-height: 1.5;
letter-spacing: normal;
```

**Thai (Noto Sans Thai)**
```css
font-family: 'Noto Sans Thai', Sarabun, Prompt, system-ui, sans-serif;
line-height: 1.7;
letter-spacing: 0.025em;
```

### 4. Accessibility Features

- **ARIA Labels** - Proper labeling for screen readers
- **Keyboard Navigation** - Tab, Enter, Space, Arrow keys
- **Focus Management** - Visible focus indicators
- **Screen Reader Announcements** - Language change notifications
- **High Contrast Support** - Compatible with high contrast mode

### 5. Error Handling

Comprehensive error handling with user-friendly messages:

```tsx
<LanguageSwitcher
  onLanguageChange={(locale) => {
    try {
      // Handle language change
    } catch (error) {
      // Error is automatically handled and displayed
    }
  }}
/>
```

## Usage Examples

### Header Navigation

```tsx
export function Header() {
  return (
    <header className="border-b">
      <div className="container flex justify-between items-center py-4">
        <Logo />
        <nav className="flex items-center gap-4">
          <NavigationMenu />
          <LanguageSwitcher variant="dropdown" />
        </nav>
      </div>
    </header>
  )
}
```

### Mobile Responsive

```tsx
export function MobileHeader() {
  return (
    <header className="border-b">
      <div className="container flex justify-between items-center py-4">
        <Logo />
        <div className="flex items-center gap-2">
          {/* Desktop */}
          <div className="hidden md:block">
            <LanguageSwitcher variant="dropdown" />
          </div>

          {/* Mobile */}
          <div className="md:hidden">
            <LanguageToggle size="sm" />
          </div>
        </div>
      </div>
    </header>
  )
}
```

### Form Integration

```tsx
export function SettingsForm() {
  return (
    <form className="space-y-6">
      <div>
        <label className="text-sm font-medium">Interface Language</label>
        <LanguageSwitcher
          variant="inline"
          onLanguageChange={(locale) => {
            // Update form state
            updateSettings({ language: locale })
          }}
        />
      </div>
    </form>
  )
}
```

### Footer

```tsx
export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container py-8">
        <div className="flex justify-between items-center">
          <Copyright />
          <div className="flex items-center gap-4">
            <LanguageIndicator variant="text" />
            <LanguageSwitcher variant="footer" size="sm" />
          </div>
        </div>
      </div>
    </footer>
  )
}
```

## Styling and Customization

### Custom Styling

```tsx
<LanguageSwitcher
  className="border-primary bg-primary/5 hover:bg-primary/10"
  variant="dropdown"
/>
```

### Theme Integration

The component automatically inherits your theme colors:

```css
/* Light mode */
.language-switcher {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
}

/* Dark mode */
.dark .language-switcher {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
}
```

### Custom Variants

Create custom variants using the `languageSwitcherVariants` utility:

```tsx
import { languageSwitcherVariants } from "@/components/ui/language-switcher"

const customVariants = languageSwitcherVariants({
  variant: "dropdown",
  size: "lg",
  className: "border-2 border-primary"
})
```

## Integration with Next.js i18n

The component integrates seamlessly with the existing i18n configuration:

```tsx
// lib/i18n-config.ts
export const i18nConfig = {
  locales: ['en', 'th'],
  defaultLocale: 'en',
  // ... other config
}

// The component automatically uses this configuration
<LanguageSwitcher /> // Uses i18nConfig.locales and defaultLocale
```

## Performance Considerations

### Bundle Size
- **Core component**: ~8KB gzipped
- **Dependencies**: Uses existing Radix UI components
- **Tree shaking**: Import only what you need

### Optimization
- **Lazy loading** - Language resources loaded on demand
- **Efficient re-rendering** - Uses React.memo and useCallback
- **Minimal bundle impact** - No heavy dependencies

### Best Practices

1. **Use appropriate variants** for different contexts
2. **Implement error boundaries** for critical areas
3. **Cache language preferences** on the server
4. **Test with actual Thai and English content**
5. **Validate accessibility** with screen readers

## Testing

### Unit Tests

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageSwitcher } from '@/components/ui/language-switcher'

test('changes language when option is selected', async () => {
  const onLanguageChange = jest.fn()

  render(
    <LanguageSwitcher onLanguageChange={onLanguageChange} />
  )

  fireEvent.click(screen.getByRole('button', { name: /select language/i }))
  fireEvent.click(screen.getByRole('menuitem', { name: /thai/i }))

  expect(onLanguageChange).toHaveBeenCalledWith('th')
})
```

### E2E Tests

```tsx
// tests/e2e/language-switcher.spec.ts
import { test, expect } from '@playwright/test'

test('language switcher works correctly', async ({ page }) => {
  await page.goto('/')

  // Click language switcher
  await page.click('[data-testid="language-switcher"]')

  // Select Thai
  await page.click('text=ไทย')

  // Verify URL changed
  expect(page.url()).toContain('/th/')

  // Verify content is in Thai
  await expect(page.locator('h1')).toContainText('ระบบจัดการ')
})
```

## Troubleshooting

### Common Issues

**Language not persisting**
- Check localStorage availability
- Verify cookie settings
- Ensure server-side rendering support

**Typography not rendering correctly**
- Install Noto Sans Thai font
- Check font loading in production
- Verify CSS font-family declarations

**Accessibility issues**
- Test with screen readers
- Verify keyboard navigation
- Check ARIA labels

### Debug Mode

Enable debug mode to troubleshoot issues:

```tsx
// lib/i18n-config.ts
export const i18nConfig = {
  dev: {
    debug: true, // Enable in development
    showMissing: true,
    logUsage: true
  }
}
```

## Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Mobile browsers**: Full support
- **Internet Explorer**: Not supported

## Dependencies

- **React**: 18.0+
- **Next.js**: 13.0+
- **Radix UI**: For dropdown functionality
- **Lucide React**: For icons
- **class-variance-authority**: For variant styling
- **Tailwind CSS**: For styling

## License

This component is part of the Chatbot Management System and follows the same license terms.

## Contributing

1. Follow existing code patterns
2. Add tests for new features
3. Update documentation
4. Test with both Thai and English content
5. Verify accessibility compliance

---

For more examples and advanced usage patterns, see the `language-switcher.example.tsx` file.