/**
 * Manager Dashboard Content Component
 * Fetches and displays all dashboard data
 */

import { createClient } from "@/src/integrations/supabase/server";
import { formatPrice } from "@/src/lib/cart-utils";
import { getCurrentUser, getUserRole } from "@/src/lib/auth";
import Link from "next/link";

export async function ManagerDashboardContent() {
  try {
    console.log("=== MANAGER DASHBOARD: FUNCTION CALLED ===");

    // IMPORTANT: The middleware should have already authenticated the user
    // and refreshed the session. If getUser() fails here, it means the
    // cookies aren't being passed correctly from middleware to server component.

    // Create Supabase client using the same pattern as working pages
    const supabase = await createClient();

    // Try to get user - if this fails, cookies aren't being read correctly
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("=== AUTH CHECK ===");
    if (authError) {
      console.error("Auth error:", authError.message);
      console.error("Auth error code:", authError.code);
      console.error("Auth error status:", authError.status);
    }
    console.log("User found:", !!user);
    console.log("User ID:", user?.id || "NONE");

    // If no user, middleware should have redirected, but continue for debugging
    if (!user) {
      console.error("=== CRITICAL: No user found ===");
      console.error(
        "Middleware should have redirected, but component is rendering."
      );
      console.error(
        "This suggests middleware isn't processing /manager/* routes correctly."
      );
    }

    // Get user role for display
    let role: string | null = null;
    if (user) {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleError) {
        console.error("Role fetch error:", roleError.message);
      }
      role = roleData?.role || null;
    }

    console.log("=== MANAGER DASHBOARD DEBUG ===");
    console.log("User:", user?.id || "NOT FOUND");
    console.log("Role:", role || "UNKNOWN");

    // Get start of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Get start of yesterday for comparison
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(startOfToday);

    // Get start of last 7 days for most sold items
    const startOfLast7Days = new Date();
    startOfLast7Days.setDate(startOfLast7Days.getDate() - 7);

    // Fetch today's orders
    const { data: ordersToday, error: ordersTodayError } = await supabase
      .from("orders")
      .select("total_cents, status, created_at")
      .gte("created_at", startOfToday.toISOString());

    if (ordersTodayError) {
      console.error("Error fetching today's orders:", ordersTodayError);
    }

    // Fetch yesterday's orders
    const { data: ordersYesterday, error: ordersYesterdayError } =
      await supabase
        .from("orders")
        .select("total_cents, status")
        .gte("created_at", startOfYesterday.toISOString())
        .lt("created_at", endOfYesterday.toISOString());

    if (ordersYesterdayError) {
      console.error("Error fetching yesterday's orders:", ordersYesterdayError);
    }

    // Calculate today's revenue (completed orders only)
    const revenueToday =
      ordersToday
        ?.filter((o) => o.status === "completed")
        .reduce((sum, o) => sum + (o.total_cents || 0), 0) || 0;

    // Calculate yesterday's revenue
    const revenueYesterday =
      ordersYesterday
        ?.filter((o) => o.status === "completed")
        .reduce((sum, o) => sum + (o.total_cents || 0), 0) || 0;

    const revenueChange =
      revenueYesterday > 0
        ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100
        : 0;

    // Count orders by status
    const ordersCount = ordersToday?.length || 0;
    const pendingCount =
      ordersToday?.filter((o) => o.status === "pending").length || 0;
    const completedCount =
      ordersToday?.filter((o) => o.status === "completed").length || 0;
    const preparingCount =
      ordersToday?.filter((o) => o.status === "preparing").length || 0;
    const readyCount =
      ordersToday?.filter((o) => o.status === "ready").length || 0;

    // Fetch staff count and details
    const { count: staffCount, error: staffCountError } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .in("role", ["staff", "manager", "admin"]);

    if (staffCountError) {
      console.error("Error fetching staff count:", staffCountError);
    }

    // Fetch staff details - get user_ids first, then profiles
    const { data: staffRoles, error: staffRolesError } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["staff", "manager", "admin"])
      .limit(10);

    if (staffRolesError) {
      console.error("Error fetching staff roles:", staffRolesError);
    }

    // Get profile details for staff members
    let staffDetails: Array<{
      user_id: string;
      role: string;
      full_name: string | null;
      email: string | null;
    }> = [];

    if (staffRoles && staffRoles.length > 0) {
      const userIds = staffRoles.map((r) => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching staff profiles:", profilesError);
      }

      // Combine roles with profiles
      staffDetails = staffRoles.map((role) => {
        const profile = profiles?.find((p) => p.id === role.user_id);
        return {
          user_id: role.user_id,
          role: role.role,
          full_name: profile?.full_name || null,
          email: profile?.email || null,
        };
      });
    }

    // Fetch customer count
    const { count: customerCount, error: customerCountError } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "customer");

    if (customerCountError) {
      console.error("Error fetching customer count:", customerCountError);
    }

    // Fetch recent orders (last 10)
    const { data: recentOrders, error: recentOrdersError } = await supabase
      .from("orders")
      .select(
        "id, status, total_cents, created_at, guest_name, customer_id, priority"
      )
      .order("created_at", { ascending: false })
      .limit(10);

    if (recentOrdersError) {
      console.error("Error fetching recent orders:", recentOrdersError);
      console.error("Error code:", recentOrdersError.code);
      console.error("Error message:", recentOrdersError.message);
      console.error("Error details:", recentOrdersError.details);
      console.error("Error hint:", recentOrdersError.hint);
    }

    // Ensure recentOrders is always an array
    const safeRecentOrders = recentOrders || [];

    // Summary log with detailed debugging
    console.log("=== QUERY RESULTS SUMMARY ===");
    console.log(
      "Orders today:",
      ordersToday?.length || 0,
      "Type:",
      typeof ordersToday,
      "Is array:",
      Array.isArray(ordersToday)
    );
    console.log("Orders today value:", ordersToday);
    console.log(
      "Recent orders:",
      safeRecentOrders.length,
      "Type:",
      typeof recentOrders,
      "Is array:",
      Array.isArray(recentOrders)
    );
    console.log("Recent orders value:", recentOrders);
    console.log("Staff count:", staffCount, "Type:", typeof staffCount);
    console.log(
      "Customer count:",
      customerCount,
      "Type:",
      typeof customerCount
    );
    console.log(
      "Staff roles data:",
      staffRoles?.length || 0,
      "Type:",
      typeof staffRoles
    );
    console.log("=============================");

    // Check if all data is null/undefined - this indicates RLS blocking
    const hasData =
      ordersToday !== null &&
      recentOrders !== null &&
      staffCount !== null &&
      customerCount !== null;
    if (!hasData) {
      console.error("=== CRITICAL: SOME QUERIES RETURNED NULL/UNDEFINED ===");
      console.error("ordersToday is null:", ordersToday === null);
      console.error("recentOrders is null:", recentOrders === null);
      console.error("staffCount is null:", staffCount === null);
      console.error("customerCount is null:", customerCount === null);
      console.error("This suggests RLS policies may be blocking queries");
    }

    // Collect all errors for display
    const allErrors = [
      ordersTodayError,
      ordersYesterdayError,
      staffCountError,
      staffRolesError,
      customerCountError,
      recentOrdersError,
    ].filter(Boolean);

    if (allErrors.length > 0) {
      console.error("=== ERRORS DETECTED ===");
      allErrors.forEach((err, idx) => {
        console.error(`Error ${idx + 1}:`, err);
      });
    }

    // Fetch low stock items
    const { data: lowStockItems } = await supabase
      .from("items")
      .select("id, name, stock_quantity, low_stock_threshold")
      .eq("active", true)
      .eq("track_inventory", true)
      .not("stock_quantity", "is", null)
      .not("low_stock_threshold", "is", null);

    const itemsNeedingRestock =
      lowStockItems?.filter(
        (item) =>
          item.stock_quantity !== null &&
          item.low_stock_threshold !== null &&
          item.stock_quantity <= item.low_stock_threshold
      ) || [];

    // Calculate most sold items from last 7 days
    const { data: recentOrdersForSales } = await supabase
      .from("orders")
      .select("items")
      .gte("created_at", startOfLast7Days.toISOString())
      .in("status", ["completed", "ready"]);

    // Aggregate item sales
    const itemSales: Record<
      string,
      { name: string; quantity: number; revenue: number }
    > = {};

    recentOrdersForSales?.forEach((order) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const productId = item.productId || item.id;
          const itemName = item.name || "Unknown Item";
          const quantity = item.quantity || 1;
          const price = item.price || item.price_cents || 0;

          if (itemSales[productId]) {
            itemSales[productId].quantity += quantity;
            itemSales[productId].revenue += price * quantity;
          } else {
            itemSales[productId] = {
              name: itemName,
              quantity,
              revenue: price * quantity,
            };
          }
        });
      }
    });

    // Sort by quantity and get top 5
    const mostSoldItems = Object.entries(itemSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Show debug info if in development or if there are issues
    const showDebug =
      process.env.NODE_ENV === "development" ||
      allErrors.length > 0 ||
      !hasData;

    // CRITICAL DEBUG: Log before return to ensure function executes
    console.log("=== RENDERING MANAGER DASHBOARD ===");
    console.log("About to return JSX");

    return (
      <main className="container mx-auto px-4 py-8">
        {/* CRITICAL: Simple test to ensure component renders */}
        <div className="mb-4 rounded-lg border-4 border-blue-500 bg-blue-100 p-4">
          <h1 className="text-2xl font-bold text-blue-800">
            🔵 COMPONENT IS RENDERING - IF YOU SEE THIS, THE COMPONENT WORKS
          </h1>
        </div>

        <header className="mb-8">
          <h1 className="text-4xl font-bold text-[hsl(25,35%,25%)]">
            Manager Dashboard
          </h1>
          <p className="mt-2 text-[hsl(25,35%,45%)]">
            Overview of store operations and key metrics
          </p>
        </header>

        {/* Debug Panel - ALWAYS visible for now to diagnose */}
        <div className="mb-6 rounded-lg border-2 border-red-400 bg-red-50 p-4">
          <h2 className="mb-2 font-bold text-red-800">
            🔍 DEBUG INFORMATION (Always Visible)
          </h2>
          <div className="space-y-1 text-sm text-red-700">
            <p>
              <strong>User ID:</strong> {user?.id || "NOT FOUND"}
            </p>
            <p>
              <strong>User Email:</strong> {user?.email || "NOT FOUND"}
            </p>
            <p>
              <strong>User Role:</strong> {role || "UNKNOWN"}
            </p>
            {authError && (
              <p className="text-red-600">
                <strong>Auth Error:</strong> {authError.message} (Code:{" "}
                {authError.code})
              </p>
            )}
            <hr className="my-2 border-red-300" />
            <p>
              <strong>Orders Today:</strong>{" "}
              {ordersToday === null
                ? "❌ NULL"
                : ordersToday === undefined
                  ? "❌ UNDEFINED"
                  : `✅ ${ordersToday.length} orders`}
            </p>
            <p>
              <strong>Recent Orders:</strong>{" "}
              {recentOrders === null
                ? "❌ NULL"
                : recentOrders === undefined
                  ? "❌ UNDEFINED"
                  : `✅ ${safeRecentOrders.length} orders`}
            </p>
            <p>
              <strong>Staff Count:</strong>{" "}
              {staffCount === null
                ? "❌ NULL"
                : staffCount === undefined
                  ? "❌ UNDEFINED"
                  : `✅ ${staffCount}`}
            </p>
            <p>
              <strong>Customer Count:</strong>{" "}
              {customerCount === null
                ? "❌ NULL"
                : customerCount === undefined
                  ? "❌ UNDEFINED"
                  : `✅ ${customerCount}`}
            </p>
            {allErrors.length > 0 && (
              <div className="mt-2">
                <p className="font-bold text-red-800">
                  ❌ ERRORS ({allErrors.length}):
                </p>
                {allErrors.map((err, idx) => (
                  <p key={idx} className="text-red-600">
                    {err?.code || "NO CODE"}: {err?.message || "Unknown error"}
                  </p>
                ))}
              </div>
            )}
            {allErrors.length === 0 && (
              <p className="mt-2 text-green-700">✅ No query errors detected</p>
            )}
            <hr className="my-2 border-red-300" />
            <p className="mt-2 text-xs font-bold">
              ⚠️ Check server console (terminal) for detailed logs starting with
              &quot;=== MANAGER DASHBOARD DEBUG ===&quot;
            </p>
            <p className="text-xs">
              If values show NULL/UNDEFINED, the migration may not be applied.
              Check Supabase SQL Editor.
            </p>
          </div>
        </div>

        {/* Key Metrics - CSA-141 */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Revenue Card */}
          <div className="overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm">
            <div className="p-6">
              <h3 className="text-sm font-medium text-[hsl(25,35%,45%)]">
                Today&apos;s Revenue
              </h3>
              <p className="mt-2 text-3xl font-bold text-[hsl(25,35%,25%)]">
                {formatPrice(revenueToday)}
              </p>
              <p
                className={`mt-1 text-xs ${
                  revenueChange >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {revenueChange >= 0 ? "+" : ""}
                {revenueChange.toFixed(1)}% from yesterday
              </p>
            </div>
          </div>

          {/* Orders Card */}
          <div className="overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm">
            <div className="p-6">
              <h3 className="text-sm font-medium text-[hsl(25,35%,45%)]">
                Orders Today
              </h3>
              <p className="mt-2 text-3xl font-bold text-[hsl(25,35%,25%)]">
                {ordersCount}
              </p>
              <p className="mt-1 text-xs text-[hsl(25,35%,45%)]">
                {pendingCount} pending, {preparingCount} preparing, {readyCount}{" "}
                ready, {completedCount} completed
              </p>
            </div>
          </div>

          {/* Staff Card */}
          <div className="overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm">
            <div className="p-6">
              <h3 className="text-sm font-medium text-[hsl(25,35%,45%)]">
                Staff Members
              </h3>
              <p className="mt-2 text-3xl font-bold text-[hsl(25,35%,25%)]">
                {staffCount || 0}
              </p>
              <p className="mt-1 text-xs text-[hsl(25,35%,45%)]">
                Active staff, managers, and admins
              </p>
            </div>
          </div>

          {/* Customers Card */}
          <div className="overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm">
            <div className="p-6">
              <h3 className="text-sm font-medium text-[hsl(25,35%,45%)]">
                Total Customers
              </h3>
              <p className="mt-2 text-3xl font-bold text-[hsl(25,35%,25%)]">
                {customerCount || 0}
              </p>
              <p className="mt-1 text-xs text-[hsl(25,35%,45%)]">
                Registered customers
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Orders - CSA-142 */}
          <section className="overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm">
            <div className="border-b border-[hsl(35,20%,90%)] p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[hsl(25,35%,25%)]">
                  Recent Orders
                </h2>
                <Link
                  href="/staff/orders"
                  className="text-sm text-[hsl(25,35%,25%)] hover:underline"
                >
                  View All
                </Link>
              </div>
            </div>
            <div className="p-6">
              {safeRecentOrders && safeRecentOrders.length > 0 ? (
                <div className="space-y-3">
                  {safeRecentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between border-b border-[hsl(35,20%,90%)] pb-3 last:border-b-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-[hsl(25,35%,25%)]">
                          Order #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-[hsl(25,35%,45%)]">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[hsl(25,35%,25%)]">
                          {formatPrice(order.total_cents || 0)}
                        </p>
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                            order.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : order.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : order.status === "preparing"
                                  ? "bg-purple-100 text-purple-800"
                                  : order.status === "ready"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[hsl(25,35%,45%)]">
                  No recent orders
                </p>
              )}
            </div>
          </section>

          {/* Staff Overview - CSA-143 */}
          <section className="overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm">
            <div className="border-b border-[hsl(35,20%,90%)] p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[hsl(25,35%,25%)]">
                  Staff Overview
                </h2>
                <Link
                  href="/admin/staff"
                  className="text-sm text-[hsl(25,35%,25%)] hover:underline"
                >
                  Manage Staff
                </Link>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(25,35%,45%)]">
                    Total Staff
                  </span>
                  <span className="text-sm font-medium text-[hsl(25,35%,25%)]">
                    {staffCount || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(25,35%,45%)]">
                    Total Customers
                  </span>
                  <span className="text-sm font-medium text-[hsl(25,35%,25%)]">
                    {customerCount || 0}
                  </span>
                </div>
              </div>
              {staffDetails && staffDetails.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-[hsl(25,35%,45%)]">
                    Recent Staff Members:
                  </p>
                  <div className="space-y-2">
                    {staffDetails.slice(0, 5).map((staff) => (
                      <div
                        key={staff.user_id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-[hsl(25,35%,25%)]">
                          {staff.full_name || staff.email || "Unknown"}
                        </span>
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-800">
                          {staff.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[hsl(25,35%,45%)]">
                  No staff members
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Menu Highlights - CSA-144 */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Most Sold Items */}
          <section className="overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm">
            <div className="border-b border-[hsl(35,20%,90%)] p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[hsl(25,35%,25%)]">
                  Most Sold Items (Last 7 Days)
                </h2>
                <Link
                  href="/manager/menu"
                  className="text-sm text-[hsl(25,35%,25%)] hover:underline"
                >
                  Manage Menu
                </Link>
              </div>
            </div>
            <div className="p-6">
              {mostSoldItems.length > 0 ? (
                <div className="space-y-3">
                  {mostSoldItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border-b border-[hsl(35,20%,90%)] pb-3 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(25,35%,25%)] text-xs font-bold text-white">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-[hsl(25,35%,25%)]">
                            {item.name}
                          </p>
                          <p className="text-xs text-[hsl(25,35%,45%)]">
                            {item.quantity} sold
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[hsl(25,35%,25%)]">
                          {formatPrice(item.revenue)}
                        </p>
                        <p className="text-xs text-[hsl(25,35%,45%)]">
                          Revenue
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[hsl(25,35%,45%)]">
                  No sales data available
                </p>
              )}
            </div>
          </section>

          {/* Low Stock Items */}
          <section className="overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm">
            <div className="border-b border-[hsl(35,20%,90%)] p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[hsl(25,35%,25%)]">
                  Low Stock Alerts
                </h2>
                <Link
                  href="/manager/menu"
                  className="text-sm text-[hsl(25,35%,25%)] hover:underline"
                >
                  Manage Menu
                </Link>
              </div>
            </div>
            <div className="p-6">
              {itemsNeedingRestock.length > 0 ? (
                <div className="space-y-3">
                  {itemsNeedingRestock.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border-b border-[hsl(35,20%,90%)] pb-3 last:border-b-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-[hsl(25,35%,25%)]">
                          {item.name}
                        </p>
                        <p className="text-xs text-[hsl(25,35%,45%)]">
                          Stock: {item.stock_quantity} (Threshold:{" "}
                          {item.low_stock_threshold})
                        </p>
                      </div>
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                        Low Stock
                      </span>
                    </div>
                  ))}
                  {itemsNeedingRestock.length > 5 && (
                    <p className="text-xs text-[hsl(25,35%,45%)]">
                      +{itemsNeedingRestock.length - 5} more items need
                      restocking
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[hsl(25,35%,45%)]">
                  All items are well stocked
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm">
          <div className="p-6">
            <h2 className="mb-4 text-xl font-semibold text-[hsl(25,35%,25%)]">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Link
                href="/manager/menu"
                className="rounded-md border border-[hsl(35,20%,90%)] bg-white px-4 py-3 text-center text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
              >
                Manage Menu
              </Link>
              <Link
                href="/staff/orders"
                className="rounded-md border border-[hsl(35,20%,90%)] bg-white px-4 py-3 text-center text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
              >
                View Orders
              </Link>
              <Link
                href="/admin/staff"
                className="rounded-md border border-[hsl(35,20%,90%)] bg-white px-4 py-3 text-center text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
              >
                Staff Management
              </Link>
              <Link
                href="/staff/menu"
                className="rounded-md border border-[hsl(35,20%,90%)] bg-white px-4 py-3 text-center text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
              >
                View Inventory
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  } catch (error: any) {
    console.error("=== CRITICAL ERROR IN MANAGER DASHBOARD ===");
    console.error("Error:", error);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);

    return (
      <main className="container mx-auto px-4 py-8">
        <div className="rounded-lg border-4 border-red-500 bg-red-100 p-6">
          <h1 className="mb-4 text-2xl font-bold text-red-800">
            ❌ CRITICAL ERROR
          </h1>
          <p className="mb-2 text-red-700">
            An error occurred while loading the dashboard:
          </p>
          <p className="mb-4 font-mono text-sm text-red-600">
            {error?.message || "Unknown error"}
          </p>
          <div className="mt-4 rounded border border-red-300 bg-white p-4">
            <p className="mb-2 text-sm font-bold">Debug Info:</p>
            <p className="text-xs">
              Check server console for full error details
            </p>
            <p className="mt-2 text-xs">
              Error type: {error?.constructor?.name || "Unknown"}
            </p>
          </div>
        </div>
      </main>
    );
  }
}
