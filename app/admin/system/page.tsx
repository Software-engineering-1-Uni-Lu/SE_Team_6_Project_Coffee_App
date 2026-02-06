/**
 * Purpose: System administration dashboard.
 * Admin-only page for system health status, audit logs, and configuration.
 */

"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/src/hooks/useUser";
import { createClient } from "@/src/integrations/supabase/client";

interface SystemStats {
  totalOrders: number;
  totalUsers: number;
  totalMenuItems: number;
  pendingOrders: number;
}

export default function SystemAdminPage() {
  const { user, role, loading: userLoading } = useUser();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthStatus, setHealthStatus] = useState<
    "healthy" | "degraded" | "unknown"
  >("unknown");

  useEffect(() => {
    if (userLoading || !user) return;

    const fetchStats = async () => {
      try {
        const supabase = createClient();

        // Fetch counts in parallel
        const [ordersResult, usersResult, itemsResult, pendingResult] =
          await Promise.all([
            supabase
              .from("orders")
              .select("id", { count: "exact", head: true }),
            supabase
              .from("profiles")
              .select("id", { count: "exact", head: true }),
            supabase
              .from("items")
              .select("id", { count: "exact", head: true })
              .is("deleted_at", null),
            supabase
              .from("orders")
              .select("id", { count: "exact", head: true })
              .eq("status", "pending"),
          ]);

        setStats({
          totalOrders: ordersResult.count || 0,
          totalUsers: usersResult.count || 0,
          totalMenuItems: itemsResult.count || 0,
          pendingOrders: pendingResult.count || 0,
        });

        // Basic health check - if we can query, DB is accessible
        setHealthStatus("healthy");
      } catch {
        setHealthStatus("degraded");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, userLoading]);

  if (userLoading || loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[hsl(25,35%,25%)] border-r-transparent"></div>
        </div>
      </main>
    );
  }

  if (role !== "admin" && role !== "manager") {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="mt-2">Only admins can access this page.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[hsl(25,35%,25%)]">
          System Administration
        </h1>
        <p className="mt-1 text-[hsl(25,35%,55%)]">
          System health, statistics, and configuration
        </p>
      </header>

      {/* Health Status */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-[hsl(25,35%,25%)]">
          System Health
        </h2>
        <div
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
            healthStatus === "healthy"
              ? "bg-green-100 text-green-800"
              : healthStatus === "degraded"
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-800"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              healthStatus === "healthy"
                ? "bg-green-500"
                : healthStatus === "degraded"
                  ? "bg-red-500"
                  : "bg-gray-500"
            }`}
          ></span>
          {healthStatus === "healthy"
            ? "All Systems Operational"
            : healthStatus === "degraded"
              ? "System Degraded"
              : "Checking..."}
        </div>
      </div>

      {/* System Stats */}
      {stats && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-[hsl(25,35%,25%)]">
            Statistics
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-[hsl(35,20%,90%)] bg-white p-6">
              <p className="text-3xl font-bold text-[hsl(25,35%,25%)]">
                {stats.totalOrders}
              </p>
              <p className="mt-1 text-sm text-[hsl(25,35%,55%)]">
                Total Orders
              </p>
            </div>
            <div className="rounded-lg border border-[hsl(35,20%,90%)] bg-white p-6">
              <p className="text-3xl font-bold text-[hsl(25,35%,25%)]">
                {stats.pendingOrders}
              </p>
              <p className="mt-1 text-sm text-[hsl(25,35%,55%)]">
                Pending Orders
              </p>
            </div>
            <div className="rounded-lg border border-[hsl(35,20%,90%)] bg-white p-6">
              <p className="text-3xl font-bold text-[hsl(25,35%,25%)]">
                {stats.totalUsers}
              </p>
              <p className="mt-1 text-sm text-[hsl(25,35%,55%)]">
                Registered Users
              </p>
            </div>
            <div className="rounded-lg border border-[hsl(35,20%,90%)] bg-white p-6">
              <p className="text-3xl font-bold text-[hsl(25,35%,25%)]">
                {stats.totalMenuItems}
              </p>
              <p className="mt-1 text-sm text-[hsl(25,35%,55%)]">
                Active Menu Items
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Environment Info */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-[hsl(25,35%,25%)]">
          Environment
        </h2>
        <div className="rounded-lg border border-[hsl(35,20%,90%)] bg-white p-6">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[hsl(25,35%,55%)]">Application</span>
              <span className="font-medium text-[hsl(25,35%,25%)]">
                Cafe Aroma
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[hsl(25,35%,55%)]">Framework</span>
              <span className="font-medium text-[hsl(25,35%,25%)]">
                Next.js 14
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[hsl(25,35%,55%)]">Database</span>
              <span className="font-medium text-[hsl(25,35%,25%)]">
                Supabase (PostgreSQL)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[hsl(25,35%,55%)]">Environment</span>
              <span className="font-medium text-[hsl(25,35%,25%)]">
                {process.env.NODE_ENV || "production"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
