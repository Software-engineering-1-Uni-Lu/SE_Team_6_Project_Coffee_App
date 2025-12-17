"use client";

/**
 * Manager Dashboard Client Component
 * Fetches and displays dashboard data using client-side Supabase client
 * This works around the server component cookie reading issue
 */

import { useEffect, useState } from "react";
import { createClient } from "@/src/integrations/supabase/client";
import { formatPrice } from "@/src/lib/cart-utils";
import Link from "next/link";

interface DashboardData {
  ordersToday: number;
  recentOrders: any[];
  staffCount: number;
  customerCount: number;
  adminCount: number;
  totalUsers: number;
  revenueToday: number;
  revenueChange: number;
  pendingCount: number;
  preparingCount: number;
  readyCount: number;
  completedCount: number;
  newUsersToday: number;
  blockedCount: number;
  itemsNeedingRestock: any[];
  recentAuditLogs: any[] | null;
}

export default function ManagerDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const supabase = createClient();

        // Get start of today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Get start of yesterday
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        const endOfYesterday = new Date(startOfToday);

        // Fetch today's orders
        const { data: ordersToday, error: ordersTodayError } = await supabase
          .from("orders")
          .select("total_cents, status, created_at")
          .gte("created_at", startOfToday.toISOString());

        if (ordersTodayError) throw ordersTodayError;

        // Fetch yesterday's orders
        const { data: ordersYesterday, error: ordersYesterdayError } =
          await supabase
            .from("orders")
            .select("total_cents, status")
            .gte("created_at", startOfYesterday.toISOString())
            .lt("created_at", endOfYesterday.toISOString());

        if (ordersYesterdayError) throw ordersYesterdayError;

        // Calculate revenue
        const revenueToday =
          ordersToday
            ?.filter((o) => o.status === "completed")
            .reduce((sum, o) => sum + (o.total_cents || 0), 0) || 0;

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

        // Fetch user counts
        const { count: customerCount, error: customerCountError } =
          await supabase
            .from("user_roles")
            .select("*", { count: "exact", head: true })
            .eq("role", "customer");

        if (customerCountError) throw customerCountError;

        const { count: staffCount, error: staffCountError } = await supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .in("role", ["staff", "manager"]);

        if (staffCountError) throw staffCountError;

        const { count: adminCount, error: adminCountError } = await supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "admin");

        if (adminCountError) throw adminCountError;

        // Fetch blocked users count
        const { count: blockedCount, error: blockedCountError } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("blocked", true);

        if (blockedCountError) throw blockedCountError;

        // Fetch new registrations today
        const { count: newUsersToday, error: newUsersTodayError } =
          await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .gte("created_at", startOfToday.toISOString());

        if (newUsersTodayError) throw newUsersTodayError;

        // Fetch recent orders
        const { data: recentOrders, error: recentOrdersError } = await supabase
          .from("orders")
          .select(
            "id, status, total_cents, created_at, guest_name, customer_id, priority"
          )
          .order("created_at", { ascending: false })
          .limit(10);

        if (recentOrdersError) throw recentOrdersError;

        // Fetch low stock items
        const { data: lowStockItems, error: lowStockItemsError } =
          await supabase
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
          const { data: auditData, error: auditError } = await supabase
            .from("audit_log")
            .select("id, entity_type, action, actor_email, created_at")
            .order("created_at", { ascending: false })
            .limit(10);
          if (!auditError) {
            recentAuditLogs = auditData;
          }
        } catch (error) {
          // Gracefully handle if table doesn't exist
          recentAuditLogs = null;
        }

        const totalUsers =
          (customerCount || 0) + (staffCount || 0) + (adminCount || 0);

        setData({
          ordersToday: ordersCount,
          recentOrders: recentOrders || [],
          staffCount: staffCount || 0,
          customerCount: customerCount || 0,
          adminCount: adminCount || 0,
          totalUsers,
          revenueToday,
          revenueChange,
          pendingCount,
          preparingCount,
          readyCount,
          completedCount,
          newUsersToday: newUsersToday || 0,
          blockedCount: blockedCount || 0,
          itemsNeedingRestock,
          recentAuditLogs,
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard data"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="rounded-lg border-2 border-red-400 bg-red-50 p-6">
          <h2 className="mb-2 text-xl font-bold text-red-800">
            Error Loading Dashboard
          </h2>
          <p className="text-red-700">{error}</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No data available</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-foreground">
                Café Aroma - Manager Portal
              </h1>
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Manager
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Manager Dashboard
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
              Manager Dashboard
            </h1>
            <p className="mt-2 text-muted-foreground">
              Complete system overview and management tools.
            </p>
          </div>

          {/* Key metrics row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {/* Revenue Card */}
            <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
              <h3 className="text-xs font-medium text-muted-foreground sm:text-sm">
                Today&apos;s Revenue
              </h3>
              <p className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                {formatPrice(data.revenueToday)}
              </p>
              <p
                className={`mt-1 text-xs ${
                  data.revenueChange >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {data.revenueChange >= 0 ? "+" : ""}
                {data.revenueChange.toFixed(1)}% from yesterday
              </p>
            </div>

            {/* Orders Card */}
            <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
              <h3 className="text-xs font-medium text-muted-foreground sm:text-sm">
                Orders Today
              </h3>
              <p className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                {data.ordersToday}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {data.pendingCount} pending, {data.preparingCount} preparing,{" "}
                {data.readyCount} ready, {data.completedCount} completed
              </p>
            </div>

            {/* Users Card */}
            <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
              <h3 className="text-xs font-medium text-muted-foreground sm:text-sm">
                Total Users
              </h3>
              <p className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                {data.totalUsers}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {data.customerCount || 0} customers, {data.staffCount || 0}{" "}
                staff, {data.adminCount || 0} admins
              </p>
            </div>

            {/* System Health Card */}
            <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
              <h3 className="text-xs font-medium text-muted-foreground sm:text-sm">
                System Health
              </h3>
              <p className="mt-2 text-2xl font-bold text-success sm:text-3xl">
                ✓
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                All systems operational
              </p>
              {data.itemsNeedingRestock.length > 0 && (
                <p className="mt-1 text-xs text-orange-600">
                  {data.itemsNeedingRestock.length} items need restocking
                </p>
              )}
            </div>
          </div>

          {/* Main admin sections grid */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            {/* Recent Orders */}
            <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between sm:mb-4">
                <h2 className="text-lg font-semibold text-card-foreground sm:text-xl">
                  Recent Orders
                </h2>
                <Link
                  href="/staff/orders"
                  className="whitespace-nowrap text-xs text-primary hover:underline sm:text-sm"
                >
                  View All
                </Link>
              </div>
              {data.recentOrders && data.recentOrders.length > 0 ? (
                <div className="max-h-[400px] space-y-2 overflow-y-auto sm:space-y-3">
                  {data.recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between border-b border-border pb-2 last:border-b-0 sm:pb-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                          Order #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0 text-right">
                        <p className="text-xs font-medium text-foreground sm:text-sm">
                          {formatPrice(order.total_cents || 0)}
                        </p>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium sm:py-1 ${
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
                <p className="py-4 text-sm text-muted-foreground">
                  No recent orders
                </p>
              )}
            </div>

            {/* Right column: User Management and Recent Activity stacked */}
            <div className="flex flex-col gap-4 sm:gap-6">
              {/* User Management Summary */}
              <div className="rounded-lg border border-border bg-card px-3 pb-2.5 pt-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-card-foreground sm:text-xl">
                    User Management
                  </h2>
                  <Link
                    href="/admin/staff"
                    className="whitespace-nowrap text-xs text-primary hover:underline sm:text-sm"
                  >
                    Manage Users
                  </Link>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground sm:text-sm">
                      New users today
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {data.newUsersToday || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground sm:text-sm">
                      Blocked users
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {data.blockedCount || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground sm:text-sm">
                      Total customers
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {data.customerCount || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground sm:text-sm">
                      Staff & managers
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {data.staffCount || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Audit Log - Recent Activity */}
              <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
                <h2 className="mb-3 text-lg font-semibold text-card-foreground sm:mb-4 sm:text-xl">
                  Recent Activity
                </h2>
                {data.recentAuditLogs && data.recentAuditLogs.length > 0 ? (
                  <div className="max-h-[300px] space-y-2 overflow-y-auto sm:space-y-3">
                    {data.recentAuditLogs.map((log: any) => (
                      <div
                        key={log.id}
                        className="flex items-start justify-between border-b border-border pb-2 last:border-b-0 sm:pb-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground sm:text-sm">
                            {log.action} {log.entity_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            by {log.actor_email || "System"}
                          </p>
                        </div>
                        <p className="ml-2 flex-shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-sm text-muted-foreground">
                    No recent activity logged
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Additional sections */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            {/* Inventory Alerts */}
            <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between sm:mb-4">
                <h2 className="text-lg font-semibold text-card-foreground sm:text-xl">
                  Inventory Alerts
                </h2>
                <Link
                  href="/manager/menu"
                  className="whitespace-nowrap text-xs text-primary hover:underline sm:text-sm"
                >
                  Manage Menu
                </Link>
              </div>
              {data.itemsNeedingRestock.length > 0 ? (
                <div className="max-h-[300px] space-y-2 overflow-y-auto sm:space-y-3">
                  {data.itemsNeedingRestock.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border-b border-border pb-2 last:border-b-0 sm:pb-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Stock: {item.stock_quantity} (Threshold:{" "}
                          {item.low_stock_threshold})
                        </p>
                      </div>
                      <span className="ml-2 flex-shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 sm:py-1">
                        Low Stock
                      </span>
                    </div>
                  ))}
                  {data.itemsNeedingRestock.length > 5 && (
                    <p className="pt-2 text-xs text-muted-foreground">
                      +{data.itemsNeedingRestock.length - 5} more items need
                      restocking
                    </p>
                  )}
                </div>
              ) : (
                <p className="py-4 text-sm text-muted-foreground">
                  All items are well stocked
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
            <h2 className="mb-3 text-lg font-semibold text-card-foreground sm:mb-4 sm:text-xl">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              <Link
                href="/manager/menu"
                className="rounded-md border border-border bg-background px-3 py-2 text-center text-xs font-medium text-foreground transition-colors hover:bg-muted sm:px-4 sm:py-3 sm:text-sm"
              >
                Manage Menu
              </Link>
              <Link
                href="/admin/staff"
                className="rounded-md border border-border bg-background px-3 py-2 text-center text-xs font-medium text-foreground transition-colors hover:bg-muted sm:px-4 sm:py-3 sm:text-sm"
              >
                Manage Staff
              </Link>
              <Link
                href="/staff/orders"
                className="rounded-md border border-border bg-background px-3 py-2 text-center text-xs font-medium text-foreground transition-colors hover:bg-muted sm:px-4 sm:py-3 sm:text-sm"
              >
                View Orders
              </Link>
              <Link
                href="/staff"
                className="rounded-md border border-border bg-background px-3 py-2 text-center text-xs font-medium text-foreground transition-colors hover:bg-muted sm:px-4 sm:py-3 sm:text-sm"
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
