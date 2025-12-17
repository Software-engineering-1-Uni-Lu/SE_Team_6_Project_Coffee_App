/**
 * Unit Tests for useCart Hook
 * Tests cart functionality with mocked Supabase client
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { CartProvider, useCart } from "../use-cart";
import { createClient } from "@/src/integrations/supabase/client";
import type { ReactNode } from "react";

// Mock Supabase client
jest.mock("@/src/integrations/supabase/client");
// Mock toast
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
};

describe("useCart Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // Default mock implementations
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
      delete: jest.fn().mockReturnThis(),
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <CartProvider>{children}</CartProvider>
  );

  describe("Initialization", () => {
    it("initializes with empty cart", async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.totalItems).toBe(0);
      expect(result.current.totalPrice).toBe(0);
    });

    it("loads cart from Supabase for authenticated user", async () => {
      const mockUser = { id: "user-123" };
      const mockCartItems = [
        {
          cartItemId: "item-1",
          productId: "product-1",
          name: "Coffee",
          price: 350,
          basePrice: 350,
          quantity: 2,
        },
      ];

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { items: mockCartItems },
          error: null,
        }),
      });

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual(mockCartItems);
      expect(result.current.totalItems).toBe(2);
      expect(result.current.totalPrice).toBe(700);
    });

    it("handles cart loading error gracefully", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const mockUser = { id: "user-123" };

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "ERROR", message: "Database error" },
        }),
      });

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("handles missing cart data for new user (PGRST116)", async () => {
      const mockUser = { id: "user-123" };

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows returned" },
        }),
      });

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
    });
  });

  describe("addItem", () => {
    it("adds new item to empty cart", async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newItem = {
        productId: "product-1",
        name: "Coffee",
        price: 350,
        basePrice: 350,
      };

      await act(async () => {
        await result.current.addItem(newItem);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toMatchObject({
        ...newItem,
        quantity: 1,
      });
      expect(result.current.totalItems).toBe(1);
      expect(result.current.totalPrice).toBe(350);
    });

    it("increments quantity when adding existing item", async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const item = {
        productId: "product-1",
        name: "Coffee",
        price: 350,
        basePrice: 350,
      };

      await act(async () => {
        await result.current.addItem(item);
        await result.current.addItem(item);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(2);
      expect(result.current.totalItems).toBe(2);
      expect(result.current.totalPrice).toBe(700);
    });

    it("treats items with different modifiers as separate items", async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const baseItem = {
        productId: "coffee-1",
        name: "Latte",
        price: 350,
        basePrice: 350,
      };

      const itemWithModifier = {
        ...baseItem,
        price: 400,
        modifiers: [{ label: "Extra Shot", price: 50 }],
      };

      await act(async () => {
        await result.current.addItem(baseItem);
        await result.current.addItem(itemWithModifier);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.totalItems).toBe(2);
    });
  });

  describe("removeItem", () => {
    it("removes item from cart", async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const item = {
        productId: "product-1",
        name: "Coffee",
        price: 350,
        basePrice: 350,
      };

      await act(async () => {
        await result.current.addItem(item);
      });

      const cartItemId = result.current.items[0].cartItemId;

      await act(async () => {
        await result.current.removeItem(cartItemId);
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.totalItems).toBe(0);
      expect(result.current.totalPrice).toBe(0);
    });

    it("handles removing non-existent item", async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.removeItem("non-existent-id");
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe("updateQuantity", () => {
    it("updates item quantity", async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const item = {
        productId: "product-1",
        name: "Coffee",
        price: 350,
        basePrice: 350,
      };

      await act(async () => {
        await result.current.addItem(item);
      });

      const cartItemId = result.current.items[0].cartItemId;

      await act(async () => {
        await result.current.updateQuantity(cartItemId, 5);
      });

      expect(result.current.items[0].quantity).toBe(5);
      expect(result.current.totalItems).toBe(5);
      expect(result.current.totalPrice).toBe(1750); // 350 * 5
    });

    it("removes item when quantity set to 0", async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const item = {
        productId: "product-1",
        name: "Coffee",
        price: 350,
        basePrice: 350,
      };

      await act(async () => {
        await result.current.addItem(item);
      });

      const cartItemId = result.current.items[0].cartItemId;

      await act(async () => {
        await result.current.updateQuantity(cartItemId, 0);
      });

      expect(result.current.items).toHaveLength(0);
    });

    it("handles updating non-existent item", async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateQuantity("non-existent-id", 5);
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe("clearCart", () => {
    it("clears all items from cart", async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const item1 = {
        productId: "product-1",
        name: "Coffee",
        price: 350,
        basePrice: 350,
      };

      const item2 = {
        productId: "product-2",
        name: "Pastry",
        price: 250,
        basePrice: 250,
      };

      await act(async () => {
        await result.current.addItem(item1);
        await result.current.addItem(item2);
      });

      expect(result.current.items).toHaveLength(2);

      await act(async () => {
        await result.current.clearCart();
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.totalItems).toBe(0);
      expect(result.current.totalPrice).toBe(0);
    });

    it("clearing empty cart has no effect", async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.clearCart();
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe("Cart Totals", () => {
    it("calculates correct totals for multiple items", async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addItem({
          productId: "product-1",
          name: "Coffee",
          price: 350,
          basePrice: 350,
        });
        await result.current.addItem({
          productId: "product-1",
          name: "Coffee",
          price: 350,
          basePrice: 350,
        });
        await result.current.addItem({
          productId: "product-2",
          name: "Pastry",
          price: 250,
          basePrice: 250,
        });
      });

      expect(result.current.totalItems).toBe(3); // 2 coffees + 1 pastry
      expect(result.current.totalPrice).toBe(950); // (350 * 2) + 250
    });

    it("updates totals when items are removed", async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addItem({
          productId: "product-1",
          name: "Coffee",
          price: 350,
          basePrice: 350,
        });
        await result.current.addItem({
          productId: "product-2",
          name: "Pastry",
          price: 250,
          basePrice: 250,
        });
      });

      const firstItemId = result.current.items[0].cartItemId;

      await act(async () => {
        await result.current.removeItem(firstItemId);
      });

      expect(result.current.totalItems).toBe(1);
      expect(result.current.totalPrice).toBe(250);
    });
  });
});
