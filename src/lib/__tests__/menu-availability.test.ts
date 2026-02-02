/**
 * Tests for menu availability utilities:
 * - Sold out when ingredients are insufficient (customer menu)
 * - Low stock / sold out badges (staff menu, colleague's alert)
 */

import {
  computeOutOfStockItemIds,
  enrichItemsWithSoldOut,
  getAvailabilityStatus,
  type RecipeRow,
} from "../menu-availability";

describe("menu-availability", () => {
  describe("computeOutOfStockItemIds", () => {
    it("returns empty set when all ingredients have enough stock", () => {
      const recipeData: RecipeRow[] = [
        {
          item_id: "espresso-1",
          quantity_needed: 18,
          beans: { stock_quantity: 100 },
        },
        {
          item_id: "latte-1",
          quantity_needed: 18,
          beans: { stock_quantity: 50 },
        },
        {
          item_id: "latte-1",
          quantity_needed: 250,
          beans: { stock_quantity: 500 },
        },
      ];
      expect(computeOutOfStockItemIds(recipeData)).toEqual(new Set());
    });

    it("marks item out of stock when one ingredient has zero stock", () => {
      const recipeData: RecipeRow[] = [
        {
          item_id: "americano-1",
          quantity_needed: 18,
          beans: { stock_quantity: 0 },
        },
      ];
      expect(computeOutOfStockItemIds(recipeData)).toEqual(
        new Set(["americano-1"])
      );
    });

    it("marks item out of stock when stock is less than quantity_needed", () => {
      const recipeData: RecipeRow[] = [
        {
          item_id: "cappuccino-1",
          quantity_needed: 18,
          beans: { stock_quantity: 10 },
        },
      ];
      expect(computeOutOfStockItemIds(recipeData)).toEqual(
        new Set(["cappuccino-1"])
      );
    });

    it("marks item in stock when stock equals quantity_needed", () => {
      const recipeData: RecipeRow[] = [
        {
          item_id: "espresso-1",
          quantity_needed: 18,
          beans: { stock_quantity: 18 },
        },
      ];
      expect(computeOutOfStockItemIds(recipeData)).toEqual(new Set());
    });

    it("marks item out of stock when any recipe row for that item is insufficient", () => {
      const recipeData: RecipeRow[] = [
        {
          item_id: "latte-1",
          quantity_needed: 18,
          beans: { stock_quantity: 100 },
        },
        {
          item_id: "latte-1",
          quantity_needed: 250,
          beans: { stock_quantity: 100 },
        }, // milk insufficient
      ];
      expect(computeOutOfStockItemIds(recipeData)).toEqual(
        new Set(["latte-1"])
      );
    });

    it("handles missing beans (null/undefined) as zero stock", () => {
      const recipeData: RecipeRow[] = [
        { item_id: "item-1", quantity_needed: 10, beans: null },
        { item_id: "item-2", quantity_needed: 5, beans: undefined },
      ];
      expect(computeOutOfStockItemIds(recipeData)).toEqual(
        new Set(["item-1", "item-2"])
      );
    });

    it("when we have no ingredients at all for an item, item is not in out-of-stock set", () => {
      const recipeData: RecipeRow[] = [
        {
          item_id: "coffee-with-recipe",
          quantity_needed: 18,
          beans: { stock_quantity: 0 },
        },
      ];
      const out = computeOutOfStockItemIds(recipeData);
      expect(out.has("coffee-with-recipe")).toBe(true);
      expect(out.has("item-with-no-recipe")).toBe(false);
    });
  });

  describe("enrichItemsWithSoldOut", () => {
    it("sets sold_out true when item id is in outOfStockIds", () => {
      const items = [
        { id: "a", name: "Americano" },
        { id: "b", name: "Latte" },
      ];
      const outOfStockIds = new Set(["a"]);
      const enriched = enrichItemsWithSoldOut(items, outOfStockIds);
      expect(enriched[0].sold_out).toBe(true);
      expect(enriched[1].sold_out).toBe(false);
    });

    it("keeps sold_out true when item already had sold_out true", () => {
      const items = [{ id: "a", name: "Item", sold_out: true }];
      const enriched = enrichItemsWithSoldOut(items, new Set());
      expect(enriched[0].sold_out).toBe(true);
    });

    it("sets sold_out true when either manual flag or out-of-stock set", () => {
      const items = [{ id: "a", name: "Item", sold_out: false }];
      const enriched = enrichItemsWithSoldOut(items, new Set(["a"]));
      expect(enriched[0].sold_out).toBe(true);
    });
  });

  describe("getAvailabilityStatus (low stock / sold out badges)", () => {
    it("returns sold-out when is_available_now is false", () => {
      expect(
        getAvailabilityStatus({
          is_available_now: false,
          stock_quantity: 100,
          low_stock_threshold: 10,
        })
      ).toBe("sold-out");
    });

    it("returns sold-out when stock_quantity is 0", () => {
      expect(
        getAvailabilityStatus({
          is_available_now: true,
          stock_quantity: 0,
          low_stock_threshold: 10,
        })
      ).toBe("sold-out");
    });

    it("returns low-stock when stock_quantity <= low_stock_threshold", () => {
      expect(
        getAvailabilityStatus({
          is_available_now: true,
          stock_quantity: 10,
          low_stock_threshold: 10,
        })
      ).toBe("low-stock");
      expect(
        getAvailabilityStatus({
          is_available_now: true,
          stock_quantity: 5,
          low_stock_threshold: 10,
        })
      ).toBe("low-stock");
    });

    it("returns available when stock above threshold", () => {
      expect(
        getAvailabilityStatus({
          is_available_now: true,
          stock_quantity: 50,
          low_stock_threshold: 10,
        })
      ).toBe("available");
    });

    it("handles null/undefined stock and threshold", () => {
      expect(getAvailabilityStatus({})).toBe("sold-out"); // stock 0
      expect(
        getAvailabilityStatus({ stock_quantity: 20, low_stock_threshold: null })
      ).toBe("available");
    });
  });
});
