/**
 * Client-Safe Authentication Utilities
 *
 * PURPOSE:
 * Pure utility functions for authentication that can be safely imported
 * in both client and server components. These functions only process
 * User objects and do not interact with any server-side APIs.
 *
 * USAGE:
 * - Import these in client components (via hooks like useUser)
 * - Also used by server-side auth.ts for consistency
 *
 * ROLE MODEL:
 * - customer: Default role, browses menu, places orders
 * - staff: Operational role, processes orders at preparation station
 * - manager: Management role, same dashboard as admin but fewer permissions
 * - admin: Full system access, user management, system configuration
 */

import type { User } from "@supabase/supabase-js";

/**
 * Valid user roles in the application
 *
 * HIERARCHY:
 * - customer: Limited to customer features
 * - staff: Access to operational/preparation dashboard
 * - manager: Access to management dashboard (same as admin)
 * - admin: Full access to all features
 */
export type UserRole = "customer" | "staff" | "manager" | "admin";

/**
 * Extracts the user's role from their metadata
 *
 * @param user - Supabase User object
 * @returns UserRole - The user's role, defaulting to "customer"
 */
export function getUserRole(user: User | null): UserRole {
  if (!user) return "customer";

  const role = user.user_metadata?.role;

  if (role === "staff" || role === "manager" || role === "admin") {
    return role;
  }

  return "customer";
}

/**
 * Checks if a user is blocked from accessing the application
 *
 * @param user - Supabase User object
 * @returns boolean - true if user is blocked, false otherwise
 */
export function isBlocked(user: User | null): boolean {
  if (!user) return false;
  return user.user_metadata?.blocked === true;
}

/**
 * Validates if a role string is a valid UserRole
 *
 * @param role - String to validate
 * @returns boolean - true if valid role
 */
export function isValidRole(role: string): role is UserRole {
  return (
    role === "customer" ||
    role === "staff" ||
    role === "manager" ||
    role === "admin"
  );
}
