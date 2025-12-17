/**
 * Purpose: Cart context and hook for managing cart state across the application.
 * Handles local cart state, Supabase persistence for authenticated users, and cart operations.
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/src/integrations/supabase/client";
import type { CartItem } from "@/src/types/cart";
import {
  generateCartItemId,
  calculateItemPrice,
  calculateCartTotals,
} from "@/src/lib/cart-utils";
import { toast } from "sonner";

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  isLoading: boolean;
  addItem: (item: Omit<CartItem, "cartItemId" | "quantity">) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const GUEST_CART_KEY = "guest_cart_items";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();

  // Calculate totals
  const { totalItems, totalPrice } = calculateCartTotals(items);

  // Check auth state and load cart
  useEffect(() => {
    async function initializeCart() {
      try {
        setIsLoading(true);

        // Check if user is authenticated
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUserId(user?.id || null);

        if (user) {
          // Load cart from Supabase for authenticated user
          // Use maybeSingle() to avoid errors when cart doesn't exist yet
          const { data, error } = await supabase
            .from("carts")
            .select("items")
            .eq("user_id", user.id)
            .maybeSingle();

          // Log errors (except "not found" which is expected for new users)
          if (error && error.code !== "PGRST116") {
            console.error("Error loading cart:", error);
          }

          // Load cart items if data exists
          if (data) {
            const cartData = data as { items: CartItem[] | null } | null;
            if (cartData?.items && Array.isArray(cartData.items)) {
              setItems(cartData.items);
            }
          }
          // Clear guest cart when user logs in
          try {
            localStorage.removeItem(GUEST_CART_KEY);
          } catch {
            // Ignore localStorage errors
          }
        } else {
          // For guests, load cart from localStorage
          try {
            const stored = localStorage.getItem(GUEST_CART_KEY);
            if (stored) {
              const parsedItems = JSON.parse(stored);
              if (Array.isArray(parsedItems)) {
                setItems(parsedItems);
              }
            }
          } catch (error) {
            console.error("Error loading guest cart from localStorage:", error);
            // Clear corrupted data
            try {
              localStorage.removeItem(GUEST_CART_KEY);
            } catch {
              // Ignore
            }
          }
        }
      } catch (error) {
        console.error("Error initializing cart:", error);
      } finally {
        setIsLoading(false);
      }
    }

    initializeCart();
  }, [supabase]);

  // Persist cart to Supabase when items change (for authenticated users)
  const persistCart = useCallback(
    async (newItems: CartItem[]) => {
      if (!userId) return;

      try {
        const { error } = await (supabase.from("carts").upsert as any)(
          {
            user_id: userId,
            items: newItems,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

        if (error) {
          console.error("Error persisting cart:", error);
          toast.error("Failed to save cart to server");
        }
      } catch (error) {
        console.error("Error persisting cart:", error);
      }
    },
    [userId, supabase]
  );

  // Add item to cart
  const addItem = useCallback(
    async (item: Omit<CartItem, "cartItemId" | "quantity">) => {
      const cartItemId = generateCartItemId(item.productId, item.modifiers);

      setItems((prevItems) => {
        const existingItem = prevItems.find((i) => i.cartItemId === cartItemId);

        let newItems: CartItem[];
        if (existingItem) {
          // Increment quantity if item already exists
          newItems = prevItems.map((i) =>
            i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + 1 } : i
          );
        } else {
          // Add new item with quantity 1
          newItems = [
            ...prevItems,
            {
              ...item,
              cartItemId,
              quantity: 1,
            },
          ];
        }

        // Persist to Supabase (for authenticated users) or localStorage (for guests)
        persistCart(newItems);
        if (!userId) {
          // Save to localStorage for guests
          try {
            localStorage.setItem(GUEST_CART_KEY, JSON.stringify(newItems));
          } catch (error) {
            console.error("Error saving guest cart to localStorage:", error);
          }
        }

        return newItems;
      });
    },
    [persistCart, userId]
  );

  // Remove item from cart
  const removeItem = useCallback(
    async (cartItemId: string) => {
      setItems((prevItems) => {
        const newItems = prevItems.filter((i) => i.cartItemId !== cartItemId);
        persistCart(newItems);
        if (!userId) {
          // Save to localStorage for guests
          try {
            localStorage.setItem(GUEST_CART_KEY, JSON.stringify(newItems));
          } catch (error) {
            console.error("Error saving guest cart to localStorage:", error);
          }
        }
        return newItems;
      });
    },
    [persistCart, userId]
  );

  // Update item quantity
  const updateQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      if (quantity <= 0) {
        await removeItem(cartItemId);
        return;
      }

      if (quantity > 50) {
        toast.error("Maximum quantity is 50");
        return;
      }

      setItems((prevItems) => {
        const newItems = prevItems.map((i) =>
          i.cartItemId === cartItemId ? { ...i, quantity } : i
        );
        persistCart(newItems);
        if (!userId) {
          // Save to localStorage for guests
          try {
            localStorage.setItem(GUEST_CART_KEY, JSON.stringify(newItems));
          } catch (error) {
            console.error("Error saving guest cart to localStorage:", error);
          }
        }
        return newItems;
      });
    },
    [persistCart, removeItem, userId]
  );

  // Clear cart
  const clearCart = useCallback(async () => {
    setItems([]);
    await persistCart([]);
    if (!userId) {
      // Clear localStorage for guests
      try {
        localStorage.removeItem(GUEST_CART_KEY);
      } catch (error) {
        console.error("Error clearing guest cart from localStorage:", error);
      }
    }
  }, [persistCart, userId]);

  const value: CartContextType = {
    items,
    totalItems,
    totalPrice,
    isLoading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
