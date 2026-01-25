/**
 * Loyalty helpers for computing points cost.
 */

import type { CartItem } from "@/src/types/cart";

export function calculatePointsForCartItems(
  items: CartItem[],
  pointsPerEuro: number
): number {
  if (!Array.isArray(items) || pointsPerEuro <= 0) {
    return 0;
  }

  return items.reduce((sum, item) => {
    const priceCents = Math.max(0, item.price || 0);
    const quantity = Math.max(0, item.quantity || 0);
    if (quantity === 0) return sum;

    const eurosRoundedUp = Math.ceil(priceCents / 100);
    return sum + eurosRoundedUp * pointsPerEuro * quantity;
  }, 0);
}
