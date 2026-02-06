/**
 * Purpose: Manager menu management page for adding and editing menu items.
 * Allows managers to manage the complete menu catalog.
 */

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/src/integrations/supabase/client";
import type { MenuItem, Category } from "@/src/types/menu";
import { ManagerMenuItemModal } from "@/src/components/manager-menu-item-modal";
import { formatPrice } from "@/src/lib/cart-utils";
import { toast } from "sonner";

export default function ManagerMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .order("position");

      if (categoriesError) throw categoriesError;

      // Fetch all items (including inactive)
      const { data: itemsData, error: itemsError } = await supabase
        .from("items")
        .select("*")
        .order("name");

      if (itemsError) throw itemsError;

      setCategories(categoriesData || []);
      setItems(itemsData || []);
    } catch (err) {
      console.error("Error fetching menu data:", err);
      setError(err instanceof Error ? err.message : "Failed to load menu");
      toast.error("Failed to load menu items");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) {
      return;
    }

    try {
      const response = await fetch(`/api/menu/items/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete item");
      }

      toast.success("Item deleted successfully");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting item:", error);
      toast.error(error.message || "Failed to delete item");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleModalSuccess = () => {
    fetchData();
    handleModalClose();
  };

  const handleToggleSoldOut = async (item: MenuItem) => {
    try {
      const currentSoldOut = (item as any).sold_out || false;
      const response = await fetch(`/api/menu/items/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sold_out: !currentSoldOut,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update sold out status");
      }

      toast.success(
        currentSoldOut ? "Item marked as available" : "Item marked as sold out"
      );
      fetchData();
    } catch (error: any) {
      console.error("Error toggling sold out status:", error);
      toast.error(error.message || "Failed to update sold out status");
    }
  };

  const filteredItems = selectedCategory
    ? items.filter((item) => item.category_id === selectedCategory)
    : items;

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || "Unknown";
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[hsl(25,35%,25%)] border-r-transparent"></div>
            <p className="text-[hsl(25,35%,25%)]">Loading menu...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[hsl(25,35%,25%)]">
              Menu Management
            </h1>
            <p className="mt-2 text-[hsl(25,35%,45%)]">
              Manage your menu items and categories. Drink stock (e.g. beans,
              milk) is managed in{" "}
              <Link
                href="/manager/ingredients"
                className="font-medium text-[hsl(25,35%,25%)] underline hover:no-underline"
              >
                Ingredients
              </Link>{" "}
              (g, ml); countable items (e.g. muffins) use ingredients with unit
              &quot;pcs&quot;.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/manager/ingredients"
              className="rounded-md border border-[hsl(35,20%,90%)] bg-white px-4 py-2 text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
            >
              Ingredients
            </Link>
            <Link
              href="/manager/ingredients/bulk-import"
              className="rounded-md border border-[hsl(35,20%,90%)] bg-white px-4 py-2 text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
            >
              Bulk Import
            </Link>
            <Link
              href="/manager/ingredients/audit-log"
              className="rounded-md border border-[hsl(35,20%,90%)] bg-white px-4 py-2 text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
            >
              Audit Log
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-white transition-colors hover:bg-[hsl(25,40%,15%)]"
            >
              Add Item
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Category Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              selectedCategory === null
                ? "bg-[hsl(25,35%,25%)] text-white"
                : "border border-[hsl(35,20%,90%)] bg-white text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
            }`}
          >
            All Items
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? "bg-[hsl(25,35%,25%)] text-white"
                  : "border border-[hsl(35,20%,90%)] bg-white text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <section>
          {filteredItems.length === 0 ? (
            <div className="rounded-lg border border-[hsl(35,20%,90%)] bg-white p-8 text-center">
              <p className="text-[hsl(25,35%,45%)]">No items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm"
                >
                  {/* Item Image */}
                  <div className="relative h-48 w-full bg-[hsl(35,20%,95%)]">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl text-[hsl(25,35%,45%)]">
                        ☕
                      </div>
                    )}
                    {!item.active && (
                      <div className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-1 text-xs font-medium text-white">
                        Inactive
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-[hsl(25,35%,25%)]">
                          {item.name}
                        </h3>
                        <p className="text-xs text-[hsl(25,35%,45%)]">
                          {getCategoryName(item.category_id)}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-[hsl(25,35%,25%)]">
                        {formatPrice(item.price_cents)}
                      </p>
                    </div>

                    {item.description && (
                      <p className="mb-2 line-clamp-2 text-sm text-[hsl(25,35%,45%)]">
                        {item.description}
                      </p>
                    )}

                    {/* Dietary Tags */}
                    <div className="mb-3 flex flex-wrap gap-1">
                      {item.vegan && (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                          Vegan
                        </span>
                      )}
                      {item.vegetarian && !item.vegan && (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                          Vegetarian
                        </span>
                      )}
                      {item.allergens && item.allergens.length > 0 && (
                        <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                          Allergens
                        </span>
                      )}
                    </div>

                    {/* Sold Out Status */}
                    {(item as any).sold_out && (
                      <div className="mb-3">
                        <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
                          Sold Out
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="flex-1 rounded-md border border-[hsl(35,20%,90%)] bg-white px-3 py-2 text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                      <button
                        onClick={() => handleToggleSoldOut(item)}
                        className={`w-full rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                          (item as any).sold_out
                            ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                            : "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100"
                        }`}
                      >
                        {(item as any).sold_out
                          ? "Mark Available"
                          : "Mark Sold Out"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <ManagerMenuItemModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        item={editingItem}
        categories={categories}
      />
    </>
  );
}
