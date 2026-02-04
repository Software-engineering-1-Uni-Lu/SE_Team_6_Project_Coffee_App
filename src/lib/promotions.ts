/**
 * Purpose: Promotion logic for menu items.
 * - Filter promotions by active and time window.
 * - Resolve which promotions apply to a menu item (item or category scope).
 * - Apply stacked discounts (percent first, then amount) and build a single UI label.
 */

import type { Promotion } from "@/src/types/promotions";
import type { MenuItem } from "@/src/types/menu";

/**
 * Filter promotions to those that are active and within their time window.
 * - active === true
 * - start_at: null or start_at <= now
 * - end_at: null or end_at >= now
 */
export function filterActivePromotionsByTime(
  promotions: Promotion[],
  now: Date = new Date()
): Promotion[] {
  const nowMs = now.getTime();
  return promotions.filter((p) => {
    if (!p.active) return false;
    if (p.start_at != null && new Date(p.start_at).getTime() > nowMs)
      return false;
    if (p.end_at != null && new Date(p.end_at).getTime() < nowMs) return false;
    return true;
  });
}

/**
 * Return promotions that apply to this menu item.
 * A promotion applies iff it is scoped to this item or to this item's category.
 * Global-only promotions (both item_id and category_id null) are not applied in the menu-item flow.
 */
export function promotionsForItem(
  item: MenuItem,
  activePromotions: Promotion[]
): Promotion[] {
  return activePromotions.filter(
    (p) =>
      (p.item_id != null && p.item_id === item.id) ||
      (p.category_id != null && p.category_id === item.category_id)
  );
}

/**
 * Apply stacked promotions to a price (in cents).
 * Order: percent discounts first, then amount discounts. Within each type, list order.
 * All math in cents; use Math.round after percent steps.
 */
export function applyPromotionsStacked(
  priceCents: number,
  promos: Promotion[]
): { discounted: number; combinedLabel: string } {
  let current = Math.max(0, priceCents);
  const original = current;

  // Percent first
  for (const p of promos) {
    if (p.discount_type === "percent" && p.percent > 0) {
      current = Math.round(current * (1 - p.percent / 100));
      current = Math.max(0, current);
    }
  }
  // Then amount
  for (const p of promos) {
    if (p.discount_type === "amount" && p.value_cents > 0) {
      current = Math.max(0, current - p.value_cents);
    }
  }

  const discounted = current;
  const savingsCents = original - discounted;

  let combinedLabel = "";
  if (savingsCents > 0 && original > 0) {
    const effectivePercent = Math.round((savingsCents / original) * 100);
    combinedLabel =
      effectivePercent >= 1
        ? `${effectivePercent}% OFF`
        : `-€${(savingsCents / 100).toFixed(2)}`;
  }

  return { discounted, combinedLabel };
}
