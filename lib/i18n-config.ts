/**
 * i18n Configuration for Next.js Application
 * Centralized configuration for Thai/English localization
 */

export const i18nConfig = {
  // Supported locales
  locales: ['en', 'th'] as const,

  // Default locale
  defaultLocale: 'en' as const,

  // Locale detection preferences
  localeDetection: {
    // Detect from URL path
    path: true,

    // Detect from Accept-Language header
    header: true,

    // Detect from cookie
    cookie: true,
    cookieName: 'NEXT_LOCALE',

    // Detect from query parameter
    query: false,

    // Cache locale in localStorage
    localStorage: true,
    localStorageKey: 'preferred-locale',
  },

  // Routing strategy
  routing: {
    // Strategy: 'subdirectory' | 'subdomain' | 'query'
    strategy: 'subdirectory',

    // Custom domain mapping (optional)
    domains: [
      {
        domain: 'chatbot.com',
        defaultLocale: 'en',
        locales: ['en']
      },
      {
        domain: 'chatbot.co.th',
        defaultLocale: 'th',
        locales: ['th']
      }
    ]
  },

  // Namespace configuration
  namespaces: {
    // Default namespaces loaded on every page
    default: ['common', 'navigation'],

    // Page-specific namespaces
    pages: {
      '/': ['dashboard'],
      '/auth': ['auth', 'forms'],
      '/admin': ['admin'],
      '/chat': ['chatbot'],
      '/settings': ['settings'],
      '/help': ['help']
    }
  },

  // Loading strategy
  loading: {
    // Lazy load translations
    lazy: true,

    // Preload critical namespaces
    preload: ['common', 'navigation'],

    // Cache duration (in ms)
    cacheDuration: 24 * 60 * 60 * 1000, // 24 hours

    // Fallback strategy
    fallback: 'blocking', // 'blocking' | 'non-blocking' | false
  },

  // Format configurations
  formats: {
    en: {
      date: {
        short: 'MM/dd/yyyy',
        medium: 'MMM d, yyyy',
        long: 'MMMM d, yyyy',
        full: 'EEEE, MMMM d, yyyy'
      },
      time: {
        short: 'h:mm a',
        medium: 'h:mm:ss a',
        long: 'h:mm:ss a z'
      },
      number: {
        decimal: '.',
        thousands: ',',
        currency: '$',
        currencyPosition: 'before'
      }
    },
    th: {
      date: {
        short: 'd/M/yyyy',
        medium: 'd MMM yyyy',
        long: 'd MMMM yyyy',
        full: 'EEEE d MMMM yyyy',
        buddhist: 'd MMMM พ.ศ. yyyy'
      },
      time: {
        short: 'HH:mm',
        medium: 'HH:mm:ss',
        long: 'HH:mm:ss z'
      },
      number: {
        decimal: '.',
        thousands: ',',
        currency: '฿',
        currencyPosition: 'before'
      },
      buddhist_era: {
        enabled: true,
        offset: 543
      }
    }
  },

  // Typography settings
  typography: {
    en: {
      fontFamily: 'Inter, system-ui, sans-serif',
      lineHeight: 1.5,
      letterSpacing: 'normal',
      direction: 'ltr' as const
    },
    th: {
      fontFamily: 'Noto Sans Thai, Sarabun, Prompt, system-ui, sans-serif',
      lineHeight: 1.7,
      letterSpacing: '0.025em',
      direction: 'ltr' as const,
      wordSpacing: 'normal',
      fontWeights: {
        light: 300,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      }
    }
  },

  // Validation rules
  validation: {
    // Required translation coverage
    minimumCoverage: 90,

    // Validate interpolation variables
    validateInterpolation: true,

    // Check for empty translations
    checkEmpty: true,

    // Thai-specific validations
    thai: {
      // Check for Thai character usage
      requireThaiChars: true,

      // Validate cultural appropriateness
      culturalValidation: true,

      // Check tone consistency
      toneValidation: true
    },

    // English-specific validations
    english: {
      // Grammar checking
      grammarCheck: true,

      // Accessibility language
      accessibilityCheck: true,

      // Consistent terminology
      terminologyCheck: true
    }
  },

  // Development tools
  dev: {
    // Show missing translations in dev mode
    showMissing: true,

    // Log translation usage
    logUsage: false,

    // Enable translation debugging
    debug: false,

    // Auto-suggest translation keys
    autoSuggest: true
  },

  // Production optimizations
  production: {
    // Enable translation caching
    cache: true,

    // Compress translation files
    compress: true,

    // Tree shake unused translations
    treeShake: true,

    // Generate static translations
    staticGeneration: true
  },

  // Integration settings
  integrations: {
    // Translation services
    translationServices: {
      google: {
        enabled: false,
        apiKey: process.env.GOOGLE_TRANSLATE_API_KEY,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
      },
      deepl: {
        enabled: false,
        apiKey: process.env.DEEPL_API_KEY
      }
    },

    // Analytics
    analytics: {
      // Track translation usage
      trackUsage: true,

      // Track missing translations
      trackMissing: true,

      // Track locale switching
      trackSwitching: true
    }
  }
} as const;

// Type definitions
export type Locale = typeof i18nConfig.locales[number];
export type Namespace = keyof typeof i18nConfig.namespaces.pages;

// Utility functions
export function getLocaleConfig(locale: Locale) {
  return {
    formats: i18nConfig.formats[locale],
    typography: i18nConfig.typography[locale]
  };
}

export function getNamespacesForPage(pathname: string): string[] {
  const pageNamespaces = i18nConfig.namespaces.pages[pathname as Namespace] || [];
  return [...i18nConfig.namespaces.default, ...pageNamespaces];
}

export function isValidLocale(locale: string): locale is Locale {
  return i18nConfig.locales.includes(locale as Locale);
}

export function getDefaultLocale(): Locale {
  return i18nConfig.defaultLocale;
}

export function getSupportedLocales(): readonly Locale[] {
  return i18nConfig.locales;
}

// Locale display names
export const localeNames = {
  en: {
    native: 'English',
    english: 'English'
  },
  th: {
    native: 'ไทย',
    english: 'Thai'
  }
} as const;

// Cultural configurations
export const culturalConfig = {
  th: {
    // Thai-specific cultural considerations
    colors: {
      royal: '#FFD700', // Yellow - royal color, use carefully
      buddhist: '#FF8C00', // Orange - Buddhist monks
      auspicious: '#FF0000', // Red - celebrations
      purity: '#FFFFFF', // White - purity, but also mourning
      elegance: '#000000' // Black - elegant, avoid for celebrations
    },

    numbers: {
      lucky: [3, 7, 9],
      unlucky: [4],
      royal: ['๑', '๒', '๓'] // Use Thai numerals for royal context
    },

    formality: {
      business: 'formal', // Use formal language for business
      casual: 'informal',
      royal: 'royal' // Special royal language
    },

    hierarchy: {
      respectAge: true,
      respectPosition: true,
      useHonorifics: true
    }
  },

  en: {
    // English cultural considerations
    formality: {
      business: 'professional',
      casual: 'friendly',
      technical: 'precise'
    },

    accessibility: {
      useSimpleLanguage: true,
      avoidJargon: true,
      beInclusive: true
    },

    tone: {
      default: 'helpful',
      error: 'apologetic',
      success: 'encouraging'
    }
  }
} as const;