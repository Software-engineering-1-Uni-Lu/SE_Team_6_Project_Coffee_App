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
import {
  getUserRole,
  isBlocked,
  isValidRole,
  type UserRole,
} from "@/src/lib/auth-utils";

// Re-export utilities for convenience
export { getUserRole, isBlocked, isValidRole, type UserRole };

/**
 * Standard error response for authentication failures
 */
export interface AuthError {
  error: string;
  code?: string;
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

  // Check if user has required role
  const userRole = getUserRole(user);
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
 * - Admin/Staff → /admin (or /staff if you have separate dashboards)
 * - Customer → / (home page)
 * - No user → /auth/login
 *
 * @param user - Supabase User object or null
 * @returns string - Path to redirect to
 */
export function getRedirectPath(user: User | null): string {
  if (!user) {
    return "/auth/login";
  }

  // Blocked users always go to blocked page
  if (isBlocked(user)) {
    return "/blocked";
  }

  const role = getUserRole(user);

  switch (role) {
    case "admin":
    case "staff":
      return "/admin";
    case "customer":
    default:
      return "/";
  }
}
