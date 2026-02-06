/**
 * Menu availability utilities.
 * - Sold-out from ingredients: items are out of stock when any recipe ingredient has insufficient stock.
 * - Low stock / sold out badges: for staff menu and display.
 */

export type AvailabilityStatus = "available" | "low-stock" | "sold-out";

/** Recipe row as returned from item_ingredients + beans join */
export interface RecipeRow {
  item_id: string;
  quantity_needed: number;
  beans?: { stock_quantity: number } | null;
}

/**
 * Compute which menu item IDs are out of stock based on ingredient (recipe) data.
 * An item is out of stock if any of its recipe rows has stock_quantity < quantity_needed.
 * Used by customer menu to show "Sold Out" when ingredients are insufficient.
 */
export function computeOutOfStockItemIds(recipeData: RecipeRow[]): Set<string> {
  const outOfStockIds = new Set<string>();
  for (const row of recipeData) {
    const stock = row.beans?.stock_quantity ?? 0;
    if (stock < row.quantity_needed) {
      outOfStockIds.add(row.item_id);
    }
  }
  return outOfStockIds;
}

/**
 * Enrich items with sold_out flag from ingredient availability.
 * sold_out is true if item.sold_out is already true OR item is in outOfStockIds.
 */
export function enrichItemsWithSoldOut<
  T extends { id: string; sold_out?: boolean },
>(items: T[], outOfStockIds: Set<string>): (T & { sold_out: boolean })[] {
  return items.map((item) => ({
    ...item,
    sold_out: Boolean(item.sold_out) || outOfStockIds.has(item.id),
  }));
}

/**
 * Get availability status for staff menu / display (item-level stock).
 * Rules: !is_available_now or stock_quantity === 0 → sold-out;
 *        stock_quantity <= low_stock_threshold → low-stock; else available.
 */
export function getAvailabilityStatus(item: {
  is_available_now?: boolean;
  stock_quantity?: number | null;
  low_stock_threshold?: number | null;
}): AvailabilityStatus {
  if (item.is_available_now === false) return "sold-out";
  const stock = item.stock_quantity ?? 0;
  if (stock === 0) return "sold-out";
  const threshold = item.low_stock_threshold ?? 0;
  if (threshold !== null && threshold !== undefined && stock <= threshold)
    return "low-stock";
  return "available";
}
