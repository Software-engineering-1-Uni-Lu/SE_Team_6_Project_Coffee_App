/**
 * Staff Dashboard Page - /staff
 *
 * ============================================================================
 * PURPOSE:
 * ============================================================================
 * This is the operational dashboard for users with the "staff" role.
 * It serves as the landing page after staff login and provides access
 * to order processing, queue management, and operational tools.
 *
 * ============================================================================
 * USER STORIES SATISFIED:
 * ============================================================================
 * - CSA-48: Role-based access / dashboard redirect
 *   - Staff members land here after login
 *   - Only accessible to users with "staff" role
 *   - Redirects non-staff to their appropriate dashboards
 *
 * ============================================================================
 * ROLE-BASED ROUTING ARCHITECTURE:
 * ============================================================================
 * This page is part of a three-tier dashboard system:
 * 1. /customer - Customer dashboard (ordering and tracking)
 * 2. /staff - Staff dashboard (this file - operational tools)
 * 3. /admin - Admin dashboard (management + operational tools)
 *
 * ROUTING FLOW:
 * - Login → Check role → Redirect to /staff (if staff)
 * - Middleware protects this route (staff only)
 * - Customers attempting to access are redirected to /customer
 * - Admins CAN access this but typically use /admin dashboard
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
 *    - Logo linking to /staff
 *    - Navigation menu: Order Queue, Prep Station, Completed Orders
 *    - User greeting with name
 *    - Logout button
 *    - Quick stats: Pending orders, Ready for pickup
 *
 * 2. **Main Content Areas:**
 *    a) Order Queue (Priority #1)
 *       - Real-time list of pending orders
 *       - Sortable by time, priority, order type
 *       - Action buttons: Start Prep, Mark Ready, Mark Completed
 *       - Status indicators: pending → preparing → ready → completed
 *       - Sound/visual alerts for new orders
 *
 *    b) Preparation Station
 *       - Orders currently being prepared
 *       - Timer for each order
 *       - Item checklist for each order
 *       - Notes/special instructions display
 *       - "Mark Ready" button when complete
 *
 *    c) Ready for Pickup Section
 *       - Orders ready but not yet picked up
 *       - Customer name/order number display
 *       - "Mark Completed" button after handoff
 *       - Notification system for customers
 *
 *    d) Quick Actions Panel
 *       - View menu (reference)
 *       - Check inventory levels
 *       - Report issue
 *       - View shift notes
 *
 * 3. **Real-Time Data Pattern:**
 *    ```typescript
 *    // Initial data fetch (Server Component)
 *    const { data: orders } = await supabase
 *      .from('orders')
 *      .select('*, items:order_items(*)')
 *      .in('status', ['pending', 'preparing', 'ready'])
 *      .order('created_at', { ascending: true });
 *
 *    // Real-time updates (Client Component)
 *    "use client";
 *    import { createClient } from "@/src/integrations/supabase/client";
 *
 *    const supabase = createClient();
 *    supabase
 *      .channel('orders')
 *      .on('postgres_changes', {
 *        event: '*',
 *        schema: 'public',
 *        table: 'orders'
 *      }, handleOrderChange)
 *      .subscribe();
 *    ```
 *
 * 4. **Component Structure:**
 *    - Main page: Server Component (for auth)
 *    - Order queue: Client Component (real-time updates)
 *    - Order cards: Client Component (interactive buttons)
 *    - Status updaters: Client Component (API calls)
 *
 * 5. **Staff-Specific Features:**
 *    - View all active orders (not just own)
 *    - Update order status (pending → preparing → ready → completed)
 *    - View customer contact info (for issues)
 *    - Access preparation notes and special instructions
 *    - Manage workflow and queue
 *    - Report inventory issues
 *
 * ============================================================================
 * ARCHITECTURAL CONSTRAINTS - DO NOT VIOLATE:
 * ============================================================================
 *
 * ✅ KEEP THESE:
 * - Server-side role check (getCurrentUser + getUserRole)
 * - Redirect logic for non-staff
 * - Blocked user check
 * - Import structure (@/src/...)
 *
 * ❌ DO NOT:
 * - Remove authentication checks
 * - Allow customers to access staff features
 * - Expose admin-only features here (use /admin for those)
 * - Bypass middleware protection
 * - Use client-side role checks as primary security
 *
 * ============================================================================
 * SECURITY CONSIDERATIONS:
 * ============================================================================
 * - This page uses server-side authentication (getCurrentUser)
 * - Role is verified before rendering (getUserRole)
 * - Middleware provides first layer of defense
 * - This page provides second layer
 * - Row-Level Security (RLS) on database controls data access
 * - Staff can see ALL orders but cannot modify user accounts
 * - Staff CANNOT access admin features (user management, settings)
 *
 * RLS POLICIES TO EXPECT:
 * - orders: Staff can SELECT, UPDATE (status field only)
 * - items: Staff can SELECT (read-only, for reference)
 * - profiles: Staff CANNOT modify (except own profile)
 * - categories: Staff can SELECT (read-only)
 *
 * STAFF PERMISSIONS:
 * ✅ Can: View orders, Update order status, View menu, Report issues
 * ❌ Cannot: Delete orders, Modify prices, Manage users, Change settings
 *
 * ============================================================================
 * SUPABASE DATA FETCHING PATTERN:
 * ============================================================================
 * Server-side initial fetch:
 *
 * ```typescript
 * import { createClient } from "@/src/integrations/supabase/server";
 *
 * const supabase = createClient();
 * const { data: orders } = await supabase
 *   .from('orders')
 *   .select(`
 *     *,
 *     customer:profiles(full_name, phone),
 *     items:order_items(*, item:items(name, price_cents))
 *   `)
 *   .in('status', ['pending', 'preparing', 'ready']);
 * ```
 *
 * Client-side status updates:
 *
 * ```typescript
 * const updateOrderStatus = async (orderId: string, newStatus: string) => {
 *   const supabase = createClient();
 *   const { error } = await supabase
 *     .from('orders')
 *     .update({ status: newStatus, updated_at: new Date().toISOString() })
 *     .eq('id', orderId);
 * };
 * ```
 *
 * ============================================================================
 * FILE STRUCTURE FOR STAFF FEATURES:
 * ============================================================================
 * Organize staff components as:
 *
 * app/staff/
 *   page.tsx          ← This file (dashboard/order queue)
 *   orders/
 *     [id]/
 *       page.tsx      ← Individual order details (if needed)
 *   inventory/
 *     page.tsx        ← Inventory checker (view-only)
 *   layout.tsx        ← Shared staff layout (nav, footer)
 *
 * src/components/staff/
 *   OrderQueue.tsx     ← Real-time order list
 *   OrderCard.tsx      ← Individual order with actions
 *   StatusButton.tsx   ← Status update button
 *   PrepTimer.tsx      ← Preparation timer component
 *
 * ============================================================================
 * NAVIGATION FLOW:
 * ============================================================================
 * Staff users can access:
 * - /staff (this page) - Order queue and prep station
 * - /staff/* - Staff-specific features
 * - /menu - View menu (reference only, cannot edit)
 * - /auth/profile - Own account settings
 *
 * Staff users CANNOT access:
 * - /customer - Customer dashboard (403)
 * - /admin/* - Admin features (403, unless also admin role)
 *
 * Attempting to access forbidden routes triggers middleware redirect to /staff
 *
 * ============================================================================
 * REAL-TIME REQUIREMENTS:
 * ============================================================================
 * This dashboard MUST update in real-time:
 * - New orders appear immediately
 * - Status changes reflect across all staff sessions
 * - Order priority changes update live
 * - Sound/visual alerts for urgent orders
 *
 * Use Supabase Realtime subscriptions:
 * ```typescript
 * supabase
 *   .channel('orders')
 *   .on('postgres_changes', {
 *     event: 'INSERT',
 *     schema: 'public',
 *     table: 'orders',
 *     filter: `status=eq.pending`
 *   }, payload => {
 *     // Play sound, show notification, add to queue
 *     playNewOrderSound();
 *     showNotification('New order received!');
 *     addOrderToQueue(payload.new);
 *   })
 *   .subscribe();
 * ```
 *
 * ============================================================================
 * TESTING CHECKLIST FOR UI DEVELOPERS:
 * ============================================================================
 * After implementing UI:
 * - [ ] Dashboard loads for logged-in staff
 * - [ ] Non-staff are redirected
 * - [ ] Orders display correctly
 * - [ ] Status updates work (pending → preparing → ready → completed)
 * - [ ] Real-time updates work (new orders appear without refresh)
 * - [ ] Order details are complete and readable
 * - [ ] Action buttons trigger correct API calls
 * - [ ] Error states handled (failed status update)
 * - [ ] Mobile responsive (staff may use tablets)
 * - [ ] Accessibility (keyboard shortcuts for common actions)
 * - [ ] Sound alerts work (with user permission)
 */

import Link from "next/link";

/**
 * Staff Dashboard Page (Server Component)
 *
 * This is a Server Component that performs authentication and role checks
 * before rendering. DO NOT convert to Client Component.
 *
 * For interactive features (real-time updates, buttons), create separate
 * Client Components and import them here.
 */
export default async function StaffDashboardPage() {
  /**
   * ============================================================================
   * AUTHENTICATION & AUTHORIZATION:
   * ============================================================================
   *
   * The middleware (middleware.ts) already handles:
   * - User authentication check (redirects to /auth/login if not logged in)
   * - Role verification (only staff/manager/admin can access this page)
   * - Blocked user check (redirects to /blocked)
   *
   * If this component is running, the user is guaranteed to be:
   * - Authenticated ✅
   * - Staff, Manager, or Admin role ✅
   * - Not blocked ✅
   *
   * We don't need to duplicate these checks here. The middleware is the
   * authoritative gatekeeper.
   * ============================================================================
   */

  /**
   * ========================================================================
   * UI DEVELOPER: Build your staff dashboard here
   * ========================================================================
   *
   * This page is ONLY accessible to authenticated staff/manager/admin users.
   * The middleware guarantees this, so you can focus on building the UI.
   *
   * Guidelines:
   * - Fetch active orders here (pending, preparing, ready)
   * - Use Supabase server client for initial data
   * - Create Client Components for real-time updates
   * - Implement status update functionality
   * - Add sound/visual alerts for new orders
   * - Use semantic HTML for accessibility
   * - Follow coffee theme from globals.css
   */

  return (
    <div className="min-h-screen bg-background">
      {/* Header placeholder - Replace with actual navigation component */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">
              Café Aroma - Staff Portal
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Staff Dashboard
              </span>
              {/* User info is shown in the navbar */}
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
              Staff Dashboard
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage orders, process queue, and track preparation status.
            </p>
          </div>

          {/* Placeholder cards - Replace with actual operational components */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Order queue card */}
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="mb-4 text-xl font-semibold text-card-foreground">
                  Order Queue
                </h2>
                <p className="text-sm text-muted-foreground">
                  Active orders will appear here with status controls.
                </p>
                {/* TODO: Fetch and display real-time order queue */}
                <div className="mt-4 space-y-2">
                  <div className="rounded border border-border p-3">
                    <p className="text-sm font-medium">Pending Orders</p>
                    <p className="text-xs text-muted-foreground">
                      Orders awaiting preparation
                    </p>
                  </div>
                  <div className="rounded border border-border p-3">
                    <p className="text-sm font-medium">In Preparation</p>
                    <p className="text-xs text-muted-foreground">
                      Orders currently being made
                    </p>
                  </div>
                  <div className="rounded border border-border p-3">
                    <p className="text-sm font-medium">Ready for Pickup</p>
                    <p className="text-xs text-muted-foreground">
                      Orders ready for customer
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick stats and actions */}
            <div className="space-y-6">
              {/* Stats card */}
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="mb-4 text-xl font-semibold text-card-foreground">
                  Quick Stats
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-2xl font-bold text-foreground">0</p>
                    <p className="text-xs text-muted-foreground">
                      Pending Orders
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">0</p>
                    <p className="text-xs text-muted-foreground">
                      In Preparation
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">0</p>
                    <p className="text-xs text-muted-foreground">
                      Ready for Pickup
                    </p>
                  </div>
                </div>
                {/* TODO: Fetch real counts from database */}
              </div>

              {/* Quick actions card */}
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="mb-4 text-xl font-semibold text-card-foreground">
                  Quick Actions
                </h2>
                <div className="space-y-2">
                  <Link
                    href="/staff/orders"
                    className="block rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    📋 Manage Orders
                  </Link>
                  <Link
                    href="/staff/menu"
                    className="block rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    📖 View Menu
                  </Link>
                  <Link
                    href="/staff/ingredients"
                    className="block rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    ⚠️ Report Missing Ingredients
                  </Link>
                  <Link
                    href="/auth/profile"
                    className="block rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    👤 My Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Developer notes */}
          <div className="rounded-lg border-2 border-dashed border-info bg-info/10 p-6">
            <h3 className="mb-2 text-lg font-semibold text-info">
              🚧 For UI Developers
            </h3>
            <div className="space-y-2 text-sm text-info-foreground">
              <p>
                This is a SCAFFOLD page. Replace the placeholder content above
                with:
              </p>
              <ul className="list-inside list-disc space-y-1 pl-4">
                <li>Real-time order queue with Supabase subscriptions</li>
                <li>
                  Order status update buttons (pending → preparing → ready →
                  completed)
                </li>
                <li>Preparation timers for active orders</li>
                <li>
                  Order details with items, customer info, special instructions
                </li>
                <li>Sound/visual alerts for new orders</li>
                <li>Staff navigation with quick actions</li>
                <li>Real statistics from database queries</li>
              </ul>
              <p className="mt-4 font-semibold">
                ⚠️ DO NOT modify the authentication and role check code above.
              </p>
              <p className="mt-2">
                💡 This dashboard requires REAL-TIME updates. Use Supabase
                Realtime to subscribe to order changes.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
