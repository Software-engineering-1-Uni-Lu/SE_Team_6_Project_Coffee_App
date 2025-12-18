/**
 * Purpose: Type definitions for cart-related entities.
 * Defines interfaces for cart items and cart state.
 */

export interface CartModifier {
  label: string;
  price: number;
}

export interface CartItem {
  cartItemId: string; // Unique ID for this cart entry (productId + modifiers hash)
  productId: string; // Menu item ID
  name: string;
  price: number; // Final price in cents (base + modifiers)
  basePrice: number; // Base item price in cents
  quantity: number;
  modifiers?: CartModifier[];
  imageUrl?: string | null;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number; // In cents
}
