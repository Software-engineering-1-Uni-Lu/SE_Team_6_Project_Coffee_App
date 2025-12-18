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

// Force dynamic rendering to prevent caching and show fresh order data
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Import the client component that handles data fetching
import ManagerDashboardClient from "./client-dashboard";

/**
 * Manager Dashboard Page - /manager/dashboard
 *
 * This page displays the manager dashboard with key metrics, recent orders,
 * staff overview, and menu highlights.
 *
 * Uses a client component for data fetching to work around server component
 * cookie reading issues with Supabase SSR.
 */
export default function ManagerDashboardPage() {
  return <ManagerDashboardClient />;
}
