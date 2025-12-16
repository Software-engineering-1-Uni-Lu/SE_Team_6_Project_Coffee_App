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
          const { data, error } = await supabase
            .from("carts")
            .select("items")
            .eq("user_id", user.id)
            .single();

          if (error && error.code !== "PGRST116") {
            // PGRST116 = no rows returned
            console.error("Error loading cart:", error);
          } else if (data?.items) {
            setItems(Array.isArray(data.items) ? data.items : []);
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
        const { error } = await supabase.from("carts").upsert(
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

        // Persist to Supabase
        persistCart(newItems);

        return newItems;
      });
    },
    [persistCart]
  );

  // Remove item from cart
  const removeItem = useCallback(
    async (cartItemId: string) => {
      setItems((prevItems) => {
        const newItems = prevItems.filter((i) => i.cartItemId !== cartItemId);
        persistCart(newItems);
        return newItems;
      });
    },
    [persistCart]
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
        return newItems;
      });
    },
    [persistCart, removeItem]
  );

  // Clear cart
  const clearCart = useCallback(async () => {
    setItems([]);
    await persistCart([]);
  }, [persistCart]);

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
