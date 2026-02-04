/**
 * Unit tests for promotion helpers: time filter, item scope, stacked discount.
 */

import {
  filterActivePromotionsByTime,
  promotionsForItem,
  applyPromotionsStacked,
} from "../promotions";
import type { Promotion } from "@/src/types/promotions";
import type { MenuItem } from "@/src/types/menu";

const basePromo = (overrides: Partial<Promotion> = {}): Promotion =>
  ({
    id: "p1",
    name: "Test",
    description: null,
    discount_type: "percent",
    value_cents: 0,
    percent: 0,
    active: true,
    start_at: null,
    end_at: null,
    category_id: null,
    item_id: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  }) as Promotion;

const baseItem = (overrides: Partial<MenuItem> = {}): MenuItem =>
  ({
    id: "item-1",
    category_id: "cat-1",
    name: "Coffee",
    slug: "coffee",
    description: null,
    price_cents: 400,
    image_url: null,
    allergens: [],
    vegetarian: false,
    vegan: false,
    active: true,
    modifiers: [],
    availability_start: null,
    availability_end: null,
    available_days: null,
    stock_quantity: 0,
    low_stock_threshold: 0,
    created_at: "",
    updated_at: "",
    ...overrides,
  }) as MenuItem;

describe("filterActivePromotionsByTime", () => {
  it("keeps active promos with no dates", () => {
    const list = [basePromo({ active: true, start_at: null, end_at: null })];
    expect(filterActivePromotionsByTime(list)).toHaveLength(1);
  });

  it("drops inactive promos", () => {
    const list = [basePromo({ active: false })];
    expect(filterActivePromotionsByTime(list)).toHaveLength(0);
  });

  it("drops promos not yet started", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const list = [basePromo({ start_at: future })];
    expect(filterActivePromotionsByTime(list)).toHaveLength(0);
  });

  it("keeps promos with start_at in the past", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const list = [basePromo({ start_at: past })];
    expect(filterActivePromotionsByTime(list)).toHaveLength(1);
  });

  it("drops promos past end_at", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const list = [basePromo({ end_at: past })];
    expect(filterActivePromotionsByTime(list)).toHaveLength(0);
  });

  it("keeps promos with end_at in the future", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const list = [basePromo({ end_at: future })];
    expect(filterActivePromotionsByTime(list)).toHaveLength(1);
  });
});

describe("promotionsForItem", () => {
  const item = baseItem({ id: "item-1", category_id: "cat-1" });

  it("returns promos scoped to this item", () => {
    const list = [
      basePromo({ item_id: "item-1", category_id: null }),
      basePromo({ item_id: "other", category_id: null }),
    ];
    expect(promotionsForItem(item, list)).toHaveLength(1);
    expect(promotionsForItem(item, list)[0].item_id).toBe("item-1");
  });

  it("returns promos scoped to this item's category", () => {
    const list = [
      basePromo({ item_id: null, category_id: "cat-1" }),
      basePromo({ item_id: null, category_id: "cat-2" }),
    ];
    expect(promotionsForItem(item, list)).toHaveLength(1);
    expect(promotionsForItem(item, list)[0].category_id).toBe("cat-1");
  });

  it("excludes global-only promos (both null)", () => {
    const list = [basePromo({ item_id: null, category_id: null })];
    expect(promotionsForItem(item, list)).toHaveLength(0);
  });

  it("can return both item and category promos", () => {
    const list = [
      basePromo({ item_id: "item-1", category_id: null }),
      basePromo({ item_id: null, category_id: "cat-1" }),
    ];
    expect(promotionsForItem(item, list)).toHaveLength(2);
  });
});

describe("applyPromotionsStacked", () => {
  it("returns original price when no promos", () => {
    const { discounted, combinedLabel } = applyPromotionsStacked(400, []);
    expect(discounted).toBe(400);
    expect(combinedLabel).toBe("");
  });

  it("applies percent first then amount", () => {
    // 400 -> 10% = 360, then -50 = 310
    const promos = [
      basePromo({ discount_type: "percent", percent: 10 }),
      basePromo({ discount_type: "amount", value_cents: 50 }),
    ];
    const { discounted, combinedLabel } = applyPromotionsStacked(400, promos);
    expect(discounted).toBe(310);
    expect(combinedLabel).toContain("% OFF");
  });

  it("rounds percent result", () => {
    const promos = [basePromo({ discount_type: "percent", percent: 33 })];
    const { discounted } = applyPromotionsStacked(100, promos);
    expect(discounted).toBe(67);
  });

  it("does not go below zero", () => {
    const promos = [basePromo({ discount_type: "amount", value_cents: 500 })];
    const { discounted } = applyPromotionsStacked(400, promos);
    expect(discounted).toBe(0);
  });

  it("produces combinedLabel for percent-like discount", () => {
    const promos = [basePromo({ discount_type: "percent", percent: 25 })];
    const { combinedLabel } = applyPromotionsStacked(400, promos);
    expect(combinedLabel).toBe("25% OFF");
  });

  it("produces amount-style label when effective percent rounds to 0", () => {
    const promos = [basePromo({ discount_type: "amount", value_cents: 1 })];
    const { discounted, combinedLabel } = applyPromotionsStacked(400, promos);
    expect(discounted).toBe(399);
    expect(combinedLabel).toMatch(/^-€0\.01$/);
  });
});
