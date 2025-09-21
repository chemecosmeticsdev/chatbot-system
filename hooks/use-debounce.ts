import { useState, useEffect } from 'react';

/**
 * useDebounce hook
 *
 * Debounces a value by delaying its update until after a specified delay period.
 * Useful for search inputs, API calls, and other scenarios where you want to
 * limit the frequency of updates.
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if value changes before the delay is reached
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebounceCallback hook
 *
 * Debounces a callback function to prevent it from being called too frequently.
 *
 * @param callback - The callback function to debounce
 * @param delay - The delay in milliseconds
 * @param dependencies - Dependencies array for the callback
 * @returns The debounced callback function
 */
export function useDebounceCallback(
  callback: (...args: any[]) => void,
  delay: number,
  dependencies: any[] = []
) {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clean up timer on unmount or dependency change
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, dependencies);

  const debouncedCallback = (...args: any[]) => {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer
    const newTimer = setTimeout(() => {
      callback(...args);
    }, delay);

    setDebounceTimer(newTimer);
  };

  return debouncedCallback;
}