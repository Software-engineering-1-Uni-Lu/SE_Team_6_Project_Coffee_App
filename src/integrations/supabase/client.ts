import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Singleton Supabase client instance for browser use.
 *
 * Uses createClient from @supabase/supabase-js (not createBrowserClient from @supabase/ssr)
 * to match the React app implementation. This ensures guest orders work correctly
 * when user is null - the client naturally has no session, so auth.uid() IS NULL.
 *
 * IMPORTANT: This is a singleton to avoid multiple GoTrueClient instances.
 * All components should use this same instance.
 */
let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  // Return singleton instance if it exists
  if (supabaseClient) {
    return supabaseClient;
  }

  // Create singleton instance
  supabaseClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage:
          typeof window !== "undefined" ? window.localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );

  return supabaseClient;
}
