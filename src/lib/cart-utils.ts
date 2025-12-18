/**
 * Purpose: Utility functions for cart operations.
 * Provides functions for cart calculations and item management.
 */

import type { CartItem } from "@/src/types/cart";

/**
 * Generate a unique cart item ID based on product ID and modifiers
 */
export function generateCartItemId(
  productId: string,
  modifiers?: { label: string; price: number }[]
): string {
  if (!modifiers || modifiers.length === 0) {
    return productId;
  }
  const modifierString = modifiers
    .map((m) => `${m.label}:${m.price}`)
    .sort()
    .join("|");
  return `${productId}__${modifierString}`;
}

/**
 * Calculate total price for a cart item
 */
export function calculateItemPrice(
  basePrice: number,
  modifiers?: { label: string; price: number }[]
): number {
  if (!modifiers || modifiers.length === 0) {
    return basePrice;
  }
  const modifierTotal = modifiers.reduce((sum, mod) => sum + mod.price, 0);
  return basePrice + modifierTotal;
}

/**
 * Format price from cents to currency string
 */
export function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

/**
 * Calculate cart totals
 */
export function calculateCartTotals(items: CartItem[]): {
  totalItems: number;
  totalPrice: number;
} {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  return { totalItems, totalPrice };
}
