/**
 * Purpose: Modal for creating/editing menu items in manager interface.
 * Provides complete form for menu item management.
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import type { MenuItem, Category, Modifier } from "@/src/types/menu";
import { createClient } from "@/src/integrations/supabase/client";
import { toast } from "sonner";

interface IngredientOption {
  id: string;
  name: string;
  unit: string;
}

interface RecipeRow {
  bean_id: string;
  quantity_needed: number;
}

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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [ingredientOptions, setIngredientOptions] = useState<
    IngredientOption[]
  >([]);
  const [recipeRows, setRecipeRows] = useState<RecipeRow[]>([]);
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
    stock_quantity: null as number | null,
    track_inventory: false,
    low_stock_threshold: null as number | null,
    reorder_quantity: null as number | null,
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
        stock_quantity:
          (item as any).stock_quantity !== undefined
            ? (item as any).stock_quantity
            : null,
        track_inventory:
          (item as any).track_inventory !== undefined
            ? (item as any).track_inventory
            : false,
        low_stock_threshold:
          (item as any).low_stock_threshold !== undefined
            ? (item as any).low_stock_threshold
            : null,
        reorder_quantity:
          (item as any).reorder_quantity !== undefined
            ? (item as any).reorder_quantity
            : null,
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
        stock_quantity: null,
        track_inventory: false,
        low_stock_threshold: null,
        reorder_quantity: null,
      });
    }
  }, [item, categories]);

  // Fetch available ingredients and existing recipe for this item
  useEffect(() => {
    if (!isOpen) return;
    const supabase = createClient();

    supabase
      .from("beans")
      .select("id, name, unit")
      .eq("active", true)
      .order("name")
      .then(({ data }) => setIngredientOptions(data || []));

    if (item) {
      supabase
        .from("item_ingredients")
        .select("bean_id, quantity_needed")
        .eq("item_id", item.id)
        .then(({ data }) => setRecipeRows(data || []));
    } else {
      setRecipeRows([]);
    }
  }, [isOpen, item]);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, and WebP are allowed");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File size exceeds 5MB limit");
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/menu/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to upload image");
      }

      const data = await response.json();
      setFormData((prev) => ({
        ...prev,
        image_url: data.url,
      }));
      toast.success("Image uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
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

      const result = await response.json();
      const itemId = item?.id || result.item?.id;

      // Save recipe (ingredient linkages)
      if (itemId) {
        const supabase = createClient();
        await supabase.from("item_ingredients").delete().eq("item_id", itemId);
        const validRows = recipeRows.filter(
          (r) => r.bean_id && r.quantity_needed > 0
        );
        if (validRows.length > 0) {
          await supabase.from("item_ingredients").insert(
            validRows.map((r) => ({
              item_id: itemId,
              bean_id: r.bean_id,
              quantity_needed: r.quantity_needed,
            }))
          );
        }
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
                <label
                  htmlFor="menu-item-category"
                  className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
                >
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="menu-item-category"
                  required
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category_id: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-[hsl(35,20%,85%)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)]"
                  aria-label="Category"
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

              {/* Image Upload */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]">
                  Image
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="w-full rounded-md border border-[hsl(35,20%,85%)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)] disabled:opacity-50"
                    aria-label="Upload image file"
                    title="Upload image file"
                  />
                  {uploadingImage && (
                    <p className="text-xs text-[hsl(25,35%,45%)]">
                      Uploading...
                    </p>
                  )}
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        image_url: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-[hsl(35,20%,85%)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)]"
                    placeholder="Or enter image URL"
                  />
                  {formData.image_url && (
                    <div className="relative mt-2 h-32 w-32">
                      <Image
                        src={formData.image_url}
                        alt="Preview"
                        fill
                        className="rounded-md object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                </div>
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

              {/* Inventory: for drinks/coffee use ingredients; for retail (e.g. muffins) use per-item */}
              {(() => {
                const currentCategory = categories.find(
                  (c) => c.id === formData.category_id
                );
                const isDrinksCategory =
                  currentCategory &&
                  (currentCategory.slug === "drinks" ||
                    currentCategory.slug === "coffee" ||
                    currentCategory.name.toLowerCase().includes("drink") ||
                    currentCategory.name.toLowerCase().includes("coffee"));
                if (isDrinksCategory) {
                  return (
                    <div className="space-y-2 border-t pt-4">
                      <h3 className="text-lg font-semibold text-[hsl(25,35%,25%)]">
                        Inventory
                      </h3>
                      <p className="text-sm text-[hsl(25,35%,45%)]">
                        Stock for drinks is tracked per ingredient (beans,
                        milk). Adjust quantities and view the audit log in{" "}
                        <Link
                          href="/manager/ingredients"
                          className="font-medium text-[hsl(25,35%,25%)] underline hover:no-underline"
                        >
                          Ingredients
                        </Link>
                        .
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-semibold text-[hsl(25,35%,25%)]">
                      Inventory Management
                    </h3>
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.track_inventory}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              track_inventory: e.target.checked,
                            }))
                          }
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-[hsl(25,35%,25%)]">
                          Track Inventory
                        </span>
                      </label>
                      <p className="mt-1 text-xs text-[hsl(25,35%,45%)]">
                        Enable inventory tracking for this item (e.g., retail
                        products)
                      </p>
                    </div>
                    {formData.track_inventory && (
                      <>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]">
                            Stock Quantity
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.stock_quantity ?? ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                stock_quantity: e.target.value
                                  ? parseInt(e.target.value, 10)
                                  : null,
                              }))
                            }
                            className="w-full rounded-md border border-[hsl(35,20%,85%)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)]"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]">
                            Low Stock Threshold
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.low_stock_threshold ?? ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                low_stock_threshold: e.target.value
                                  ? parseInt(e.target.value, 10)
                                  : null,
                              }))
                            }
                            className="w-full rounded-md border border-[hsl(35,20%,85%)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)]"
                            placeholder="10"
                          />
                          <p className="mt-1 text-xs text-[hsl(25,35%,45%)]">
                            Alert when stock falls below this quantity
                          </p>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]">
                            Reorder Quantity
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.reorder_quantity ?? ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                reorder_quantity: e.target.value
                                  ? parseInt(e.target.value, 10)
                                  : null,
                              }))
                            }
                            className="w-full rounded-md border border-[hsl(35,20%,85%)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)]"
                            placeholder="50"
                          />
                          <p className="mt-1 text-xs text-[hsl(25,35%,45%)]">
                            Suggested quantity to reorder when stock is low
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Ingredients / Recipe */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[hsl(25,35%,25%)]">
                    Ingredients (Recipe)
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setRecipeRows((prev) => [
                        ...prev,
                        { bean_id: "", quantity_needed: 0 },
                      ])
                    }
                    className="rounded-md border border-[hsl(35,20%,85%)] px-3 py-1 text-sm font-medium text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
                  >
                    + Add Ingredient
                  </button>
                </div>
                <p className="text-xs text-[hsl(25,35%,45%)]">
                  Define how much of each ingredient is consumed per order of
                  this item.
                </p>
                {recipeRows.length === 0 ? (
                  <p className="text-sm text-[hsl(25,35%,45%)]">
                    No ingredients linked.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recipeRows.map((row, idx) => {
                      const selectedIng = ingredientOptions.find(
                        (i) => i.id === row.bean_id
                      );
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <select
                            value={row.bean_id}
                            onChange={(e) => {
                              const updated = [...recipeRows];
                              updated[idx] = {
                                ...updated[idx],
                                bean_id: e.target.value,
                              };
                              setRecipeRows(updated);
                            }}
                            className="flex-1 rounded-md border border-[hsl(35,20%,85%)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)]"
                            aria-label={`Select ingredient for recipe row ${idx + 1}`}
                          >
                            <option value="">Select ingredient</option>
                            {ingredientOptions.map((ing) => (
                              <option key={ing.id} value={ing.id}>
                                {ing.name} ({ing.unit})
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.quantity_needed || ""}
                            onChange={(e) => {
                              const updated = [...recipeRows];
                              updated[idx] = {
                                ...updated[idx],
                                quantity_needed:
                                  parseFloat(e.target.value) || 0,
                              };
                              setRecipeRows(updated);
                            }}
                            placeholder="Qty"
                            className="w-24 rounded-md border border-[hsl(35,20%,85%)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)]"
                          />
                          <span className="text-xs text-[hsl(25,35%,45%)]">
                            {selectedIng?.unit || ""}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setRecipeRows((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="rounded text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
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
