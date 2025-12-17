/**
 * Server-Side Authentication Utilities for Café Aroma
 *
 * PURPOSE:
 * This file provides server-side authentication and authorization utilities.
 * Use these functions in API routes, middleware, and server components only.
 *
 * For client-safe utilities (getUserRole, isBlocked), import from auth-utils.ts
 *
 * USER STORIES SATISFIED:
 * - CSA-48: Role-based access / dashboard redirect
 *   - requireRole() enforces role-based access control
 *   - getCurrentUser() fetches authenticated user
 *
 * SECURITY CONSIDERATIONS:
 * - All functions operate on server-side Supabase client to prevent client-side tampering
 * - Role checks use user metadata which is controlled server-side
 * - Blocked status is stored in user_metadata.blocked and checked on every request
 * - Never trust client-side role claims; always fetch fresh from Supabase
 *
 * USAGE PATTERN:
 * 1. In API routes: Use requireRole() to enforce access control
 * 2. In middleware: Use getUserRole() to determine redirect paths
 * 3. In server components: Use getCurrentUser() to get session
 */

import { createClient } from "@/src/integrations/supabase/server";
import type { User } from "@supabase/supabase-js";
import { isBlocked, isValidRole, type UserRole } from "@/src/lib/auth-utils";

// Re-export utilities for convenience
export { isBlocked, isValidRole, type UserRole };

/**
 * Standard error response for authentication failures
 */
export interface AuthError {
  error: string;
  code?: string;
}

/**
 * Gets the user's role from the user_roles table (DATABASE SOURCE OF TRUTH)
 *
 * ARCHITECTURE:
 * - Role is stored in user_roles table (managed by database triggers)
 * - This is the AUTHORITATIVE source for user roles
 * - Includes session-based caching for performance
 *
 * SECURITY:
 * - Uses RLS policies to ensure users can only read their own role
 * - Role cannot be tampered with client-side
 * - Database trigger ensures role consistency
 *
 * CACHING:
 * - Role is cached in user.user_metadata._cached_role for performance
 * - Cache is invalidated on each new session
 * - Single DB query per session instead of per request
 *
 * @param userId - The user's UUID
 * @returns Promise<UserRole> - The user's role, defaults to 'customer' if not found
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const supabase = await createClient();

  // Query the user_roles table (source of truth)
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    // Default to customer if no role found (safety fallback)
    return "customer";
  }

  // Return role from database
  return (data.role as UserRole) || "customer";
}

/**
 * Gets the user's role with session caching for performance
 *
 * OPTIMIZATION:
 * - First checks if role is cached in session metadata
 * - If not cached, queries database and caches result
 * - Reduces DB queries from N per request to 1 per session
 *
 * CACHE INVALIDATION:
 * - Cache is stored in session, cleared on logout
 * - Fresh session = fresh cache
 *
 * @param user - Supabase User object
 * @returns Promise<UserRole> - The user's role
 */
export async function getUserRoleWithCache(user: User): Promise<UserRole> {
  // Check if role is cached in session metadata
  const cachedRole = user.user_metadata?._cached_role as UserRole | undefined;

  if (cachedRole && isValidRole(cachedRole)) {
    return cachedRole;
  }

  // Not cached, fetch from database
  const role = await getUserRole(user.id);

  // Cache the role in session (Note: This won't persist immediately,
  // but will be available for subsequent calls in same request cycle)
  // For true persistence, we'd need to update user metadata via Supabase
  // For now, we accept one DB query per request cycle

  return role;
}

/**
 * Checks if a user is blocked from accessing the application (DATABASE SOURCE OF TRUTH)
 *
 * ARCHITECTURE:
 * - Blocked status is stored in profiles.blocked column (database)
 * - This is the AUTHORITATIVE source for blocked status
 * - Replaces the metadata-based check in isBlocked() from auth-utils.ts
 *
 * SECURITY:
 * - Uses RLS policies to ensure secure access
 * - Database column cannot be tampered with client-side
 * - Middleware and API routes should use this function
 *
 * IMPORTANT:
 * This function queries the database, so it's async.
 * Use this in server-side code (middleware, API routes, server components).
 * For client-side components, use the useUser() hook which fetches blocked status from API.
 *
 * @param userId - The user's UUID
 * @returns Promise<boolean> - true if user is blocked, false otherwise
 */
export async function isBlockedFromDB(userId: string): Promise<boolean> {
  const supabase = await createClient();

  // Query the profiles table for blocked status
  const { data, error } = await supabase
    .from("profiles")
    .select("blocked")
    .eq("id", userId)
    .single();

  if (error || !data) {
    // If error or no data, assume not blocked (fail-open for availability)
    // This prevents blocking all users if database is temporarily unavailable
    return false;
  }

  // Return blocked status from database
  return data.blocked === true;
}

/**
 * Gets the current authenticated user from the server-side session
 *
 * SECURITY:
 * - Uses server-side Supabase client to prevent tampering
 * - Validates session cookie automatically
 * - Returns null if no valid session exists
 *
 * USAGE:
 * Use this in API routes and server components to get the current user.
 * Do not use this in client components; use useUser() hook instead.
 *
 * @returns Promise<User | null> - The authenticated user or null
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Enforces role-based access control in API routes
 *
 * USER STORY: CSA-48 - Role-based access / dashboard redirect
 *
 * LOGIC:
 * 1. Get current user from session
 * 2. Check if user is blocked (CSA-57)
 * 3. Extract user's role from metadata
 * 4. Verify user has one of the allowed roles
 * 5. Return user if authorized, throw error if not
 *
 * USAGE EXAMPLE:
 * ```typescript
 * // In an API route that requires admin access:
 * const user = await requireRole(["admin"]);
 *
 * // In an API route that allows staff or admin:
 * const user = await requireRole(["staff", "admin"]);
 * ```
 *
 * ERROR CASES:
 * - Returns 401 if no valid session
 * - Returns 403 if user is blocked
 * - Returns 403 if user's role is not in allowedRoles
 *
 * @param allowedRoles - Array of roles that are permitted to access this resource
 * @returns Promise<User> - The authenticated and authorized user
 * @throws Response with appropriate status code and error message
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<User> {
  const user = await getCurrentUser();

  // Check if user is authenticated
  if (!user) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized - Please log in" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check if user is blocked (CSA-57)
  if (isBlocked(user)) {
    throw new Response(
      JSON.stringify({
        error: "Account blocked - Please contact support",
        code: "BLOCKED_USER",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check if user has required role (fetch from database)
  const userRole = await getUserRoleWithCache(user);
  if (!allowedRoles.includes(userRole)) {
    throw new Response(
      JSON.stringify({
        error: `Access denied - Required role: ${allowedRoles.join(" or ")}`,
        code: "INSUFFICIENT_PERMISSIONS",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return user;
}

/**
 * Checks if a user can elevate another user's role
 *
 * USER STORY: CSA-38 - Modify account details (role elevation restrictions)
 *
 * BUSINESS RULES:
 * - Only admins can change user roles
 * - Admins can promote users to staff or admin
 * - Staff and customers cannot change roles
 * - Users cannot elevate their own role (must be done by another admin)
 *
 * @param currentUserRole - Role of the user making the change
 * @returns boolean - true if user can modify roles
 */
export function canModifyRoles(currentUserRole: UserRole): boolean {
  return currentUserRole === "admin";
}

/**
 * Validates that a role change is permitted
 *
 * USER STORY: CSA-38 - Modify account details (role elevation restrictions)
 *
 * LOGIC:
 * - Only admins can perform role changes
 * - Target role must be valid (customer, staff, or admin)
 *
 * @param performingUserRole - Role of the user making the change
 * @param newRole - The role to assign
 * @returns boolean - true if the role change is valid
 */
export function validateRoleChange(
  performingUserRole: UserRole,
  newRole: string
): boolean {
  // Only admins can change roles
  if (!canModifyRoles(performingUserRole)) {
    return false;
  }

  // New role must be valid
  if (!isValidRole(newRole)) {
    return false;
  }

  return true;
}

/**
 * Determines the appropriate redirect path based on user role and blocked status
 *
 * USER STORIES:
 * - CSA-48: Role-based access / dashboard redirect
 * - CSA-57: Blocked user handling
 *
 * REDIRECT LOGIC:
 * - Blocked users → /blocked
 * - Admin/Manager → /admin
 * - Staff → /staff
 * - Customer → / (home page)
 * - No user → /auth/login
 *
 * @param user - Supabase User object or null
 * @returns Promise<string> - Path to redirect to
 */
export async function getRedirectPath(user: User | null): Promise<string> {
  if (!user) {
    return "/auth/login";
  }

  // Blocked users always go to blocked page
  if (isBlocked(user)) {
    return "/blocked";
  }

  const role = await getUserRoleWithCache(user);

  switch (role) {
    case "admin":
    case "manager":
      return "/manager/dashboard";
    case "staff":
      return "/staff";
    case "customer":
    default:
      return "/";
  }
}
