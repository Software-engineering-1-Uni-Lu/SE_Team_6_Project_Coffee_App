/**
 * Purpose: Staff menu view page showing available items.
 * Allows staff to view current menu items and their availability status.
 *
 * User Stories:
 * - CSA-118: Create /staff/menu page
 * - CSA-119: Fetch all items with stock_quantity / available_now
 * - CSA-120: Display availability badges (available / sold out / low stock)
 */

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/integrations/supabase/client";
import type { MenuItem, Category } from "@/src/types/menu";

type AvailabilityStatus = "available" | "low-stock" | "sold-out";

/**
 * Calculate availability status based on stock and availability flags
 * Rules:
 * - If available_now is false → Sold out
 * - Else if stock_quantity is 0 → Sold out
 * - Else if stock_quantity <= low_stock_threshold → Low stock
 * - Else → Available
 */
function getAvailabilityStatus(item: MenuItem): AvailabilityStatus {
  if (!item.is_available_now) return "sold-out";
  if (item.stock_quantity === 0) return "sold-out";
  if (item.stock_quantity <= item.low_stock_threshold) return "low-stock";
  return "available";
}

/**
 * Badge component for displaying availability status
 */
function AvailabilityBadge({ status }: { status: AvailabilityStatus }) {
  const styles = {
    available: "bg-green-100 text-green-800 border-green-300",
    "low-stock": "bg-yellow-100 text-yellow-800 border-yellow-300",
    "sold-out": "bg-red-100 text-red-800 border-red-300",
  };

  const labels = {
    available: "Available",
    "low-stock": "Low Stock",
    "sold-out": "Sold Out",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}
      aria-label={`Availability status: ${labels[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export default function StaffMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const supabase = createClient();

        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("*")
          .eq("active", true)
          .order("position");

        if (categoriesError) throw categoriesError;

        // Fetch ALL items with stock info
        // Use available_items view which includes is_available_now calculated field
        const { data: itemsData, error: itemsError } = await supabase
          .from("available_items")
          .select("*")
          .eq("active", true)
          .order("name");

        if (itemsError) throw itemsError;

        setCategories(categoriesData || []);
        // Ensure all items have default low_stock_threshold if not set
        const itemsWithDefaults = (itemsData || []).map((item: any) => ({
          ...item,
          low_stock_threshold: item.low_stock_threshold ?? 10,
          stock_quantity: item.stock_quantity ?? 0,
        })) as MenuItem[];
        setItems(itemsWithDefaults);
      } catch (err) {
        console.error("Error fetching menu data:", err);
        setError(err instanceof Error ? err.message : "Failed to load menu");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredItems = selectedCategory
    ? items.filter((item) => item.category_id === selectedCategory)
    : items;

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-[hsl(25,35%,25%)]">Menu</h1>
        </header>
        <div className="flex items-center justify-center py-12">
          <p className="text-lg text-gray-600">Loading menu...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-[hsl(25,35%,25%)]">Menu</h1>
        </header>
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-[hsl(25,35%,25%)]">Menu</h1>
        <p className="mt-2 text-gray-600">
          Current menu items and availability status
        </p>
      </header>

      {/* Category filter */}
      <section className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedCategory === null
                ? "bg-[hsl(25,35%,25%)] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All Items ({items.length})
          </button>
          {categories.map((category) => {
            const count = items.filter(
              (item) => item.category_id === category.id
            ).length;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? "bg-[hsl(25,35%,25%)] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category.name} ({count})
              </button>
            );
          })}
        </div>
      </section>

      {/* Menu items list */}
      <section>
        {filteredItems.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">No items found</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => {
              const status = getAvailabilityStatus(item);
              const categoryName =
                categories.find((c) => c.id === item.category_id)?.name ||
                "Unknown";

              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[hsl(25,35%,25%)]">
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-500">{categoryName}</p>
                    </div>
                    <AvailabilityBadge status={status} />
                  </div>

                  {item.description && (
                    <p className="mb-3 text-sm text-gray-600">
                      {item.description}
                    </p>
                  )}

                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">Price:</span>
                      <span className="text-[hsl(25,35%,25%)]">
                        €{(item.price_cents / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">Stock:</span>
                      <span
                        className={
                          item.stock_quantity === 0
                            ? "text-red-600"
                            : item.stock_quantity <= item.low_stock_threshold
                              ? "text-yellow-600"
                              : "text-green-600"
                        }
                      >
                        {item.stock_quantity} units
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        Low Stock Alert:
                      </span>
                      <span className="text-gray-600">
                        ≤ {item.low_stock_threshold} units
                      </span>
                    </div>
                    {!item.is_available_now && item.stock_quantity > 0 && (
                      <div className="mt-2 rounded bg-yellow-50 p-2 text-xs text-yellow-800">
                        Item not available during current hours
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
