/**
 * Purpose: Manager dashboard with overview of store operations.
 * Provides key metrics and quick access to management functions.
 */

import { createClient } from "@/src/integrations/supabase/server";
import { formatPrice } from "@/src/lib/cart-utils";
import Link from "next/link";

export default async function ManagerDashboardPage() {
  const supabase = await createClient();

  // Get start of today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Fetch today's orders
  const { data: ordersToday, error: ordersError } = await supabase
    .from("orders")
    .select("total_cents, status, created_at")
    .gte("created_at", startOfToday.toISOString());

  // Calculate today's revenue (completed orders only)
  const revenueToday =
    ordersToday
      ?.filter((o) => o.status === "completed")
      .reduce((sum, o) => sum + (o.total_cents || 0), 0) || 0;

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

  // Fetch staff count
  const { count: staffCount, error: staffError } = await supabase
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .in("role", ["staff", "manager", "admin"]);

  // Fetch customer count
  const { count: customerCount, error: customerError } = await supabase
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "customer");

  // Fetch recent orders (last 10)
  const { data: recentOrders, error: recentOrdersError } = await supabase
    .from("orders")
    .select(
      "id, status, total_cents, created_at, guest_name, customer_id, priority"
    )
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch low stock items
  const { data: lowStockItems, error: lowStockError } = await supabase
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

  // Calculate yesterday's revenue for comparison
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const endOfYesterday = new Date(startOfToday);

  const { data: ordersYesterday } = await supabase
    .from("orders")
    .select("total_cents, status")
    .gte("created_at", startOfYesterday.toISOString())
    .lt("created_at", endOfYesterday.toISOString());

  const revenueYesterday =
    ordersYesterday
      ?.filter((o) => o.status === "completed")
      .reduce((sum, o) => sum + (o.total_cents || 0), 0) || 0;

  const revenueChange =
    revenueYesterday > 0
      ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100
      : 0;

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-[hsl(25,35%,25%)]">
          Manager Dashboard
        </h1>
        <p className="mt-2 text-[hsl(25,35%,45%)]">
          Overview of store operations and key metrics
        </p>
      </header>

      {/* Key Metrics */}
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

      {/* Additional Sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
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
            {recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
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
              <p className="text-sm text-[hsl(25,35%,45%)]">No recent orders</p>
            )}
          </div>
        </section>

        {/* Inventory Alerts */}
        <section className="overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm">
          <div className="border-b border-[hsl(35,20%,90%)] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[hsl(25,35%,25%)]">
                Inventory Alerts
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
                    +{itemsNeedingRestock.length - 5} more items need restocking
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
              href="/manager/staff-management"
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
}
