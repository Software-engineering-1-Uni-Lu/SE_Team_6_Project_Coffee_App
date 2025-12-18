/**
 * Purpose: Client-side layout wrapper that provides cart modal state management.
 * Wraps children with Navbar and CartModal components.
 */

"use client";

import { useState } from "react";
import { Navbar } from "@/src/components/navbar";
import { CartModal } from "@/src/components/cart-modal";
import { CartProvider } from "@/src/hooks/use-cart";
import { Toaster } from "sonner";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <CartProvider>
      <Navbar onCartOpen={() => setIsCartOpen(true)} />
      <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <Toaster position="top-right" richColors />
      {children}
    </CartProvider>
  );
}
