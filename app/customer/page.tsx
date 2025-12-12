/**
 * Customer Dashboard Page - /customer
 *
 * ============================================================================
 * PURPOSE:
 * ============================================================================
 * This is the main dashboard for users with the "customer" role.
 * It serves as the landing page after customer login and provides access
 * to all customer-facing features.
 *
 * ============================================================================
 * USER STORIES SATISFIED:
 * ============================================================================
 * - CSA-48: Role-based access / dashboard redirect
 *   - Customers land here after login
 *   - Only accessible to users with "customer" role
 *   - Redirects non-customers to their appropriate dashboards
 *
 * ============================================================================
 * ROLE-BASED ROUTING ARCHITECTURE:
 * ============================================================================
 * This page is part of a three-tier dashboard system:
 * 1. /customer - Customer dashboard (this file)
 * 2. /staff - Staff dashboard (operational tools)
 * 3. /admin - Admin dashboard (management + operational tools)
 *
 * ROUTING FLOW:
 * - Login → Check role → Redirect to /customer (if customer)
 * - Middleware protects this route (auth required)
 * - Non-customers attempting to access are redirected to their dashboard
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
 *    - Logo linking to /customer
 *    - Navigation menu: Browse Menu, My Orders, Cart, Profile
 *    - User greeting with name from user.user_metadata.full_name
 *    - Logout button
 *
 * 2. **Main Content Areas:**
 *    a) Featured Items/Promotions Section
 *       - Display promotional items from database
 *       - Quick add-to-cart functionality
 *       - Links to full menu
 *
 *    b) Quick Actions Card
 *       - "Browse Menu" → /menu
 *       - "View My Orders" → /customer/orders
 *       - "Cart" → /customer/cart
 *       - "Loyalty Points" → Display current points
 *
 *    c) Recent Orders Section
 *       - List last 3-5 orders
 *       - Show order status (pending, ready, completed)
 *       - Link to order details
 *
 *    d) Loyalty Program Status
 *       - Current points balance
 *       - Progress to next reward
 *       - Available rewards
 *
 * 3. **Data Fetching Pattern:**
 *    ```typescript
 *    // Fetch user-specific data in Server Component
 *    const supabase = createClient();
 *    const { data: orders } = await supabase
 *      .from('orders')
 *      .select('*')
 *      .eq('customer_id', user.id)
 *      .order('created_at', { ascending: false })
 *      .limit(5);
 *    ```
 *
 * 4. **Component Structure:**
 *    - Keep this page as Server Component for auth checks
 *    - Use Client Components for interactive parts:
 *      - 'use client' for cart, add to cart buttons
 *      - 'use client' for navigation menu (if has state)
 *      - 'use client' for logout button
 *
 * 5. **Customer-Specific Features:**
 *    - Menu browsing and ordering
 *    - Cart management
 *    - Order tracking
 *    - Loyalty points redemption
 *    - Profile management
 *    - Order history
 *
 * ============================================================================
 * ARCHITECTURAL CONSTRAINTS - DO NOT VIOLATE:
 * ============================================================================
 *
 * ✅ KEEP THESE:
 * - Server-side role check (getCurrentUser + getUserRole)
 * - Redirect logic for non-customers
 * - Blocked user check
 * - Import structure (@/src/...)
 *
 * ❌ DO NOT:
 * - Remove authentication checks
 * - Allow access to staff/admin features
 * - Bypass middleware protection
 * - Use client-side role checks as primary security
 * - Expose admin/staff data in queries
 *
 * ============================================================================
 * SECURITY CONSIDERATIONS:
 * ============================================================================
 * - This page uses server-side authentication (getCurrentUser)
 * - Role is verified before rendering (getUserRole)
 * - Middleware provides first layer of defense (redirects unauthenticated)
 * - This page provides second layer (redirects wrong roles)
 * - Row-Level Security (RLS) on database ensures data isolation
 * - Customers can ONLY see their own data (orders, cart, profile)
 *
 * RLS POLICIES TO EXPECT:
 * - orders: WHERE customer_id = auth.uid()
 * - carts: WHERE user_id = auth.uid()
 * - profiles: WHERE id = auth.uid()
 *
 * ============================================================================
 * SUPABASE DATA FETCHING PATTERN:
 * ============================================================================
 * Always use server-side Supabase client for initial data:
 *
 * ```typescript
 * import { createClient } from "@/src/integrations/supabase/server";
 *
 * const supabase = createClient();
 * const { data, error } = await supabase.from('table').select('*');
 * ```
 *
 * For client-side updates, use client Supabase in 'use client' components:
 *
 * ```typescript
 * "use client";
 * import { createClient } from "@/src/integrations/supabase/client";
 * ```
 *
 * ============================================================================
 * FILE STRUCTURE FOR CUSTOMER FEATURES:
 * ============================================================================
 * Organize customer components as:
 *
 * app/customer/
 *   page.tsx          ← This file (dashboard)
 *   orders/
 *     page.tsx        ← Order history page
 *     [id]/
 *       page.tsx      ← Individual order details
 *   cart/
 *     page.tsx        ← Shopping cart page
 *   layout.tsx        ← Shared customer layout (nav, footer)
 *
 * src/components/customer/
 *   OrderCard.tsx     ← Reusable order display component
 *   CartItem.tsx      ← Cart item component
 *   LoyaltyWidget.tsx ← Loyalty points display
 *   MenuItemCard.tsx  ← Menu item with add to cart
 *
 * ============================================================================
 * NAVIGATION FLOW:
 * ============================================================================
 * Customer users can access:
 * - /customer (this page) - Dashboard
 * - /menu - Public menu (browsing)
 * - /customer/cart - Shopping cart
 * - /customer/orders - Order history
 * - /auth/profile - Account settings
 *
 * Customer users CANNOT access:
 * - /staff/* - Staff dashboard and features (403)
 * - /admin/* - Admin dashboard and features (403)
 *
 * Attempting to access forbidden routes triggers middleware redirect to /customer
 *
 * ============================================================================
 * TESTING CHECKLIST FOR UI DEVELOPERS:
 * ============================================================================
 * After implementing UI:
 * - [ ] Dashboard loads for logged-in customers
 * - [ ] Non-customers are redirected
 * - [ ] All links navigate correctly
 * - [ ] Data fetching works (orders, loyalty points)
 * - [ ] Logout button works
 * - [ ] Mobile responsive
 * - [ ] Accessibility (keyboard navigation, screen readers)
 * - [ ] Loading states for async operations
 * - [ ] Error states for failed data fetches
 */

import { redirect } from "next/navigation";
import { createClient } from "@/src/integrations/supabase/server";
import {
  getCurrentUser,
  getUserRole,
  isBlocked,
  getRedirectPath,
} from "@/src/lib/auth";

/**
 * Customer Dashboard Page (Server Component)
 *
 * This is a Server Component that performs authentication and role checks
 * before rendering. DO NOT convert to Client Component unless absolutely
 * necessary (breaks security model).
 */
export default async function CustomerDashboardPage() {
  /**
   * AUTHENTICATION CHECK
   *
   * Get current user from server-side session.
   * This is a security-critical check that must happen server-side.
   *
   * If no user, middleware should have redirected, but we check again
   * as a safety measure (defense in depth).
   */
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  /**
   * BLOCKED USER CHECK
   *
   * Even if middleware caught this, check again server-side.
   * Blocked users should not see any content.
   */
  if (isBlocked(user)) {
    redirect("/blocked");
  }

  /**
   * ROLE AUTHORIZATION CHECK
   *
   * This page is for customers only.
   * If user has a different role, redirect them to their appropriate dashboard.
   *
   * This creates a seamless experience where users always land on the
   * correct dashboard regardless of how they accessed the URL.
   */
  const role = getUserRole(user);

  if (role !== "customer") {
    // Redirect to appropriate dashboard based on role
    const redirectPath = getRedirectPath(user);
    redirect(redirectPath);
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
   * - Fetch customer-specific data here (orders, cart count, loyalty points)
   * - Use Supabase server client for initial data fetching
   * - Pass data to client components as props
   * - Maintain semantic HTML structure
   * - Follow coffee theme from globals.css
   * - Use Tailwind classes from tailwind.config.ts
   */

  return (
    <div className="min-h-screen bg-background">
      {/* Header placeholder - Replace with actual navigation component */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">
              Café Aroma - Customer
            </h1>
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
              Customer Dashboard
            </h1>
            <p className="mt-2 text-muted-foreground">
              Welcome to your Café Aroma dashboard. Manage your orders, browse
              the menu, and track your loyalty rewards.
            </p>
          </div>

          {/* Placeholder cards - Replace with actual dashboard components */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Quick actions card */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold text-card-foreground">
                Quick Actions
              </h2>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">• Browse Menu</p>
                <p className="text-sm text-muted-foreground">
                  • View My Orders
                </p>
                <p className="text-sm text-muted-foreground">• Shopping Cart</p>
                <p className="text-sm text-muted-foreground">
                  • Loyalty Rewards
                </p>
              </div>
            </div>

            {/* Recent orders card */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold text-card-foreground">
                Recent Orders
              </h2>
              <p className="text-sm text-muted-foreground">
                Your recent orders will appear here.
              </p>
              {/* TODO: Fetch and display actual orders */}
            </div>

            {/* Loyalty points card */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold text-card-foreground">
                Loyalty Points
              </h2>
              <p className="text-sm text-muted-foreground">
                Your loyalty points balance will appear here.
              </p>
              {/* TODO: Fetch and display actual loyalty points from profile */}
            </div>
          </div>

          {/* Developer notes */}
          <div className="rounded-lg border-2 border-dashed border-warning bg-warning/10 p-6">
            <h3 className="mb-2 text-lg font-semibold text-warning">
              🚧 For UI Developers
            </h3>
            <div className="space-y-2 text-sm text-warning-foreground">
              <p>
                This is a SCAFFOLD page. Replace the placeholder content above
                with:
              </p>
              <ul className="list-inside list-disc space-y-1 pl-4">
                <li>Navigation component with menu links</li>
                <li>Featured items/promotions section</li>
                <li>Real order history fetched from database</li>
                <li>Real loyalty points from user profile</li>
                <li>Quick action buttons linking to features</li>
                <li>Responsive grid layout for mobile/tablet/desktop</li>
              </ul>
              <p className="mt-4 font-semibold">
                ⚠️ DO NOT modify the authentication and role check code above.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
