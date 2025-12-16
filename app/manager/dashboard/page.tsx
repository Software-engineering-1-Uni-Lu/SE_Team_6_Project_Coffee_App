/**
 * Purpose: Manager dashboard with overview of store operations.
 * Provides key metrics and quick access to management functions.
 *
 * Subtasks:
 * - CSA-140: Create /manager/dashboard page
 * - CSA-141: Display key metrics
 * - CSA-142: Show recent orders
 * - CSA-143: Staff overview
 * - CSA-144: Menu highlights (most sold items, items low stock, etc.)
 * - CSA-145: Show skeletons/loading states while fetching data
 */

import { Suspense } from "react";
import { ManagerDashboardContent } from "./dashboard-content";

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="h-10 w-64 animate-pulse rounded bg-[hsl(35,20%,90%)]"></div>
        <div className="mt-2 h-6 w-96 animate-pulse rounded bg-[hsl(35,20%,90%)]"></div>
      </header>

      {/* Metrics skeleton */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm"
          >
            <div className="p-6">
              <div className="h-4 w-24 animate-pulse rounded bg-[hsl(35,20%,90%)]"></div>
              <div className="mt-2 h-8 w-32 animate-pulse rounded bg-[hsl(35,20%,90%)]"></div>
              <div className="mt-1 h-3 w-40 animate-pulse rounded bg-[hsl(35,20%,90%)]"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm"
          >
            <div className="border-b border-[hsl(35,20%,90%)] p-6">
              <div className="h-6 w-32 animate-pulse rounded bg-[hsl(35,20%,90%)]"></div>
            </div>
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="h-16 animate-pulse rounded bg-[hsl(35,20%,90%)]"
                ></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function ManagerDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ManagerDashboardContent />
    </Suspense>
  );
}
