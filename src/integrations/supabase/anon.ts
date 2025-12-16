/**
 * Anonymous Supabase Client
 *
 * PURPOSE:
 * Creates a Supabase client with ABSOLUTELY NO authentication session.
 * Use this for guest operations that require TO anon RLS policies.
 *
 * WHY THIS IS NEEDED:
 * - The "Guests can create orders" RLS policy uses TO anon
 * - TO anon policies only match when auth.uid() IS NULL
 * - Server-side clients might maintain auth context from cookies
 * - This client explicitly has no auth session, ensuring auth.uid() IS NULL
 *
 * USAGE:
 * - Use for guest order creation
 * - Use for any operation that requires anonymous access
 */

import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with ABSOLUTELY NO authentication
 * Explicitly clears any session to ensure TO anon policy matches
 *
 * CRITICAL: This uses createClient (NOT createServerClient) to avoid
 * reading cookies from the request. Server-side clients might inherit
 * auth context from cookies, which would break the TO anon policy.
 */
export function createAnonClient() {
  // Clear any stored Supabase sessions from browser storage
  // This ensures we start with a completely clean slate
  if (typeof window !== "undefined") {
    try {
      // Clear localStorage Supabase keys
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.includes("supabase") || key.includes("sb-")) {
          localStorage.removeItem(key);
        }
      });
      // Clear sessionStorage Supabase keys
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach((key) => {
        if (key.includes("supabase") || key.includes("sb-")) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {
      // Ignore storage errors
    }
  }

  // Create client with minimal config - let Supabase handle headers
  // Key: no session persistence, no storage access
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        // Explicitly don't use any storage - ensures no session can be loaded
        storage: {
          getItem: () => null, // Never return any stored session
          setItem: () => {}, // Never store sessions
          removeItem: () => {}, // Never remove (nothing to remove)
        },
      },
      // Don't override fetch - let Supabase handle headers correctly
      // The anon key is passed to createClient, so it will be used automatically
    }
  );

  // Explicitly clear any potential session immediately
  // This ensures auth.uid() will be NULL
  client.auth.setSession(null as any).catch(() => {
    // Ignore errors - session might already be null
  });

  return client;
}
