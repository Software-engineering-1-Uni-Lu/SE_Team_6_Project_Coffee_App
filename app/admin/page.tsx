/**
 * Admin Dashboard Page - /admin
 *
 * ============================================================================
 * PURPOSE:
 * ============================================================================
 * This is the comprehensive management dashboard for users with the "admin" role.
 * It serves as the landing page after admin login and provides access to both
 * operational tools (like staff dashboard) AND administrative functions
 * (user management, settings, analytics).
 *
 * ============================================================================
 * USER STORIES SATISFIED:
 * ============================================================================
 * - CSA-48: Role-based access / dashboard redirect
 *   - Admins land here after login
 *   - Only accessible to users with "admin" role
 *   - Redirects non-admins to their appropriate dashboards
 *
 * ============================================================================
 * ROLE-BASED ROUTING ARCHITECTURE:
 * ============================================================================
 * This page is part of a three-tier dashboard system:
 * 1. /customer - Customer dashboard (ordering)
 * 2. /staff - Staff dashboard (operations)
 * 3. /admin - Admin dashboard (this file - management + operations)
 *
 * ROUTING FLOW:
 * - Login → Check role → Redirect to /admin (if admin)
 * - Middleware protects this route (admin only)
 * - Customers and staff attempting to access are redirected away
 *
 * ADMIN ACCESS HIERARCHY:
 * - Admins can access /admin (this page)
 * - Admins can also access /staff (operations)
 * - Admins have full system access (all features)
 *
 * ============================================================================
 * FOR UI DEVELOPERS - IMPLEMENTATION GUIDE:
 * ============================================================================
 *
 * CURRENT STATE (SCAFFOLD):
 * This page currently contains only placeholder UI. The authentication and
 * role checking logic is PRODUCTION-READY and must NOT be modified.
 *
 * WHAT TO BUILD HERE:
 * Replace the placeholder <main> content with:
 *
 * 1. **Navigation/Header:**
 *    - Logo linking to /admin
 *    - Primary nav: Dashboard, Orders, Menu, Users, Settings, Reports
 *    - Secondary nav: View as Staff (link to /staff dashboard)
 *    - User greeting with admin badge
 *    - Logout button
 *
 * 2. **Dashboard Overview (Main Content):**
 *    a) Key Metrics Cards (Top Row)
 *       - Today's revenue (total sales in cents → dollars)
 *       - Orders today (count by status)
 *       - Active users (customers online)
 *       - Staff on duty (staff members logged in)
 *
 *    b) Quick Actions Panel
 *       - Manage Menu Items → /admin/menu
 *       - Manage Users → /admin/users
 *       - View Reports → /admin/reports
 *       - System Settings → /admin/settings
 *       - Order Queue (Staff View) → /staff
 *
 *    c) Real-Time Order Monitor
 *       - Live feed of recent orders
 *       - Order status distribution chart
 *       - Peak hours analytics
 *       - Alert indicators for issues
 *
 *    d) User Management Summary
 *       - Total users by role (customers, staff, admins)
 *       - New registrations today
 *       - Blocked users count
 *       - Quick action: Block/Unblock users
 *
 *    e) System Health Indicators
 *       - Database connection status
 *       - Recent errors/issues count
 *       - Backup status
 *       - Inventory alerts (low stock items)
 *
 * 3. **Data Fetching Pattern:**
 *    ```typescript
 *    // Admin dashboard requires aggregated data
 *    const supabase = createClient();
 *
 *    // Today's orders
 *    const { count: ordersToday } = await supabase
 *      .from('orders')
 *      .select('*', { count: 'exact', head: true })
 *      .gte('created_at', startOfToday);
 *
 *    // Revenue today
 *    const { data: orders } = await supabase
 *      .from('orders')
 *      .select('total_cents')
 *      .gte('created_at', startOfToday)
 *      .eq('status', 'completed');
 *    const revenue = orders?.reduce((sum, o) => sum + o.total_cents, 0) ?? 0;
 *
 *    // User counts by role
 *    const { data: userStats } = await supabase
 *      .from('profiles')
 *      .select('id')
 *      .then(async ({ data }) => {
 *        const users = data || [];
 *        // Get user metadata from auth.users (requires service role)
 *        // Or maintain role counts in profiles table
 *      });
 *    ```
 *
 * 4. **Component Structure:**
 *    - Main page: Server Component (for auth and initial data)
 *    - Metrics cards: Server Component (static data)
 *    - Real-time monitors: Client Component (subscriptions)
 *    - Charts/graphs: Client Component (recharts or similar)
 *    - Admin action buttons: Client Component (API calls)
 *
 * 5. **Admin-Specific Features:**
 *    - User management (view, edit roles, block/unblock)
 *    - Menu management (create, edit, delete items/categories)
 *    - Settings management (operational hours, loyalty rates)
 *    - Reports and analytics (sales, popular items, trends)
 *    - Order management (view all orders, issue refunds)
 *    - Staff management (add/remove staff, assign roles)
 *    - System configuration (email templates, notifications)
 *
 * ============================================================================
 * ARCHITECTURAL CONSTRAINTS - DO NOT VIOLATE:
 * ============================================================================
 *
 * ✅ KEEP THESE:
 * - Server-side role check (getCurrentUser + getUserRole)
 * - Redirect logic for non-admins
 * - Blocked user check
 * - Import structure (@/src/...)
 *
 * ❌ DO NOT:
 * - Remove authentication checks
 * - Allow staff or customers to access admin features
 * - Bypass middleware protection
 * - Use client-side role checks as primary security
 * - Expose sensitive configuration to non-admins
 *
 * ============================================================================
 * SECURITY CONSIDERATIONS:
 * ============================================================================
 * - This page uses server-side authentication (getCurrentUser)
 * - Role is verified before rendering (getUserRole)
 * - Middleware provides first layer of defense
 * - This page provides second layer
 * - Row-Level Security (RLS) on database controls data access
 * - Admin has full access but actions are still audited
 * - Sensitive operations require additional confirmation
 *
 * RLS POLICIES TO EXPECT:
 * - orders: Admin can SELECT, UPDATE, DELETE (full access)
 * - items: Admin can INSERT, UPDATE, DELETE (full control)
 * - categories: Admin can INSERT, UPDATE, DELETE
 * - profiles: Admin can SELECT, UPDATE (for user management)
 * - settings: Admin can SELECT, UPDATE
 *
 * ADMIN PERMISSIONS:
 * ✅ Can: Everything (full system access)
 * ⚠️ Should confirm: Destructive operations (delete user, delete order, system settings changes)
 * 🔒 Audit: All admin actions should be logged
 *
 * ============================================================================
 * SUPABASE DATA FETCHING PATTERN:
 * ============================================================================
 * Admin queries often need aggregated or system-wide data:
 *
 * ```typescript
 * import { createClient } from "@/src/integrations/supabase/server";
 *
 * const supabase = createClient();
 *
 * // Get all orders with customer info
 * const { data: orders } = await supabase
 *   .from('orders')
 *   .select(`
 *     *,
 *     customer:profiles(full_name, email, phone),
 *     items:order_items(*, item:items(name))
 *   `)
 *   .order('created_at', { ascending: false })
 *   .limit(50);
 *
 * // Get user statistics
 * const { count: totalCustomers } = await supabase
 *   .from('profiles')
 *   .select('*', { count: 'exact', head: true });
 *
 * // For role-specific counts, you may need to query auth.users
 * // which requires service role key (used in API routes, not direct queries)
 * ```
 *
 * For sensitive operations, create API routes that use service role:
 * ```typescript
 * // app/api/admin/users/route.ts
 * const supabaseAdmin = createClient(); // with service role
 * const { data: users } = await supabaseAdmin.auth.admin.listUsers();
 * ```
 *
 * ============================================================================
 * FILE STRUCTURE FOR ADMIN FEATURES:
 * ============================================================================
 * Organize admin components as:
 *
 * app/admin/
 *   page.tsx          ← This file (main dashboard)
 *   menu/
 *     page.tsx        ← Menu management (items, categories)
 *     items/
 *       new/page.tsx  ← Create new menu item
 *       [id]/page.tsx ← Edit menu item
 *   users/
 *     page.tsx        ← User management (list, search)
 *     [id]/page.tsx   ← Edit user (role, block/unblock)
 *   orders/
 *     page.tsx        ← All orders (searchable, filterable)
 *     [id]/page.tsx   ← Order details with refund option
 *   reports/
 *     page.tsx        ← Analytics and reports
 *   settings/
 *     page.tsx        ← System settings
 *   layout.tsx        ← Shared admin layout (nav, sidebar)
 *
 * src/components/admin/
 *   MetricCard.tsx     ← Reusable metric display
 *   UserTable.tsx      ← User management table
 *   OrderChart.tsx     ← Order analytics chart
 *   MenuItemForm.tsx   ← Menu item create/edit form
 *   SettingsPanel.tsx  ← Settings section component
 *
 * ============================================================================
 * NAVIGATION FLOW:
 * ============================================================================
 * Admin users can access:
 * - /admin (this page) - Main admin dashboard
 * - /admin/* - All admin features
 * - /staff - Staff operational dashboard (admin helping with operations)
 * - /customer - Customer view (admin testing customer experience)
 * - /auth/profile - Own account settings
 *
 * Admin users have NO restrictions (full system access)
 *
 * ============================================================================
 * ANALYTICS & REPORTING FEATURES:
 * ============================================================================
 * Admin dashboard should display:
 * - Revenue metrics (daily, weekly, monthly)
 * - Order statistics (count, average value, status distribution)
 * - Popular items (top 10 by order count)
 * - Customer metrics (new signups, active users, retention)
 * - Staff performance (orders processed per staff member)
 * - Peak hours analysis (busy times for staffing)
 * - Inventory alerts (items running low)
 * - System health (errors, downtime, response times)
 *
 * Use charting libraries:
 * - recharts (recommended for Next.js)
 * - Chart.js
 * - D3.js (for complex visualizations)
 *
 * ============================================================================
 * TESTING CHECKLIST FOR UI DEVELOPERS:
 * ============================================================================
 * After implementing UI:
 * - [ ] Dashboard loads for logged-in admins
 * - [ ] Non-admins are redirected
 * - [ ] All metrics display correctly
 * - [ ] Links to admin features work
 * - [ ] User management features work
 * - [ ] Menu management features work
 * - [ ] Reports generate correctly
 * - [ ] Settings can be updated
 * - [ ] Audit logs capture admin actions
 * - [ ] Confirmation dialogs for destructive operations
 * - [ ] Mobile responsive (though admins likely use desktop)
 * - [ ] Accessibility (WCAG 2.1 AA compliance)
 */

import { redirect } from "next/navigation";
import { createClient } from "@/src/integrations/supabase/server";
import { getCurrentUser, getUserRole, isBlocked } from "@/src/lib/auth";

/**
 * Admin Dashboard Page (Server Component)
 *
 * This is a Server Component that performs authentication and role checks
 * before rendering. DO NOT convert to Client Component.
 *
 * For interactive features (charts, tables, actions), create separate
 * Client Components and import them here.
 */
export default async function AdminDashboardPage() {
  /**
   * AUTHENTICATION CHECK
   *
   * Get current user from server-side session.
   * If no user, middleware should have redirected, but we verify again.
   */
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  /**
   * BLOCKED USER CHECK
   *
   * Even admins can be blocked (by other admins).
   */
  if (isBlocked(user)) {
    redirect("/blocked");
  }

  /**
   * ROLE AUTHORIZATION CHECK
   *
   * This page is for admins and managers ONLY.
   * Staff and customers are redirected to their dashboards.
   */
  const role = await getUserRole(user.id);

  if (role !== "admin" && role !== "manager") {
    // Redirect based on role
    if (role === "staff") {
      redirect("/staff");
    } else {
      redirect("/customer");
    }
  }

  /**
   * ========================================================================
   * UI DEVELOPER: Replace content below this line
   * ========================================================================
   *
   * KEEP THE ABOVE: Authentication and role checks are production-ready
   * REPLACE BELOW: This is placeholder UI only
   *
   * Guidelines:
   * - Fetch system-wide data here (all orders, user counts, revenue)
   * - Use Supabase server client for initial aggregated data
   * - Create Client Components for interactive features
   * - Implement real-time monitoring where needed
   * - Add charts and visualizations
   * - Ensure all admin actions go through API routes (audit logging)
   * - Use semantic HTML for accessibility
   * - Follow coffee theme from globals.css
   */

  return (
    <div className="min-h-screen bg-background">
      {/* Header placeholder - Replace with actual navigation component */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-foreground">
                Café Aroma - Admin Portal
              </h1>
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Admin
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {user.user_metadata?.full_name || user.email}
              </span>
              {/* TODO: Add logout button component here */}
            </div>
          </div>
        </div>
      </header>

      {/* Main content placeholder */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Page title */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-muted-foreground">
              Complete system overview and management tools.
            </p>
          </div>

          {/* Key metrics row - Replace with actual data */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground">
                Today&apos;s Revenue
              </h3>
              <p className="mt-2 text-3xl font-bold text-foreground">$0.00</p>
              <p className="mt-1 text-xs text-muted-foreground">
                +0% from yesterday
              </p>
              {/* TODO: Fetch real revenue data */}
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground">
                Orders Today
              </h3>
              <p className="mt-2 text-3xl font-bold text-foreground">0</p>
              <p className="mt-1 text-xs text-muted-foreground">
                0 pending, 0 completed
              </p>
              {/* TODO: Fetch real order counts */}
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground">
                Total Users
              </h3>
              <p className="mt-2 text-3xl font-bold text-foreground">0</p>
              <p className="mt-1 text-xs text-muted-foreground">
                0 customers, 0 staff
              </p>
              {/* TODO: Fetch user counts by role */}
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground">
                System Health
              </h3>
              <p className="mt-2 text-3xl font-bold text-success">✓</p>
              <p className="mt-1 text-xs text-muted-foreground">
                All systems operational
              </p>
              {/* TODO: Add real system health checks */}
            </div>
          </div>

          {/* Main admin sections grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Management links */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold text-card-foreground">
                Management
              </h2>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  • Menu Management (Items, Categories, Pricing)
                </p>
                <p className="text-sm text-muted-foreground">
                  • User Management (Customers, Staff, Roles)
                </p>
                <p className="text-sm text-muted-foreground">
                  • Order Management (View All, Refunds, Issues)
                </p>
                <p className="text-sm text-muted-foreground">
                  • Settings (Hours, Loyalty, Notifications)
                </p>
              </div>
              {/* TODO: Add actual navigation links */}
            </div>

            {/* Quick actions */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold text-card-foreground">
                Quick Actions
              </h2>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  • View Staff Dashboard → /staff
                </p>
                <p className="text-sm text-muted-foreground">
                  • Generate Reports
                </p>
                <p className="text-sm text-muted-foreground">• Export Data</p>
                <p className="text-sm text-muted-foreground">• System Backup</p>
              </div>
              {/* TODO: Add actual action buttons */}
            </div>
          </div>

          {/* Recent activity - Replace with actual data */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold text-card-foreground">
              Recent Activity
            </h2>
            <p className="text-sm text-muted-foreground">
              Recent orders, user registrations, and system events will appear
              here.
            </p>
            {/* TODO: Fetch and display recent activity */}
          </div>

          {/* Developer notes */}
          <div className="rounded-lg border-2 border-dashed border-primary bg-primary/10 p-6">
            <h3 className="mb-2 text-lg font-semibold text-primary">
              🚧 For UI Developers
            </h3>
            <div className="space-y-2 text-sm text-primary-foreground">
              <p>
                This is a SCAFFOLD page. Replace the placeholder content above
                with:
              </p>
              <ul className="list-inside list-disc space-y-1 pl-4">
                <li>Real metrics from database (revenue, orders, users)</li>
                <li>
                  Navigation to admin features (menu, users, orders, settings)
                </li>
                <li>
                  Charts and visualizations (revenue trends, popular items)
                </li>
                <li>Real-time order monitor</li>
                <li>User management tools (view, edit roles, block/unblock)</li>
                <li>System health indicators</li>
                <li>Audit log of admin actions</li>
              </ul>
              <p className="mt-4 font-semibold">
                ⚠️ DO NOT modify the authentication and role check code above.
              </p>
              <p className="mt-2">
                💡 Admin dashboard should display aggregated system-wide data.
                Consider caching for performance.
              </p>
              <p className="mt-2">
                🔒 All destructive admin actions (delete, block user) should
                require confirmation dialogs.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
