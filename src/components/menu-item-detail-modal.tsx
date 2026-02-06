"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { createClient } from "@/src/integrations/supabase/client";
import { useCart } from "@/src/hooks/use-cart";
import {
  filterActivePromotionsByTime,
  promotionsForItem,
  applyPromotionsStacked,
} from "@/src/lib/promotions";
import type { MenuItem, ModifierOption } from "@/src/types/menu";
import type { Promotion } from "@/src/types/promotions";

interface MenuItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
  promotions?: Promotion[]; // Pass promotions from parent to avoid re-fetching
}

interface Ingredient {
  quantity_needed: number;
  beans: {
    name: string;
    description: string | null;
    unit: string;
    image_url: string | null;
  } | null;
}

export function MenuItemDetailModal({
  isOpen,
  onClose,
  item,
  promotions = [],
}: MenuItemDetailModalProps) {
  const { addItem } = useCart();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  // State for selected modifiers: { "Size": { label: "Large", price: 50 } }
  const [selectedModifiers, setSelectedModifiers] = useState<
    Record<string, ModifierOption>
  >({});

  // Reset state when item changes or modal opens
  useEffect(() => {
    if (isOpen && item) {
      // 1. Reset modifiers to defaults
      const defaults: Record<string, ModifierOption> = {};
      item.modifiers?.forEach((mod) => {
        if (mod.options.length > 0) {
          defaults[mod.name] = mod.options[0];
        }
      });
      setSelectedModifiers(defaults);

      // 2. Fetch Ingredients
      setLoadingIngredients(true);
      const supabase = createClient();
      supabase
        .from("item_ingredients")
        .select(
          `
          quantity_needed,
          beans (name, description, unit, image_url)
        `
        )
        .eq("item_id", item.id)
        .then(({ data, error }) => {
          if (!error && data) {
            setIngredients(data as any);
          }
          setLoadingIngredients(false);
        });
    } else {
      setIngredients([]);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  // --- Price Calculation Logic ---
  const activePromotions = filterActivePromotionsByTime(promotions);
  const applicablePromos = promotionsForItem(item, activePromotions);
  // Calculate discounted BASE price
  const { discounted: baseDiscounted, combinedLabel } = applyPromotionsStacked(
    item.price_cents,
    applicablePromos
  );

  const hasDiscount = baseDiscounted < item.price_cents;

  // Calculate modifiers total
  const modifiersCost = Object.values(selectedModifiers).reduce(
    (sum, opt) => sum + opt.price,
    0
  );

  const finalTotal = baseDiscounted + modifiersCost;
  const originalTotal = item.price_cents + modifiersCost;

  const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  // --- Handlers ---
  const handleModifierChange = (modName: string, option: ModifierOption) => {
    setSelectedModifiers((prev) => ({ ...prev, [modName]: option }));
  };

  const handleAddToCart = async () => {
    if (!item.is_available_now || (item as any).sold_out) return;

    setAddingToCart(true);
    try {
      const modifiersList = Object.entries(selectedModifiers).map(
        ([name, opt]) => ({
          label: `${name}: ${opt.label}`,
          price: opt.price,
        })
      );

      await addItem({
        productId: item.id,
        name: item.name,
        price: finalTotal, // Total price including discounts and modifiers
        basePrice: baseDiscounted, // Discounted base price
        modifiers: modifiersList,
        imageUrl: item.image_url,
      });

      toast.success(`${item.name} added to cart!`);
      onClose();
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl md:flex-row">
        {/* Close Button (Mobile) */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 md:hidden"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Left: Image (40% width on desktop) */}
        <div className="relative h-64 w-full shrink-0 bg-[hsl(35,20%,95%)] md:h-auto md:w-2/5">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[hsl(25,35%,45%)]">
              <span className="text-6xl">☕</span>
            </div>
          )}

          {/* Discount Badge */}
          {hasDiscount && (
            <div className="absolute left-4 top-4 rounded-full bg-red-500 px-3 py-1 text-sm font-bold text-white shadow-md">
              Promo
            </div>
          )}
        </div>

        {/* Right: Details (Scrollable) */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b border-[hsl(35,20%,90%)] p-6 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[hsl(25,35%,25%)]">
                  {item.name}
                </h2>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-[hsl(25,35%,25%)]">
                    {formatPrice(finalTotal)}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm text-[hsl(25,35%,45%)] line-through">
                      {formatPrice(originalTotal)}
                    </span>
                  )}
                </div>
              </div>

              {/* Close Button (Desktop) */}
              <button
                onClick={onClose}
                className="hidden rounded-full p-2 text-[hsl(25,35%,45%)] hover:bg-[hsl(35,20%,95%)] hover:text-[hsl(25,35%,25%)] md:block"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Badges */}
            <div className="mt-3 flex flex-wrap gap-2">
              {item.vegan && (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Vegan
                </span>
              )}
              {item.vegetarian && !item.vegan && (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Vegetarian
                </span>
              )}
              {item.allergens?.map((allergen) => (
                <span
                  key={allergen}
                  className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800"
                >
                  {allergen}
                </span>
              ))}
            </div>

            {item.description && (
              <p className="mt-3 text-sm text-[hsl(25,35%,45%)]">
                {item.description}
              </p>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 pt-2">
            {/* Ingredients */}
            {ingredients.length > 0 && (
              <div className="mb-6 mt-4">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[hsl(25,35%,45%)]">
                  Ingredients
                </h3>
                <div className="grid gap-2">
                  {loadingIngredients ? (
                    <p className="text-sm text-gray-400">
                      Loading ingredients...
                    </p>
                  ) : (
                    ingredients.map((ing, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 rounded-lg border border-[hsl(35,20%,90%)] p-2"
                      >
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-[hsl(35,20%,95%)]">
                          {ing.beans?.image_url ? (
                            <Image
                              src={ing.beans.image_url}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[hsl(25,35%,45%)]">
                              ●
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[hsl(25,35%,25%)]">
                            {ing.beans?.name}
                          </p>
                          {ing.beans?.description && (
                            <p className="line-clamp-1 text-xs text-[hsl(25,35%,45%)]">
                              {ing.beans.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Modifiers */}
            {item.modifiers && item.modifiers.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[hsl(25,35%,45%)]">
                  Customize
                </h3>
                <div className="space-y-4">
                  {item.modifiers.map((mod) => (
                    <div key={mod.name}>
                      <label className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]">
                        {mod.name}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {mod.options.map((opt) => (
                          <button
                            key={opt.label}
                            onClick={() => handleModifierChange(mod.name, opt)}
                            className={`rounded-md border px-3 py-2 text-sm transition-all ${
                              selectedModifiers[mod.name]?.label === opt.label
                                ? "border-[hsl(25,35%,25%)] bg-[hsl(25,35%,25%)] text-white shadow-sm"
                                : "border-[hsl(35,20%,85%)] bg-white text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
                            }`}
                          >
                            {opt.label}
                            {opt.price > 0 && ` (+${formatPrice(opt.price)})`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-[hsl(35,20%,90%)] bg-[hsl(35,20%,98%)] p-6">
            <button
              onClick={handleAddToCart}
              disabled={
                !item.is_available_now || (item as any).sold_out || addingToCart
              }
              className={`flex w-full items-center justify-center rounded-lg py-3.5 text-center font-bold text-white shadow-md transition-transform active:scale-[0.98] ${
                !item.is_available_now || (item as any).sold_out
                  ? "cursor-not-allowed bg-gray-400"
                  : "bg-[hsl(25,35%,25%)] hover:bg-[hsl(25,40%,15%)]"
              }`}
            >
              {(item as any).sold_out
                ? "Sold Out"
                : !item.is_available_now
                  ? "Unavailable"
                  : addingToCart
                    ? "Adding..."
                    : `Add to Cart • ${formatPrice(finalTotal)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
