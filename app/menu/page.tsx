/**
 * Purpose: Public menu page displaying available items for customers to browse.
 * Allows customers to view all menu offerings with category filtering.
 */

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/integrations/supabase/client";
import type { MenuItem, Category } from "@/src/types/menu";

export default function MenuPage() {
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

        // Fetch available items
        const { data: itemsData, error: itemsError } = await supabase
          .from("available_items")
          .select("*")
          .eq("active", true);

        if (itemsError) throw itemsError;

        setCategories(categoriesData || []);
        setItems(itemsData || []);
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

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8"></header>
    </main>
  );
}
