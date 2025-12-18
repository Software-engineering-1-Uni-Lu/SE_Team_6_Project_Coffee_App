/**
 * Staff Management Page - /admin/staff
 *
 * PURPOSE:
 * Main page for managers and admins to manage staff accounts, view details,
 * edit information, block/unblock users, and generate invite codes.
 *
 * USER STORIES SATISFIED:
 * - CSA-132: Browse staff accounts
 * - CSA-133: View & edit staff account details
 * - CSA-134: Add or remove staff accounts
 *
 * PERMISSIONS:
 * - Managers: Can only view/manage staff (not other managers or admins)
 * - Admins: Can view/manage staff, managers, and admins
 *
 * ARCHITECTURE:
 * - Server Component: Handles auth, role checks, initial data fetching
 * - Client Component: Handles all interactive UI (table, modals, actions)
 */

import StaffManagementClient from "@/src/components/admin/staff/StaffManagementClient";

/**
 * Staff Management Page - /admin/staff
 *
 * AUTHENTICATION & AUTHORIZATION:
 * The middleware ensures only managers and admins can access this page.
 * The client component will fetch role-specific data based on the user's role.
 */
export default async function StaffManagementPage() {
  // Middleware guarantees user is authenticated and is manager/admin
  // No need for server-side auth checks - they cause "Auth session missing!" errors

  // Client component will handle data fetching based on role
  return <StaffManagementClient />;
}
