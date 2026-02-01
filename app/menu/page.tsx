/**
 * Purpose: Public menu page displaying available items for customers to browse.
 * Allows customers to view all menu offerings with category filtering.
 */

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/src/integrations/supabase/client";
import type { MenuItem, Category } from "@/src/types/menu";
import { useCart } from "@/src/hooks/use-cart";
import { toast } from "sonner";

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const { addItem } = useCart();

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

        // Fetch available items
        const { data: itemsData, error: itemsError } = await supabase
          .from("available_items")
          .select("*")
          .eq("active", true);

        if (itemsError) throw itemsError;

        // Check which items have insufficient ingredient stock for their recipe
        const { data: recipeData } = await supabase
          .from("item_ingredients")
          .select("item_id, quantity_needed, beans(stock_quantity)");

        const outOfStockIds = new Set<string>();
        for (const row of recipeData || []) {
          const stock = (row as any).beans?.stock_quantity ?? 0;
          if (stock < row.quantity_needed) {
            outOfStockIds.add(row.item_id);
          }
        }

        const enrichedItems = (itemsData || []).map((item: any) => ({
          ...item,
          sold_out: item.sold_out || outOfStockIds.has(item.id),
        }));

        setCategories(categoriesData || []);
        setItems(enrichedItems);
      } catch (err) {
        console.error("Error fetching menu data:", err);
        setError("Failed to load menu. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter items by selected category
  const filteredItems = selectedCategory
    ? items.filter((item) => item.category_id === selectedCategory)
    : items;

  // Format price from cents to euros
  const formatPrice = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  // Handle add to cart
  const handleAddToCart = async (item: MenuItem) => {
    if (!item.is_available_now || (item as any).sold_out) return;

    setAddingToCart(item.id);
    try {
      await addItem({
        productId: item.id,
        name: item.name,
        price: item.price_cents,
        basePrice: item.price_cents,
        modifiers: [], // No modifiers for now
        imageUrl: item.image_url,
      });

      toast.success(`${item.name} added to cart!`);
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add item to cart");
    } finally {
      setAddingToCart(null);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="mb-4 text-4xl font-bold text-[hsl(25,35%,25%)]">Menu</h1>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              selectedCategory === null
                ? "bg-[hsl(25,35%,25%)] text-white"
                : "bg-[hsl(35,20%,95%)] text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,90%)]"
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
                  : "bg-[hsl(35,20%,95%)] text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,90%)]"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </header>

      {/* Loading state */}
      {loading && (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[hsl(25,35%,25%)] border-r-transparent"></div>
            <p className="text-[hsl(25,35%,25%)]">Loading menu...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="rounded-lg bg-red-50 p-6 text-center">
            <p className="mb-2 text-lg font-semibold text-red-800">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredItems.length === 0 && (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-[hsl(25,35%,25%)]">
              No items available in this category.
            </p>
          </div>
        </div>
      )}

      {/* Menu items grid */}
      {!loading && !error && filteredItems.length > 0 && (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Item image */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[hsl(35,20%,95%)]">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[hsl(25,35%,45%)]">
                    <span className="text-4xl">☕</span>
                  </div>
                )}
              </div>

              {/* Item details */}
              <div className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-[hsl(25,35%,25%)]">
                    {item.name}
                  </h3>
                  <span className="text-lg font-bold text-[hsl(25,35%,25%)]">
                    {formatPrice(item.price_cents)}
                  </span>
                </div>

                {item.description && (
                  <p className="mb-3 text-sm text-[hsl(25,35%,45%)]">
                    {item.description}
                  </p>
                )}

                {/* Dietary tags */}
                <div className="mb-3 flex flex-wrap gap-2">
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
                    <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
                      Contains: {item.allergens.join(", ")}
                    </span>
                  )}
                </div>

                {/* Availability indicator */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        item.is_available_now && !(item as any).sold_out
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    ></div>
                    <span
                      className={`text-xs font-medium ${
                        item.is_available_now && !(item as any).sold_out
                          ? "text-green-700"
                          : "text-gray-500"
                      }`}
                    >
                      {(item as any).sold_out
                        ? "Sold Out"
                        : item.is_available_now
                          ? "Available"
                          : "Unavailable"}
                    </span>
                  </div>

                  <button
                    disabled={
                      !item.is_available_now ||
                      (item as any).sold_out ||
                      addingToCart === item.id
                    }
                    onClick={() => handleAddToCart(item)}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      item.is_available_now &&
                      !(item as any).sold_out &&
                      addingToCart !== item.id
                        ? "bg-[hsl(25,35%,25%)] text-white hover:bg-[hsl(25,40%,15%)]"
                        : "cursor-not-allowed bg-gray-300 text-gray-500"
                    }`}
                  >
                    {addingToCart === item.id
                      ? "Adding..."
                      : (item as any).sold_out
                        ? "Sold Out"
                        : "Add to Cart"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
