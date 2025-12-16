/**
 * Purpose: Modal for creating/editing menu items in manager interface.
 * Provides complete form for menu item management.
 */

"use client";

import { useState, useEffect } from "react";
import type { MenuItem, Category, Modifier } from "@/src/types/menu";
import { toast } from "sonner";

interface ManagerMenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  item?: MenuItem | null;
  categories?: Category[];
}

export function ManagerMenuItemModal({
  isOpen,
  onClose,
  onSuccess,
  item,
  categories = [],
}: ManagerMenuItemModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    category_id: "",
    name: "",
    slug: "",
    description: "",
    price_cents: 0,
    image_url: "",
    allergens: [] as string[],
    vegetarian: false,
    vegan: false,
    active: true,
    modifiers: [] as Modifier[],
  });

  useEffect(() => {
    if (item) {
      setFormData({
        category_id: item.category_id,
        name: item.name,
        slug: item.slug,
        description: item.description || "",
        price_cents: item.price_cents,
        image_url: item.image_url || "",
        allergens: item.allergens || [],
        vegetarian: item.vegetarian || false,
        vegan: item.vegan || false,
        active: item.active !== undefined ? item.active : true,
        modifiers: item.modifiers || [],
      });
    } else {
      setFormData({
        category_id: categories[0]?.id || "",
        name: "",
        slug: "",
        description: "",
        price_cents: 0,
        image_url: "",
        allergens: [],
        vegetarian: false,
        vegan: false,
        active: true,
        modifiers: [],
      });
    }
  }, [item, categories]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = item ? `/api/menu/items/${item.id}` : "/api/menu/items";
      const method = item ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          // price_cents is already in cents, no conversion needed
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save item");
      }

      toast.success(
        item ? "Item updated successfully" : "Item created successfully"
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving item:", error);
      toast.error(error.message || "Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  const handleAllergenChange = (allergen: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      allergens: checked
        ? [...prev.allergens, allergen]
        : prev.allergens.filter((a) => a !== allergen),
    }));
  };

  if (!isOpen) return null;

  const commonAllergens = [
    "Milk",
    "Eggs",
    "Fish",
    "Shellfish",
    "Tree Nuts",
    "Peanuts",
    "Wheat",
    "Soybeans",
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow-xl">
        <div className="flex max-h-[90vh] flex-col">
          <div className="flex items-center justify-between border-b p-6">
            <h2 className="text-2xl font-bold text-[hsl(25,35%,25%)]">
              {item ? "Edit Menu Item" : "Add Menu Item"}
            </h2>
            <button
              onClick={onClose}
              className="text-2xl text-[hsl(25,35%,25%)] transition-colors hover:text-[hsl(25,40%,15%)]"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category_id: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-[hsl(35,20%,85%)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)]"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full rounded-md border border-[hsl(35,20%,85%)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)]"
                  placeholder="e.g., Cappuccino"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]">
                  Slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  className="w-full rounded-md border border-[hsl(35,20%,85%)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)]"
                  placeholder="e.g., cappuccino"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-md border border-[hsl(35,20%,85%)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)]"
                  placeholder="Item description"
                />
              </div>

              {/* Price */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]">
                  Price (€) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.price_cents / 100}
                  onChange={(e) => {
                    const euroValue = parseFloat(e.target.value) || 0;
                    setFormData((prev) => ({
                      ...prev,
                      price_cents: Math.round(euroValue * 100), // Convert euros to cents
                    }));
                  }}
                  className="w-full rounded-md border border-[hsl(35,20%,85%)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)]"
                  placeholder="0.00"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      image_url: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-[hsl(35,20%,85%)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)]"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Dietary Options */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]">
                  Dietary Options
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.vegetarian}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          vegetarian: e.target.checked,
                        }))
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-[hsl(25,35%,25%)]">
                      Vegetarian
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.vegan}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          vegan: e.target.checked,
                        }))
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-[hsl(25,35%,25%)]">
                      Vegan
                    </span>
                  </label>
                </div>
              </div>

              {/* Allergens */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]">
                  Allergens
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {commonAllergens.map((allergen) => (
                    <label key={allergen} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.allergens.includes(allergen)}
                        onChange={(e) =>
                          handleAllergenChange(allergen, e.target.checked)
                        }
                        className="mr-2"
                      />
                      <span className="text-sm text-[hsl(25,35%,25%)]">
                        {allergen}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Active Status */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        active: e.target.checked,
                      }))
                    }
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-[hsl(25,35%,25%)]">
                    Active (visible to customers)
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t pt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-md border border-[hsl(35,20%,85%)] px-4 py-2 text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)] disabled:opacity-50"
              >
                {loading ? "Saving..." : item ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
