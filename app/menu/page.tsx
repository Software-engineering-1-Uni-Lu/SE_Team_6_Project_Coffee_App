/**
 * Purpose: Public menu page displaying available items for customers to browse.
 * Allows customers to view all menu offerings with search and filtering capabilities.
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { createClient } from "@/src/integrations/supabase/client";
import type { MenuItem, Category } from "@/src/types/menu";
import type { Promotion } from "@/src/types/promotions";
import { useCart } from "@/src/hooks/use-cart";
import {
  computeOutOfStockItemIds,
  enrichItemsWithSoldOut,
} from "@/src/lib/menu-availability";
import {
  filterActivePromotionsByTime,
  promotionsForItem,
  applyPromotionsStacked,
} from "@/src/lib/promotions";
import { toast } from "sonner";

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  // New state for filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVegetarian, setFilterVegetarian] = useState(false);
  const [filterVegan, setFilterVegan] = useState(false);
  const [excludedAllergens, setExcludedAllergens] = useState<string[]>([]);

  const { addItem } = useCart();

  const activePromotions = filterActivePromotionsByTime(promotions);

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

        // Fetch active promotions (everyone can read)
        const { data: promotionsData } = await supabase
          .from("promotions")
          .select("*")
          .eq("active", true);

        setPromotions((promotionsData as Promotion[]) || []);

        // Check which items have insufficient ingredient stock for their recipe
        const { data: recipeData } = await supabase
          .from("item_ingredients")
          .select("item_id, quantity_needed, beans(stock_quantity)");

        const outOfStockIds = computeOutOfStockItemIds(
          (recipeData || []) as {
            item_id: string;
            quantity_needed: number;
            beans?: { stock_quantity: number } | null;
          }[]
        );
        const enrichedItems = enrichItemsWithSoldOut(
          itemsData || [],
          outOfStockIds
        );

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

  // Compute unique allergens from all items
  const uniqueAllergens = useMemo(() => {
    const allergens = new Set<string>();
    items.forEach((item) => {
      item.allergens?.forEach((allergen) => allergens.add(allergen));
    });
    return Array.from(allergens).sort();
  }, [items]);

  // Filter items logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category Filter
      if (selectedCategory && item.category_id !== selectedCategory) {
        return false;
      }

      // Search Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      // Dietary Filters
      if (filterVegetarian && !item.vegetarian) return false;
      if (filterVegan && !item.vegan) return false;

      // Allergen Exclusion Filter
      if (excludedAllergens.length > 0) {
        const hasExcludedAllergen = item.allergens?.some((allergen) =>
          excludedAllergens.includes(allergen)
        );
        if (hasExcludedAllergen) return false;
      }

      return true;
    });
  }, [
    items,
    selectedCategory,
    searchQuery,
    filterVegetarian,
    filterVegan,
    excludedAllergens,
  ]);

  const toggleAllergen = (allergen: string) => {
    setExcludedAllergens((prev) =>
      prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterVegetarian(false);
    setFilterVegan(false);
    setExcludedAllergens([]);
  };

  const hasActiveFilters =
    searchQuery ||
    filterVegetarian ||
    filterVegan ||
    excludedAllergens.length > 0;

  // Format price from cents to euros
  const formatPrice = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  // Handle add to cart: use discounted price from stacked promotions (no modifiers for now)
  const handleAddToCart = async (item: MenuItem) => {
    if (!item.is_available_now || (item as any).sold_out) return;

    const applicable = promotionsForItem(item, activePromotions);
    const { discounted } = applyPromotionsStacked(item.price_cents, applicable);

    setAddingToCart(item.id);
    try {
      await addItem({
        productId: item.id,
        name: item.name,
        price: discounted,
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
      <header className="mb-8 space-y-4">
        <h1 className="text-4xl font-bold text-[hsl(25,35%,25%)]">Menu</h1>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full rounded-md border border-[hsl(35,20%,90%)] bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-1 focus:ring-[hsl(25,35%,25%)]"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters Container */}
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Category Filters */}
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

          <div className="hidden h-6 w-px bg-gray-300 sm:block"></div>

          {/* Dietary Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterVegetarian(!filterVegetarian)}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                filterVegetarian
                  ? "border-green-200 bg-green-100 text-green-800"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Vegetarian
            </button>
            <button
              onClick={() => setFilterVegan(!filterVegan)}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                filterVegan
                  ? "border-green-200 bg-green-100 text-green-800"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Vegan
            </button>
          </div>
        </div>

        {/* Allergen Exclusion Chips */}
        {uniqueAllergens.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[hsl(25,35%,25%)]">
              Exclude Allergens:
            </p>
            <div className="flex flex-wrap gap-2">
              {uniqueAllergens.map((allergen) => {
                const isExcluded = excludedAllergens.includes(allergen);
                return (
                  <button
                    key={allergen}
                    onClick={() => toggleAllergen(allergen)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      isExcluded
                        ? "border-orange-200 bg-orange-100 text-orange-800 ring-1 ring-orange-300"
                        : "border-[hsl(35,20%,90%)] bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {allergen}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div>
            <button
              onClick={clearAllFilters}
              className="text-sm text-[hsl(25,35%,45%)] underline hover:text-[hsl(25,35%,25%)]"
            >
              Clear all filters
            </button>
          </div>
        )}
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
              {hasActiveFilters
                ? "No items match your filters."
                : "No items available in this category."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="mt-4 rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-white hover:bg-[hsl(25,40%,15%)]"
              >
                Clear Filters
              </button>
            )}
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
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold text-[hsl(25,35%,25%)]">
                    {item.name}
                  </h3>
                  <div className="flex shrink-0 flex-col items-end">
                    {(() => {
                      const applicable = promotionsForItem(
                        item,
                        activePromotions
                      );
                      const { discounted, combinedLabel } =
                        applyPromotionsStacked(item.price_cents, applicable);
                      const hasDiscount = discounted < item.price_cents;
                      return (
                        <>
                          {hasDiscount && (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                              {combinedLabel}
                            </span>
                          )}
                          <span className="text-lg font-bold text-[hsl(25,35%,25%)]">
                            {formatPrice(discounted)}
                          </span>
                          {hasDiscount && (
                            <span className="text-sm text-[hsl(25,35%,45%)] line-through">
                              {formatPrice(item.price_cents)}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
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
