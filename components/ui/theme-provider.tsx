"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

// Theme toggle hook
export function useTheme() {
  const [mounted, setMounted] = React.useState(false)
  const { theme, setTheme, resolvedTheme } = React.useContext(ThemeContext)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return { theme: undefined, setTheme: () => {}, resolvedTheme: undefined }
  }

  return { theme, setTheme, resolvedTheme }
}

// Theme context
const ThemeContext = React.createContext<{
  theme: string | undefined
  setTheme: (theme: string) => void
  resolvedTheme: string | undefined
}>({
  theme: undefined,
  setTheme: () => {},
  resolvedTheme: undefined,
})

// Theme toggle button component
interface ThemeToggleProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function ThemeToggle({ className, size = "md" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        className={`inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground ${
          size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10"
        } ${className || ""}`}
        disabled
      >
        <span className="sr-only">Loading theme toggle</span>
        <div className="h-4 w-4 animate-pulse bg-muted rounded" />
      </button>
    )
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const iconSize = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"

  return (
    <button
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10"
      } ${className || ""}`}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <svg
          className={iconSize}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        <svg
          className={iconSize}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  )
}

// Custom theme configurator
export interface ThemeConfig {
  light: {
    background: string
    foreground: string
    primary: string
    secondary: string
    accent: string
    muted: string
    destructive: string
    border: string
    input: string
    ring: string
  }
  dark: {
    background: string
    foreground: string
    primary: string
    secondary: string
    accent: string
    muted: string
    destructive: string
    border: string
    input: string
    ring: string
  }
}

export function applyThemeConfig(config: ThemeConfig) {
  if (typeof window === "undefined") return

  const root = document.documentElement

  // Apply light theme variables
  Object.entries(config.light).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value)
  })

  // Apply dark theme variables
  const darkSelector = ".dark"
  let darkStyleSheet = document.querySelector(
    `style[data-theme="dark"]`
  ) as HTMLStyleElement

  if (!darkStyleSheet) {
    darkStyleSheet = document.createElement("style")
    darkStyleSheet.setAttribute("data-theme", "dark")
    document.head.appendChild(darkStyleSheet)
  }

  const darkCSS = `
    ${darkSelector} {
      ${Object.entries(config.dark)
        .map(([key, value]) => `--${key}: ${value};`)
        .join("\n      ")}
    }
  `

  darkStyleSheet.textContent = darkCSS
}

// System theme detection
export function useSystemTheme() {
  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">("light")

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light")
    }

    setSystemTheme(mediaQuery.matches ? "dark" : "light")
    mediaQuery.addEventListener("change", handleChange)

    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  return systemTheme
}

// Theme persistence
export function useThemePersistence() {
  const [theme, setTheme] = React.useState<string | null>(null)

  React.useEffect(() => {
    const stored = localStorage.getItem("theme")
    if (stored) {
      setTheme(stored)
    }
  }, [])

  const persistTheme = React.useCallback((newTheme: string) => {
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
  }, [])

  return { theme, setTheme: persistTheme }
}

// Theme animation hook
export function useThemeTransition() {
  const [isTransitioning, setIsTransitioning] = React.useState(false)

  const transitionTheme = React.useCallback((callback: () => void) => {
    setIsTransitioning(true)

    // Disable transitions temporarily
    const css = document.createElement("style")
    css.type = "text/css"
    css.appendChild(
      document.createTextNode(
        `* {
          transition: none !important;
          animation: none !important;
        }`
      )
    )
    document.head.appendChild(css)

    // Apply theme change
    callback()

    // Re-enable transitions after a frame
    requestAnimationFrame(() => {
      document.head.removeChild(css)
      setIsTransitioning(false)
    })
  }, [])

  return { isTransitioning, transitionTheme }
}