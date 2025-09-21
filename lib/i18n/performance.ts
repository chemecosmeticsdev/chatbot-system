// i18n Performance Optimization and Caching

import { useState, useEffect, useCallback } from 'react';

// Translation cache interface
interface TranslationCache {
  [locale: string]: {
    [namespace: string]: {
      data: any;
      timestamp: number;
      version: string;
    };
  };
}

// Cache configuration
export interface CacheConfig {
  maxAge: number; // Maximum age in milliseconds
  maxSize: number; // Maximum number of entries
  compressionEnabled: boolean;
  persistToStorage: boolean;
  storageKey: string;
}

export const defaultCacheConfig: CacheConfig = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  maxSize: 50, // 50 translation files
  compressionEnabled: true,
  persistToStorage: true,
  storageKey: 'i18n-cache'
};

// Performance-optimized translation cache
export class TranslationCacheManager {
  private cache: TranslationCache = {};
  private accessTimes: Map<string, number> = new Map();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...defaultCacheConfig, ...config };
    this.loadFromStorage();
  }

  // Generate cache key
  private getCacheKey(locale: string, namespace: string): string {
    return `${locale}:${namespace}`;
  }

  // Check if cache entry is valid
  private isValid(locale: string, namespace: string): boolean {
    const entry = this.cache[locale]?.[namespace];
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    return age < this.config.maxAge;
  }

  // Get translations from cache
  public get(locale: string, namespace: string): any | null {
    const key = this.getCacheKey(locale, namespace);

    if (!this.isValid(locale, namespace)) {
      this.remove(locale, namespace);
      return null;
    }

    // Update access time for LRU eviction
    this.accessTimes.set(key, Date.now());

    return this.cache[locale][namespace].data;
  }

  // Set translations in cache
  public set(locale: string, namespace: string, data: any, version = '1.0.0'): void {
    if (!this.cache[locale]) {
      this.cache[locale] = {};
    }

    const key = this.getCacheKey(locale, namespace);

    this.cache[locale][namespace] = {
      data: this.config.compressionEnabled ? this.compress(data) : data,
      timestamp: Date.now(),
      version
    };

    this.accessTimes.set(key, Date.now());

    // Enforce cache size limit
    this.enforceMaxSize();

    // Persist to storage if enabled
    if (this.config.persistToStorage) {
      this.saveToStorage();
    }
  }

  // Remove entry from cache
  public remove(locale: string, namespace: string): void {
    if (this.cache[locale]?.[namespace]) {
      delete this.cache[locale][namespace];
      const key = this.getCacheKey(locale, namespace);
      this.accessTimes.delete(key);
    }
  }

  // Clear all cache entries
  public clear(): void {
    this.cache = {};
    this.accessTimes.clear();
    this.clearStorage();
  }

  // Clear cache for specific locale
  public clearLocale(locale: string): void {
    if (this.cache[locale]) {
      Object.keys(this.cache[locale]).forEach(namespace => {
        const key = this.getCacheKey(locale, namespace);
        this.accessTimes.delete(key);
      });
      delete this.cache[locale];
    }
  }

  // Enforce maximum cache size using LRU eviction
  private enforceMaxSize(): void {
    const totalEntries = Object.values(this.cache).reduce(
      (sum, localeCache) => sum + Object.keys(localeCache).length,
      0
    );

    if (totalEntries <= this.config.maxSize) return;

    // Sort by access time (least recently used first)
    const sortedKeys = Array.from(this.accessTimes.entries())
      .sort(([, timeA], [, timeB]) => timeA - timeB)
      .map(([key]) => key);

    // Remove oldest entries
    const entriesToRemove = totalEntries - this.config.maxSize;
    for (let i = 0; i < entriesToRemove; i++) {
      const [locale, namespace] = sortedKeys[i].split(':');
      this.remove(locale, namespace);
    }
  }

  // Compress data for storage efficiency
  private compress(data: any): any {
    if (!this.config.compressionEnabled) return data;

    // Simple compression: remove empty values and compact structure
    const compressed = this.removeEmpty(data);
    return compressed;
  }

  // Remove empty values from object
  private removeEmpty(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.filter(item => item !== null && item !== undefined && item !== '');
    }

    if (typeof obj === 'object' && obj !== null) {
      const compressed: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== null && value !== undefined && value !== '') {
          compressed[key] = this.removeEmpty(value);
        }
      }
      return compressed;
    }

    return obj;
  }

  // Load cache from localStorage
  private loadFromStorage(): void {
    if (!this.config.persistToStorage || typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.cache = parsed.cache || {};

        // Rebuild access times
        this.accessTimes.clear();
        Object.entries(this.cache).forEach(([locale, namespaces]) => {
          Object.keys(namespaces).forEach(namespace => {
            const key = this.getCacheKey(locale, namespace);
            this.accessTimes.set(key, Date.now());
          });
        });
      }
    } catch (error) {
      console.warn('Failed to load translation cache from storage:', error);
      this.clearStorage();
    }
  }

  // Save cache to localStorage
  private saveToStorage(): void {
    if (!this.config.persistToStorage || typeof window === 'undefined') return;

    try {
      const toStore = {
        cache: this.cache,
        timestamp: Date.now(),
        version: '1.0.0'
      };
      localStorage.setItem(this.config.storageKey, JSON.stringify(toStore));
    } catch (error) {
      console.warn('Failed to save translation cache to storage:', error);
    }
  }

  // Clear storage
  private clearStorage(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.config.storageKey);
  }

  // Get cache statistics
  public getStats(): {
    totalEntries: number;
    cacheHitRate: number;
    oldestEntry: number;
    newestEntry: number;
    memoryUsage: number;
  } {
    const totalEntries = Object.values(this.cache).reduce(
      (sum, localeCache) => sum + Object.keys(localeCache).length,
      0
    );

    const accessTimesArray = Array.from(this.accessTimes.values());
    const oldestEntry = Math.min(...accessTimesArray) || 0;
    const newestEntry = Math.max(...accessTimesArray) || 0;

    // Estimate memory usage (rough calculation)
    const memoryUsage = JSON.stringify(this.cache).length * 2; // 2 bytes per character

    return {
      totalEntries,
      cacheHitRate: 0, // Would need hit/miss tracking to calculate
      oldestEntry,
      newestEntry,
      memoryUsage
    };
  }
}

// Singleton cache instance
export const translationCache = new TranslationCacheManager();

// Performance monitoring hook
export function useI18nPerformance() {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
    totalTranslations: 0
  });

  const measureLoadTime = useCallback(async (operation: () => Promise<any>) => {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();

    setMetrics(prev => ({
      ...prev,
      loadTime: endTime - startTime
    }));

    return result;
  }, []);

  const updateCacheStats = useCallback(() => {
    const stats = translationCache.getStats();
    setMetrics(prev => ({
      ...prev,
      cacheHitRate: stats.cacheHitRate,
      memoryUsage: stats.memoryUsage,
      totalTranslations: stats.totalEntries
    }));
  }, []);

  useEffect(() => {
    updateCacheStats();
  }, [updateCacheStats]);

  return {
    metrics,
    measureLoadTime,
    updateCacheStats,
    clearCache: () => translationCache.clear()
  };
}

// Lazy loading utilities
export class LazyTranslationLoader {
  private loadingPromises: Map<string, Promise<any>> = new Map();
  private loadedNamespaces: Set<string> = new Set();

  constructor(
    private baseUrl = '/locales',
    private cache = translationCache
  ) {}

  // Load translation namespace with caching
  async loadNamespace(locale: string, namespace: string): Promise<any> {
    const cacheKey = `${locale}:${namespace}`;

    // Check cache first
    const cached = this.cache.get(locale, namespace);
    if (cached) {
      return cached;
    }

    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    // Start loading
    const loadPromise = this.fetchTranslation(locale, namespace);
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      const translation = await loadPromise;

      // Cache the result
      this.cache.set(locale, namespace, translation);
      this.loadedNamespaces.add(cacheKey);

      return translation;
    } catch (error) {
      console.error(`Failed to load translation ${locale}/${namespace}:`, error);
      throw error;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  // Fetch translation from server
  private async fetchTranslation(locale: string, namespace: string): Promise<any> {
    const url = `${this.baseUrl}/${locale}/${namespace}.json`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'max-age=3600' // 1 hour browser cache
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Preload critical namespaces
  async preloadCritical(locale: string, namespaces: string[]): Promise<void> {
    const promises = namespaces.map(namespace =>
      this.loadNamespace(locale, namespace).catch(error => {
        console.warn(`Failed to preload ${locale}/${namespace}:`, error);
      })
    );

    await Promise.allSettled(promises);
  }

  // Check if namespace is loaded
  isLoaded(locale: string, namespace: string): boolean {
    const cacheKey = `${locale}:${namespace}`;
    return this.loadedNamespaces.has(cacheKey) ||
           this.cache.get(locale, namespace) !== null;
  }

  // Get loading status
  isLoading(locale: string, namespace: string): boolean {
    const cacheKey = `${locale}:${namespace}`;
    return this.loadingPromises.has(cacheKey);
  }
}

// Singleton loader instance
export const translationLoader = new LazyTranslationLoader();

// Prefetch hook for route-based translation loading
export function usePrefetchTranslations(
  route: string,
  locale: string,
  namespaces: string[]
) {
  useEffect(() => {
    // Prefetch translations when route changes
    translationLoader.preloadCritical(locale, namespaces);
  }, [route, locale, namespaces]);
}

// Bundle splitting utilities
export const getBundleForRoute = (route: string): string[] => {
  const routeBundles: Record<string, string[]> = {
    '/dashboard': ['common', 'dashboard', 'navigation'],
    '/chatbots': ['common', 'chatbot', 'navigation', 'form'],
    '/products': ['common', 'product', 'navigation'],
    '/documents': ['common', 'document', 'navigation'],
    '/analytics': ['common', 'analytics', 'navigation'],
    '/settings': ['common', 'settings', 'navigation'],
    '/admin': ['common', 'admin', 'navigation'],
    '/auth': ['common', 'auth', 'form']
  };

  return routeBundles[route] || ['common', 'navigation'];
};

export default {
  TranslationCacheManager,
  translationCache,
  translationLoader,
  LazyTranslationLoader,
  useI18nPerformance,
  usePrefetchTranslations,
  getBundleForRoute
};