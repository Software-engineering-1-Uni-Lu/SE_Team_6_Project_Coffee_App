/**
 * Unit Tests for Cart Utilities
 * Tests cart-related utility functions for ID generation, pricing, and calculations
 */

import {
  generateCartItemId,
  calculateItemPrice,
  formatPrice,
  calculateCartTotals,
} from "../cart-utils";
import type { CartItem } from "@/src/types/cart";

describe("cart-utils", () => {
  describe("generateCartItemId", () => {
    it("returns productId when no modifiers provided", () => {
      const result = generateCartItemId("product-123");
      expect(result).toBe("product-123");
    });

    it("returns productId when modifiers array is empty", () => {
      const result = generateCartItemId("product-123", []);
      expect(result).toBe("product-123");
    });

    it("generates ID with single modifier", () => {
      const modifiers = [{ label: "Extra Shot", price: 50 }];
      const result = generateCartItemId("coffee-1", modifiers);
      expect(result).toBe("coffee-1__Extra Shot:50");
    });

    it("generates ID with multiple modifiers sorted alphabetically", () => {
      const modifiers = [
        { label: "Soy Milk", price: 30 },
        { label: "Extra Shot", price: 50 },
      ];
      const result = generateCartItemId("coffee-1", modifiers);
      expect(result).toBe("coffee-1__Extra Shot:50|Soy Milk:30");
    });

    it("sorts modifiers consistently regardless of input order", () => {
      const modifiers1 = [
        { label: "Extra Shot", price: 50 },
        { label: "Soy Milk", price: 30 },
      ];
      const modifiers2 = [
        { label: "Soy Milk", price: 30 },
        { label: "Extra Shot", price: 50 },
      ];

      const id1 = generateCartItemId("coffee-1", modifiers1);
      const id2 = generateCartItemId("coffee-1", modifiers2);

      expect(id1).toBe(id2);
    });

    it("handles modifiers with special characters", () => {
      const modifiers = [{ label: "Extra-Large", price: 100 }];
      const result = generateCartItemId("product-1", modifiers);
      expect(result).toBe("product-1__Extra-Large:100");
    });

    it("handles modifiers with zero price", () => {
      const modifiers = [{ label: "No Sugar", price: 0 }];
      const result = generateCartItemId("drink-1", modifiers);
      expect(result).toBe("drink-1__No Sugar:0");
    });

    it("generates unique IDs for different modifier combinations", () => {
      const id1 = generateCartItemId("coffee-1", [
        { label: "Extra Shot", price: 50 },
      ]);
      const id2 = generateCartItemId("coffee-1", [
        { label: "Soy Milk", price: 30 },
      ]);

      expect(id1).not.toBe(id2);
    });
  });

  describe("calculateItemPrice", () => {
    it("returns base price when no modifiers", () => {
      const price = calculateItemPrice(350);
      expect(price).toBe(350);
    });

    it("returns base price when modifiers array is empty", () => {
      const price = calculateItemPrice(350, []);
      expect(price).toBe(350);
    });

    it("adds single modifier price to base price", () => {
      const modifiers = [{ label: "Extra Shot", price: 50 }];
      const price = calculateItemPrice(350, modifiers);
      expect(price).toBe(400);
    });

    it("adds multiple modifier prices to base price", () => {
      const modifiers = [
        { label: "Extra Shot", price: 50 },
        { label: "Soy Milk", price: 30 },
        { label: "Caramel Syrup", price: 40 },
      ];
      const price = calculateItemPrice(350, modifiers);
      expect(price).toBe(470); // 350 + 50 + 30 + 40
    });

    it("handles zero base price", () => {
      const modifiers = [{ label: "Extra Shot", price: 50 }];
      const price = calculateItemPrice(0, modifiers);
      expect(price).toBe(50);
    });

    it("handles modifiers with zero price", () => {
      const modifiers = [
        { label: "No Sugar", price: 0 },
        { label: "Extra Shot", price: 50 },
      ];
      const price = calculateItemPrice(350, modifiers);
      expect(price).toBe(400);
    });

    it("handles negative modifier prices (discounts)", () => {
      const modifiers = [{ label: "Discount", price: -50 }];
      const price = calculateItemPrice(350, modifiers);
      expect(price).toBe(300);
    });
  });

  describe("formatPrice", () => {
    it("formats zero cents correctly", () => {
      expect(formatPrice(0)).toBe("€0.00");
    });

    it("formats single digit cents", () => {
      expect(formatPrice(5)).toBe("€0.05");
    });

    it("formats double digit cents", () => {
      expect(formatPrice(50)).toBe("€0.50");
    });

    it("formats euros without cents", () => {
      expect(formatPrice(100)).toBe("€1.00");
    });

    it("formats euros with cents", () => {
      expect(formatPrice(350)).toBe("€3.50");
    });

    it("formats large amounts", () => {
      expect(formatPrice(12345)).toBe("€123.45");
    });

    it("handles amounts with single cent", () => {
      expect(formatPrice(101)).toBe("€1.01");
    });

    it("formats amounts ending in 9", () => {
      expect(formatPrice(199)).toBe("€1.99");
    });

    it("handles negative amounts", () => {
      expect(formatPrice(-350)).toBe("€-3.50");
    });
  });

  describe("calculateCartTotals", () => {
    it("returns zero totals for empty cart", () => {
      const result = calculateCartTotals([]);
      expect(result).toEqual({
        totalItems: 0,
        totalPrice: 0,
      });
    });

    it("calculates totals for single item with quantity 1", () => {
      const items: CartItem[] = [
        {
          cartItemId: "item-1",
          productId: "product-1",
          name: "Coffee",
          price: 350,
          basePrice: 350,
          quantity: 1,
        },
      ];

      const result = calculateCartTotals(items);
      expect(result).toEqual({
        totalItems: 1,
        totalPrice: 350,
      });
    });

    it("calculates totals for single item with multiple quantity", () => {
      const items: CartItem[] = [
        {
          cartItemId: "item-1",
          productId: "product-1",
          name: "Coffee",
          price: 350,
          basePrice: 350,
          quantity: 3,
        },
      ];

      const result = calculateCartTotals(items);
      expect(result).toEqual({
        totalItems: 3,
        totalPrice: 1050, // 350 * 3
      });
    });

    it("calculates totals for multiple items", () => {
      const items: CartItem[] = [
        {
          cartItemId: "item-1",
          productId: "product-1",
          name: "Coffee",
          price: 350,
          basePrice: 350,
          quantity: 2,
        },
        {
          cartItemId: "item-2",
          productId: "product-2",
          name: "Pastry",
          price: 250,
          basePrice: 250,
          quantity: 1,
        },
      ];

      const result = calculateCartTotals(items);
      expect(result).toEqual({
        totalItems: 3, // 2 + 1
        totalPrice: 950, // (350 * 2) + (250 * 1)
      });
    });

    it("handles items with zero price", () => {
      const items: CartItem[] = [
        {
          cartItemId: "item-1",
          productId: "product-1",
          name: "Free Sample",
          price: 0,
          basePrice: 0,
          quantity: 2,
        },
      ];

      const result = calculateCartTotals(items);
      expect(result).toEqual({
        totalItems: 2,
        totalPrice: 0,
      });
    });

    it("handles items with zero quantity", () => {
      const items: CartItem[] = [
        {
          cartItemId: "item-1",
          productId: "product-1",
          name: "Coffee",
          price: 350,
          basePrice: 350,
          quantity: 0,
        },
      ];

      const result = calculateCartTotals(items);
      expect(result).toEqual({
        totalItems: 0,
        totalPrice: 0,
      });
    });

    it("calculates complex cart with modifiers", () => {
      const items: CartItem[] = [
        {
          cartItemId: "item-1",
          productId: "coffee-1",
          name: "Latte",
          price: 400, // Base price + modifiers already calculated
          basePrice: 350,
          quantity: 2,
          modifiers: [{ label: "Extra Shot", price: 50 }],
        },
        {
          cartItemId: "item-2",
          productId: "coffee-1",
          name: "Latte",
          price: 350, // Without modifiers
          basePrice: 350,
          quantity: 1,
        },
        {
          cartItemId: "item-3",
          productId: "pastry-1",
          name: "Croissant",
          price: 250,
          basePrice: 250,
          quantity: 3,
        },
      ];

      const result = calculateCartTotals(items);
      expect(result).toEqual({
        totalItems: 6, // 2 + 1 + 3
        totalPrice: 1900, // (400 * 2) + (350 * 1) + (250 * 3)
      });
    });
  });

  describe("Edge Cases and Integration", () => {
    it("handles complete workflow: generate ID, calculate price, format, and total", () => {
      // Create cart item with modifiers
      const modifiers = [
        { label: "Extra Shot", price: 50 },
        { label: "Soy Milk", price: 30 },
      ];

      const cartItemId = generateCartItemId("coffee-1", modifiers);
      const itemPrice = calculateItemPrice(350, modifiers);

      const items: CartItem[] = [
        {
          cartItemId,
          productId: "coffee-1",
          name: "Latte",
          price: itemPrice,
          basePrice: 350,
          quantity: 2,
          modifiers,
        },
      ];

      const totals = calculateCartTotals(items);
      const formattedTotal = formatPrice(totals.totalPrice);

      expect(cartItemId).toBe("coffee-1__Extra Shot:50|Soy Milk:30");
      expect(itemPrice).toBe(430);
      expect(totals.totalItems).toBe(2);
      expect(totals.totalPrice).toBe(860);
      expect(formattedTotal).toBe("€8.60");
    });

    it("handles large quantities and prices", () => {
      const items: CartItem[] = [
        {
          cartItemId: "item-1",
          productId: "product-1",
          name: "Bulk Order",
          price: 99999,
          basePrice: 99999,
          quantity: 100,
        },
      ];

      const result = calculateCartTotals(items);
      expect(result.totalItems).toBe(100);
      expect(result.totalPrice).toBe(9999900);
    });
  });
});
