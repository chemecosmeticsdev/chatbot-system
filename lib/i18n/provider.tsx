'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from './config';
import { translationLoader, getBundleForRoute } from './performance';
import type { ReactNode } from 'react';

// Provider context interface
interface I18nContextValue {
  isInitialized: boolean;
  currentLocale: string;
  isLoading: boolean;
  error: string | null;
  availableLocales: string[];
  changeLanguage: (locale: string) => Promise<void>;
  preloadNamespaces: (namespaces: string[]) => Promise<void>;
  isNamespaceLoaded: (namespace: string) => boolean;
}

// Create context
const I18nContext = createContext<I18nContextValue | null>(null);

// Provider props
interface I18nProviderProps {
  children: ReactNode;
  locale?: string;
  fallbackLocale?: string;
  enablePerformanceMode?: boolean;
  enableCaching?: boolean;
  preloadNamespaces?: string[];
  onLanguageChange?: (locale: string) => void;
  onError?: (error: Error) => void;
}

// Main i18n provider component
export function I18nProvider({
  children,
  locale: initialLocale,
  fallbackLocale = 'en',
  enablePerformanceMode = true,
  enableCaching = true,
  preloadNamespaces = [],
  onLanguageChange,
  onError
}: I18nProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentLocale, setCurrentLocale] = useState(initialLocale || fallbackLocale);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize i18n
  useEffect(() => {
    const initializeI18n = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Detect initial locale
        let detectedLocale = initialLocale;

        if (!detectedLocale && typeof window !== 'undefined') {
          // Check localStorage
          detectedLocale = localStorage.getItem('preferred-language') || undefined;

          // Check URL path
          if (!detectedLocale) {
            const pathLocale = window.location.pathname.split('/')[1];
            if (['en', 'th'].includes(pathLocale)) {
              detectedLocale = pathLocale;
            }
          }

          // Check browser language
          if (!detectedLocale) {
            const browserLang = navigator.language.split('-')[0];
            if (['en', 'th'].includes(browserLang)) {
              detectedLocale = browserLang;
            }
          }
        }

        const finalLocale = detectedLocale || fallbackLocale;

        // Initialize i18n with detected locale
        if (!i18n.isInitialized) {
          await i18n.changeLanguage(finalLocale);
        }

        // Preload critical namespaces
        if (enablePerformanceMode && preloadNamespaces.length > 0) {
          await translationLoader.preloadCritical(finalLocale, preloadNamespaces);
        }

        setCurrentLocale(finalLocale);
        setIsInitialized(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'i18n initialization failed';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        setIsLoading(false);
      }
    };

    initializeI18n();
  }, [initialLocale, fallbackLocale, enablePerformanceMode, preloadNamespaces, onError]);

  // Change language handler
  const changeLanguage = async (newLocale: string) => {
    if (newLocale === currentLocale) return;

    try {
      setIsLoading(true);
      setError(null);

      // Change i18n language
      await i18n.changeLanguage(newLocale);

      // Preload namespaces for new locale if performance mode is enabled
      if (enablePerformanceMode && preloadNamespaces.length > 0) {
        await translationLoader.preloadCritical(newLocale, preloadNamespaces);
      }

      // Update state
      setCurrentLocale(newLocale);

      // Save preference
      if (typeof window !== 'undefined') {
        localStorage.setItem('preferred-language', newLocale);
      }

      // Notify parent
      onLanguageChange?.(newLocale);

      // Update document attributes
      if (typeof document !== 'undefined') {
        document.documentElement.lang = newLocale;
        document.documentElement.dir = 'ltr'; // Both Thai and English are LTR
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Language change failed';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  // Preload namespaces
  const preloadNamespaces = async (namespaces: string[]) => {
    if (!enablePerformanceMode) return;

    try {
      await translationLoader.preloadCritical(currentLocale, namespaces);
    } catch (err) {
      console.warn('Failed to preload namespaces:', err);
    }
  };

  // Check if namespace is loaded
  const isNamespaceLoaded = (namespace: string) => {
    if (!enablePerformanceMode) return true;
    return translationLoader.isLoaded(currentLocale, namespace);
  };

  // Context value
  const contextValue: I18nContextValue = {
    isInitialized,
    currentLocale,
    isLoading,
    error,
    availableLocales: ['en', 'th'],
    changeLanguage,
    preloadNamespaces,
    isNamespaceLoaded
  };

  // Loading state
  if (!isInitialized && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive mb-2">
            Translation Error
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <I18nContext.Provider value={contextValue}>
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
    </I18nContext.Provider>
  );
}

// Hook to access i18n context
export function useI18nContext() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18nContext must be used within I18nProvider');
  }
  return context;
}

// Route-based namespace preloader component
interface RouteNamespaceLoaderProps {
  route: string;
  children: ReactNode;
}

export function RouteNamespaceLoader({ route, children }: RouteNamespaceLoaderProps) {
  const { currentLocale, preloadNamespaces, isNamespaceLoaded } = useI18nContext();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadNamespaces = async () => {
      const requiredNamespaces = getBundleForRoute(route);
      const unloadedNamespaces = requiredNamespaces.filter(
        ns => !isNamespaceLoaded(ns)
      );

      if (unloadedNamespaces.length > 0) {
        setIsLoading(true);
        try {
          await preloadNamespaces(unloadedNamespaces);
        } catch (error) {
          console.warn('Failed to preload route namespaces:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadNamespaces();
  }, [route, currentLocale, preloadNamespaces, isNamespaceLoaded]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}

// Lazy translation component for code splitting
interface LazyTranslationProps {
  namespace: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function LazyTranslation({ namespace, children, fallback }: LazyTranslationProps) {
  const { currentLocale, isNamespaceLoaded, preloadNamespaces } = useI18nContext();
  const [isLoading, setIsLoading] = useState(!isNamespaceLoaded(namespace));

  useEffect(() => {
    if (!isNamespaceLoaded(namespace)) {
      setIsLoading(true);
      preloadNamespaces([namespace])
        .finally(() => setIsLoading(false));
    }
  }, [namespace, currentLocale, isNamespaceLoaded, preloadNamespaces]);

  if (isLoading) {
    return <>{fallback || <div className="animate-pulse bg-muted h-4 w-24 rounded"></div>}</>;
  }

  return <>{children}</>;
}

// Error boundary for i18n
interface I18nErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class I18nErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  I18nErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): I18nErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('i18n Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 text-center">
            <p className="text-destructive">Translation error occurred</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
            >
              Retry
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Development helper component
export function I18nDevTools() {
  const { currentLocale, availableLocales, isInitialized, error } = useI18nContext();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-3 text-xs shadow-lg z-50">
      <div className="font-semibold mb-1">i18n DevTools</div>
      <div>Locale: {currentLocale}</div>
      <div>Initialized: {isInitialized ? '✅' : '❌'}</div>
      <div>Available: {availableLocales.join(', ')}</div>
      {error && <div className="text-destructive">Error: {error}</div>}
    </div>
  );
}

export default I18nProvider;