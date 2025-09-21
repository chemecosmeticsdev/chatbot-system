"use client"

import * as React from "react"
import { ChevronDown, Globe, Check, Languages, Monitor } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { i18nConfig, type Locale, localeNames } from "@/lib/i18n-config"
import { storage, updateUrlParams, cn } from "@/lib/utils"

// Types for language switcher
export interface LanguageSwitcherProps {
  variant?: "dropdown" | "compact" | "inline" | "footer" | "floating"
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  showFlag?: boolean
  className?: string
  onLanguageChange?: (locale: Locale) => void
  disabled?: boolean
  loading?: boolean
  position?: "bottom" | "top" | "left" | "right"
  align?: "start" | "center" | "end"
}

// Language option interface
interface LanguageOption {
  code: Locale
  name: string
  nativeName: string
  flag: string
  isActive: boolean
}

// Variant styling with class-variance-authority
const languageSwitcherVariants = cva(
  "inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        dropdown: "border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md",
        compact: "hover:bg-accent hover:text-accent-foreground rounded-md",
        inline: "bg-transparent hover:bg-accent/50 rounded-sm",
        footer: "bg-transparent hover:bg-accent/30 text-sm",
        floating: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-lg hover:shadow-xl"
      },
      size: {
        sm: "h-8 text-xs px-2 gap-1",
        md: "h-9 text-sm px-3 gap-2",
        lg: "h-10 text-base px-4 gap-2"
      }
    },
    defaultVariants: {
      variant: "dropdown",
      size: "md"
    }
  }
)

// Custom hook for language management
export function useLanguage() {
  const [currentLocale, setCurrentLocale] = React.useState<Locale>(() => {
    if (typeof window !== "undefined") {
      // Check localStorage first
      const stored = storage.get<Locale>("preferred-locale", i18nConfig.defaultLocale)
      if (i18nConfig.locales.includes(stored)) {
        return stored
      }

      // Check URL path
      const pathLocale = window.location.pathname.split('/')[1] as Locale
      if (i18nConfig.locales.includes(pathLocale)) {
        return pathLocale
      }

      // Check browser language
      const browserLang = navigator.language.split('-')[0] as Locale
      if (i18nConfig.locales.includes(browserLang)) {
        return browserLang
      }
    }

    return i18nConfig.defaultLocale
  })

  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const changeLanguage = React.useCallback(async (newLocale: Locale) => {
    if (newLocale === currentLocale) return

    setIsLoading(true)
    setError(null)

    try {
      // Store preference
      storage.set("preferred-locale", newLocale)

      // Update cookie for server-side rendering
      if (typeof window !== "undefined") {
        document.cookie = `${i18nConfig.localeDetection.cookieName}=${newLocale}; path=/; max-age=31536000`
      }

      // Update URL if using subdirectory strategy
      if (i18nConfig.routing.strategy === 'subdirectory' && typeof window !== "undefined") {
        const currentPath = window.location.pathname
        const pathParts = currentPath.split('/')

        // Remove current locale if present
        if (i18nConfig.locales.includes(pathParts[1] as Locale)) {
          pathParts.splice(1, 1)
        }

        // Add new locale (unless it's default and using implicit default)
        const newPath = newLocale === i18nConfig.defaultLocale
          ? pathParts.join('/') || '/'
          : `/${newLocale}${pathParts.join('/') || ''}`

        // Navigate to new URL
        window.location.href = newPath + window.location.search
        return
      }

      // For other strategies, just update state
      setCurrentLocale(newLocale)

      // Dispatch custom event for other components to listen
      window.dispatchEvent(new CustomEvent('languageChanged', {
        detail: { locale: newLocale }
      }))

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change language')
      console.error('Language change error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [currentLocale])

  // Auto-detect language on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return

    const detectLanguage = () => {
      // Check if URL already has locale
      const pathLocale = window.location.pathname.split('/')[1] as Locale
      if (i18nConfig.locales.includes(pathLocale)) {
        setCurrentLocale(pathLocale)
        return
      }

      // Use stored preference
      const stored = storage.get<Locale>("preferred-locale", null)
      if (stored && i18nConfig.locales.includes(stored)) {
        setCurrentLocale(stored)
        return
      }

      // Auto-detect from browser if enabled
      if (i18nConfig.localeDetection.header) {
        const browserLang = navigator.language.split('-')[0] as Locale
        if (i18nConfig.locales.includes(browserLang)) {
          changeLanguage(browserLang)
          return
        }
      }
    }

    detectLanguage()
  }, [changeLanguage])

  return {
    currentLocale,
    changeLanguage,
    isLoading,
    error,
    supportedLocales: i18nConfig.locales,
    defaultLocale: i18nConfig.defaultLocale
  }
}

// Language option component
const LanguageOption: React.FC<{
  option: LanguageOption
  onClick: () => void
  showFlag: boolean
  showLabel: boolean
  variant: "dropdown" | "compact" | "inline" | "footer" | "floating"
}> = ({ option, onClick, showFlag, showLabel, variant }) => {
  return (
    <DropdownMenuItem
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 cursor-pointer",
        option.isActive && "bg-accent text-accent-foreground",
        variant === "footer" && "text-xs"
      )}
      aria-label={`Switch to ${option.name}`}
    >
      {showFlag && (
        <span className="text-base leading-none" role="img" aria-label={`${option.name} flag`}>
          {option.flag}
        </span>
      )}
      <div className="flex flex-col min-w-0 flex-1">
        {showLabel && (
          <span className="font-medium truncate">
            {option.name}
          </span>
        )}
        <span
          className={cn(
            "text-sm text-muted-foreground truncate",
            !showLabel && "text-foreground font-medium",
            variant === "footer" && "text-xs"
          )}
          style={{
            fontFamily: option.code === 'th' ?
              'Noto Sans Thai, Sarabun, Prompt, system-ui, sans-serif' :
              'Inter, system-ui, sans-serif'
          }}
        >
          {option.nativeName}
        </span>
      </div>
      {option.isActive && (
        <Check className="h-4 w-4 text-primary" aria-hidden="true" />
      )}
    </DropdownMenuItem>
  )
}

// Dropdown Menu Components
const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

// Main Language Switcher Component
export const LanguageSwitcher = React.forwardRef<
  HTMLDivElement,
  LanguageSwitcherProps
>(({
  variant = "dropdown",
  size = "md",
  showLabel = true,
  showFlag = true,
  className,
  onLanguageChange,
  disabled = false,
  loading = false,
  position = "bottom",
  align = "center",
  ...props
}, ref) => {
  const { currentLocale, changeLanguage, isLoading, error } = useLanguage()
  const [isOpen, setIsOpen] = React.useState(false)

  // Create language options
  const languageOptions: LanguageOption[] = React.useMemo(() => {
    return i18nConfig.locales.map(locale => ({
      code: locale,
      name: localeNames[locale].english,
      nativeName: localeNames[locale].native,
      flag: locale === 'en' ? '🇺🇸' : '🇹🇭',
      isActive: locale === currentLocale
    }))
  }, [currentLocale])

  const currentOption = languageOptions.find(opt => opt.isActive)

  const handleLanguageChange = React.useCallback(async (locale: Locale) => {
    setIsOpen(false)
    await changeLanguage(locale)
    onLanguageChange?.(locale)
  }, [changeLanguage, onLanguageChange])

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setIsOpen(!isOpen)
    }
  }, [isOpen])

  const isDisabled = disabled || isLoading || loading

  // Render based on variant
  const renderTrigger = () => {
    const triggerClasses = cn(
      languageSwitcherVariants({ variant, size }),
      className
    )

    const content = (
      <>
        {showFlag && currentOption && (
          <span className="text-base leading-none" role="img" aria-label={`${currentOption.name} flag`}>
            {currentOption.flag}
          </span>
        )}

        {variant === "compact" ? (
          <Languages className="h-4 w-4" />
        ) : variant === "floating" ? (
          <Globe className="h-4 w-4" />
        ) : showLabel && currentOption ? (
          <span
            className="font-medium truncate"
            style={{
              fontFamily: currentLocale === 'th' ?
                'Noto Sans Thai, Sarabun, Prompt, system-ui, sans-serif' :
                'Inter, system-ui, sans-serif'
            }}
          >
            {currentOption.nativeName}
          </span>
        ) : null}

        {(isLoading || loading) ? (
          <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
        ) : variant !== "floating" && variant !== "inline" ? (
          <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
        ) : null}
      </>
    )

    if (variant === "inline") {
      return (
        <div className="flex items-center gap-1">
          {languageOptions.map((option) => (
            <button
              key={option.code}
              onClick={() => !option.isActive && handleLanguageChange(option.code)}
              disabled={isDisabled}
              className={cn(
                "px-2 py-1 text-sm rounded transition-colors",
                option.isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground",
                isDisabled && "opacity-50 cursor-not-allowed"
              )}
              aria-label={`Switch to ${option.name}`}
              aria-current={option.isActive ? "page" : undefined}
            >
              {showFlag && <span className="mr-1">{option.flag}</span>}
              <span
                style={{
                  fontFamily: option.code === 'th' ?
                    'Noto Sans Thai, Sarabun, Prompt, system-ui, sans-serif' :
                    'Inter, system-ui, sans-serif'
                }}
              >
                {showLabel ? option.nativeName : option.code.toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      )
    }

    return (
      <DropdownMenuTrigger
        className={triggerClasses}
        disabled={isDisabled}
        onKeyDown={handleKeyDown}
        aria-label="Select language"
      >
        {content}
      </DropdownMenuTrigger>
    )
  }

  if (variant === "inline") {
    return (
      <div ref={ref} className={className} {...props}>
        {renderTrigger()}
      </div>
    )
  }

  return (
    <div ref={ref} className={className} {...props}>
      <DropdownMenu>
        {renderTrigger()}
        <DropdownMenuContent align={align} className="w-48">
          {languageOptions.map((option) => (
            <LanguageOption
              key={option.code}
              option={option}
              onClick={() => handleLanguageChange(option.code)}
              showFlag={showFlag}
              showLabel={showLabel}
              variant={variant}
            />
          ))}

          {error && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1 text-xs text-destructive">
                {error}
              </div>
            </>
          )}

          <DropdownMenuSeparator />
          <div className="px-2 py-1 text-xs text-muted-foreground">
            Language preferences are saved automatically
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})

LanguageSwitcher.displayName = "LanguageSwitcher"

// Quick language toggle component (for compact spaces)
export const LanguageToggle = React.forwardRef<
  HTMLButtonElement,
  {
    className?: string
    size?: "sm" | "md" | "lg"
    showTooltip?: boolean
  }
>(({ className, size = "md", showTooltip = true }, ref) => {
  const { currentLocale, changeLanguage, isLoading } = useLanguage()

  const nextLocale: Locale = currentLocale === 'en' ? 'th' : 'en'
  const nextOption = {
    code: nextLocale,
    name: localeNames[nextLocale].english,
    nativeName: localeNames[nextLocale].native,
    flag: nextLocale === 'en' ? '🇺🇸' : '🇹🇭'
  }

  const handleToggle = () => {
    changeLanguage(nextLocale)
  }

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-10 w-10 text-base"
  }

  return (
    <button
      ref={ref}
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        sizeClasses[size],
        className
      )}
      title={showTooltip ? `Switch to ${nextOption.name}` : undefined}
      aria-label={`Switch to ${nextOption.name}`}
    >
      {isLoading ? (
        <div className="animate-spin h-4 w-4 border border-current border-t-transparent rounded-full" />
      ) : (
        <span className="text-base leading-none" role="img" aria-label={`${nextOption.name} flag`}>
          {nextOption.flag}
        </span>
      )}
    </button>
  )
})

LanguageToggle.displayName = "LanguageToggle"

// Language indicator (read-only display)
export const LanguageIndicator: React.FC<{
  className?: string
  showFlag?: boolean
  showLabel?: boolean
  variant?: "badge" | "text" | "minimal"
}> = ({ className, showFlag = true, showLabel = true, variant = "badge" }) => {
  const { currentLocale } = useLanguage()

  const currentOption = {
    code: currentLocale,
    name: localeNames[currentLocale].english,
    nativeName: localeNames[currentLocale].native,
    flag: currentLocale === 'en' ? '🇺🇸' : '🇹🇭'
  }

  const variantClasses = {
    badge: "inline-flex items-center gap-1 px-2 py-1 bg-accent text-accent-foreground rounded text-xs font-medium",
    text: "inline-flex items-center gap-1 text-sm",
    minimal: "inline-flex items-center gap-0.5 text-xs text-muted-foreground"
  }

  return (
    <div className={cn(variantClasses[variant], className)} role="status" aria-label={`Current language: ${currentOption.name}`}>
      {showFlag && (
        <span className="text-base leading-none" role="img" aria-label={`${currentOption.name} flag`}>
          {currentOption.flag}
        </span>
      )}
      {showLabel && (
        <span
          style={{
            fontFamily: currentLocale === 'th' ?
              'Noto Sans Thai, Sarabun, Prompt, system-ui, sans-serif' :
              'Inter, system-ui, sans-serif'
          }}
        >
          {variant === "minimal" ? currentOption.code.toUpperCase() : currentOption.nativeName}
        </span>
      )}
    </div>
  )
}

LanguageIndicator.displayName = "LanguageIndicator"

// Export all components and utilities
export {
  useLanguage,
  languageSwitcherVariants,
  type LanguageSwitcherProps,
  type LanguageOption
}