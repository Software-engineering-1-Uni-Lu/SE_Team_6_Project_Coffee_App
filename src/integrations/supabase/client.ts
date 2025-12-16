import { createBrowserClient } from "@supabase/ssr";

/**
 * Singleton Supabase client instance for browser use.
 *
 * CRITICAL: Uses createBrowserClient from @supabase/ssr to read cookies set by server.
 * This ensures the client can see the session cookie set during login.
 *
 * The SSR version reads from cookies (set by server) instead of localStorage,
 * which is essential for server-side authentication to work with client-side code.
 *
 * IMPORTANT: This is a singleton to avoid multiple GoTrueClient instances.
 * All components should use this same instance.
 */
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  // Return singleton instance if it exists
  if (supabaseClient) {
    return supabaseClient;
  }

  // Create singleton instance using SSR browser client
  // This reads cookies set by the server during login
  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return supabaseClient;
}
