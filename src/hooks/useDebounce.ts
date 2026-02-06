import { useState, useEffect } from "react";

/**
 * useDebounce Hook
 *
 * PURPOSE:
 * Delays updating a value until after a specified delay has passed since the last change.
 * Prevents excessive re-renders and API calls during rapid user input.
 *
 * FEATURE: CSA-207 - Search & Filter Staff Accounts
 *
 * USAGE:
 * ```typescript
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedSearch = useDebounce(searchQuery, 300);
 *
 * // debouncedSearch only updates 300ms after user stops typing
 * ```
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up timeout to update debounced value
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up timeout if value changes before delay expires
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
