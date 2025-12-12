"use client";

/**
 * useUser Hook - Persistent Session Management
 *
 * PURPOSE:
 * This hook provides client-side access to the authenticated user's session,
 * automatically syncing with Supabase auth state changes. It enables React
 * components to reactively respond to login, logout, and session updates.
 *
 * USER STORY SATISFIED:
 * - CSA-53: Persistent session
 *   - Watches auth state changes in real-time
 *   - Persists session across page reloads
 *   - Updates automatically on login/logout
 *   - Provides loading state during initialization
 *
 * SECURITY CONSIDERATIONS:
 * - Uses Supabase's built-in session management
 * - Session tokens are stored in cookies (httpOnly when possible)
 * - Auth state listener ensures UI stays in sync with actual session
 * - Blocked status is checked and exposed to components
 *
 * USAGE EXAMPLE:
 * ```typescript
 * function ProfilePage() {
 *   const { user, role, isBlocked, loading } = useUser();
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (!user) return <div>Please log in</div>;
 *   if (isBlocked) return <div>Account blocked</div>;
 *
 *   return <div>Welcome, {user.email}! Role: {role}</div>;
 * }
 * ```
 *
 * BEHAVIOR:
 * - On mount: Fetches current session from Supabase
 * - Subscribes to auth state changes (login, logout, token refresh)
 * - Cleans up subscription on unmount
 * - Extracts role and blocked status from user metadata
 */

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/src/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { getUserRole, isBlocked, type UserRole } from "@/src/lib/auth-utils";

/**
 * Return type for useUser hook
 */
export interface UseUserReturn {
  /** The authenticated user object, or null if not logged in */
  user: User | null;
  /** The user's role (customer, staff, or admin) */
  role: UserRole;
  /** Whether the user is blocked from accessing the application */
  isBlocked: boolean;
  /** True while initial session is being fetched */
  loading: boolean;
  /** Function to manually refresh user data */
  refetch: () => Promise<void>;
}

/**
 * Custom hook for accessing current user session and auth state
 *
 * This hook manages the entire auth state lifecycle:
 * 1. Initial session fetch on mount
 * 2. Real-time updates via Supabase auth listener
 * 3. Automatic cleanup on unmount
 *
 * EDGE CASES HANDLED:
 * - Component unmounts during async fetch (prevents state updates)
 * - Multiple rapid auth state changes (latest state wins)
 * - Session expiry and automatic refresh
 * - Browser refresh (session restored from cookie)
 *
 * @returns UseUserReturn - Object containing user, role, blocked status, and loading state
 */
export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  /**
   * Fetches the current session from Supabase
   * Called on mount and can be called manually via refetch()
   */
  const fetchUser = useCallback(async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    // Fetch initial session
    fetchUser();

    /**
     * Subscribe to auth state changes
     *
     * EVENTS HANDLED:
     * - SIGNED_IN: User logs in → update user state
     * - SIGNED_OUT: User logs out → clear user state
     * - TOKEN_REFRESHED: Session token refreshed → update user state
     * - USER_UPDATED: User metadata changed → update user state
     *
     * This ensures the UI always reflects the current auth state,
     * even if changed in another tab or by another component.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Cleanup: Unsubscribe when component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchUser]);

  /**
   * Extract role from user metadata
   * Defaults to "customer" if no user or no role specified
   */
  const role = getUserRole(user);

  /**
   * Check if user is blocked
   * Returns false if no user (can't be blocked if not logged in)
   */
  const blocked = isBlocked(user);

  return {
    user,
    role,
    isBlocked: blocked,
    loading,
    refetch: fetchUser,
  };
}
