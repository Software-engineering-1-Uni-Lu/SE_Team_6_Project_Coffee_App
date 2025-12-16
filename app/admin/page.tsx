/**
 * Admin Dashboard Page - /admin
 *
 * Comprehensive management dashboard for users with the "admin" role.
 * Provides system-wide metrics, user management, and administrative tools.
 */

import { createClient } from "@/src/integrations/supabase/server";
import { formatPrice } from "@/src/lib/cart-utils";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Get start of today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Get start of yesterday for comparison
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const endOfYesterday = new Date(startOfToday);

  // Fetch today's orders
  const { data: ordersToday } = await supabase
    .from("orders")
    .select("total_cents, status, created_at")
    .gte("created_at", startOfToday.toISOString());

  // Fetch yesterday's orders
  const { data: ordersYesterday } = await supabase
    .from("orders")
    .select("total_cents, status")
    .gte("created_at", startOfYesterday.toISOString())
    .lt("created_at", endOfYesterday.toISOString());

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

  // Fetch user counts by role
  const { count: customerCount } = await supabase
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "customer");

  const { count: staffCount } = await supabase
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .in("role", ["staff", "manager"]);

  const { count: adminCount } = await supabase
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");

  // Fetch blocked users count
  const { count: blockedCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("blocked", true);

  // Fetch new registrations today
  const { count: newUsersToday } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfToday.toISOString());

  // Fetch recent orders (last 10)
  const { data: recentOrders } = await supabase
    .from("orders")
    .select(
      "id, status, total_cents, created_at, guest_name, customer_id, priority"
    )
    .order("created_at", { ascending: false })
    .limit(10);

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

  // Fetch recent audit log entries (if table exists)
  let recentAuditLogs = null;
  try {
    const { data, error } = await supabase
      .from("audit_log")
      .select("id, entity_type, action, actor_email, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (!error) {
      recentAuditLogs = data;
    }
  } catch (error) {
    // Gracefully handle if table doesn't exist or query fails
    recentAuditLogs = null;
  }

  // Calculate total users
  const totalUsers =
    (customerCount || 0) + (staffCount || 0) + (adminCount || 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
                Admin Dashboard
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
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

          {/* Key metrics row */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Revenue Card */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground">
                Today&apos;s Revenue
              </h3>
              <p className="mt-2 text-3xl font-bold text-foreground">
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

            {/* Orders Card */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground">
                Orders Today
              </h3>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {ordersCount}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {pendingCount} pending, {preparingCount} preparing, {readyCount}{" "}
                ready, {completedCount} completed
              </p>
            </div>

            {/* Users Card */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground">
                Total Users
              </h3>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {totalUsers}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {customerCount || 0} customers, {staffCount || 0} staff,{" "}
                {adminCount || 0} admins
              </p>
            </div>

            {/* System Health Card */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground">
                System Health
              </h3>
              <p className="mt-2 text-3xl font-bold text-success">✓</p>
              <p className="mt-1 text-xs text-muted-foreground">
                All systems operational
              </p>
              {itemsNeedingRestock.length > 0 && (
                <p className="mt-1 text-xs text-orange-600">
                  {itemsNeedingRestock.length} items need restocking
                </p>
              )}
            </div>
          </div>

          {/* Main admin sections grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Orders */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-card-foreground">
                  Recent Orders
                </h2>
                <Link
                  href="/staff/orders"
                  className="text-sm text-primary hover:underline"
                >
                  View All
                </Link>
              </div>
              {recentOrders && recentOrders.length > 0 ? (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between border-b border-border pb-3 last:border-b-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Order #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
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
                <p className="text-sm text-muted-foreground">
                  No recent orders
                </p>
              )}
            </div>

            {/* User Management Summary */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-card-foreground">
                  User Management
                </h2>
                <Link
                  href="/admin/staff"
                  className="text-sm text-primary hover:underline"
                >
                  Manage Users
                </Link>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    New users today
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {newUsersToday || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Blocked users
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {blockedCount || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total customers
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {customerCount || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Staff & managers
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {staffCount || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional sections */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Inventory Alerts */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-card-foreground">
                  Inventory Alerts
                </h2>
                <Link
                  href="/manager/menu"
                  className="text-sm text-primary hover:underline"
                >
                  Manage Menu
                </Link>
              </div>
              {itemsNeedingRestock.length > 0 ? (
                <div className="space-y-3">
                  {itemsNeedingRestock.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border-b border-border pb-3 last:border-b-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
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
                    <p className="text-xs text-muted-foreground">
                      +{itemsNeedingRestock.length - 5} more items need
                      restocking
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  All items are well stocked
                </p>
              )}
            </div>

            {/* Audit Log */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold text-card-foreground">
                Recent Activity
              </h2>
              {recentAuditLogs && recentAuditLogs.length > 0 ? (
                <div className="space-y-3">
                  {recentAuditLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between border-b border-border pb-3 last:border-b-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {log.action} {log.entity_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          by {log.actor_email || "System"}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent activity logged
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold text-card-foreground">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Link
                href="/manager/menu"
                className="rounded-md border border-border bg-background px-4 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Manage Menu
              </Link>
              <Link
                href="/admin/staff"
                className="rounded-md border border-border bg-background px-4 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Manage Staff
              </Link>
              <Link
                href="/staff/orders"
                className="rounded-md border border-border bg-background px-4 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                View Orders
              </Link>
              <Link
                href="/staff"
                className="rounded-md border border-border bg-background px-4 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Staff Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
