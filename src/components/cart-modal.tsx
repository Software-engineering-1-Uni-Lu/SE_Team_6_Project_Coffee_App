/**
 * Purpose: Modal component for displaying shopping cart.
 * Provides cart view and management functionality with open/close mechanics.
 */

"use client";

import Image from "next/image";
import { useCart } from "@/src/hooks/use-cart";
import { formatPrice } from "@/src/lib/cart-utils";
import Link from "next/link";

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartModal({ isOpen, onClose }: CartModalProps) {
  const { items, totalItems, totalPrice, updateQuantity, removeItem } =
    useCart();

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md transform bg-white shadow-xl transition-transform">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-xl font-bold text-[hsl(25,35%,25%)]">
              Cart ({totalItems})
            </h2>
            <button
              onClick={onClose}
              className="text-[hsl(25,35%,25%)] transition-colors hover:text-[hsl(25,40%,15%)]"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 text-6xl text-gray-300">🛒</div>
                <p className="mb-2 text-lg font-medium text-[hsl(25,35%,25%)]">
                  Your cart is empty
                </p>
                <p className="mb-6 text-sm text-[hsl(25,35%,45%)]">
                  Add some delicious items from our menu
                </p>
                <Link
                  href="/menu"
                  onClick={onClose}
                  className="rounded-md bg-[hsl(25,35%,25%)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)]"
                >
                  Browse Menu
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="flex gap-4 rounded-lg border border-[hsl(35,20%,90%)] p-3"
                  >
                    {/* Item image */}
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-[hsl(35,20%,95%)]">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl text-[hsl(25,35%,45%)]">
                          ☕
                        </div>
                      )}
                    </div>

                    {/* Item details */}
                    <div className="flex flex-1 flex-col">
                      <h3 className="font-semibold text-[hsl(25,35%,25%)]">
                        {item.name}
                      </h3>
                      <p className="text-sm text-[hsl(25,35%,45%)]">
                        {formatPrice(item.price)}
                      </p>

                      {/* Modifiers */}
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="mt-1">
                          {item.modifiers.map((mod, idx) => (
                            <p
                              key={idx}
                              className="text-xs text-[hsl(25,35%,45%)]"
                            >
                              + {mod.label}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Quantity controls */}
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateQuantity(item.cartItemId, item.quantity - 1)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-[hsl(35,20%,90%)] text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-[hsl(25,35%,25%)]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.cartItemId, item.quantity + 1)
                          }
                          disabled={item.quantity >= 50}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-[hsl(35,20%,90%)] text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeItem(item.cartItemId)}
                          className="ml-auto text-sm text-red-600 transition-colors hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-lg font-semibold text-[hsl(25,35%,25%)]">
                  Total
                </span>
                <span className="text-lg font-bold text-[hsl(25,35%,25%)]">
                  {formatPrice(totalPrice)}
                </span>
              </div>
              <Link
                href="/checkout"
                onClick={onClose}
                className="block w-full rounded-md bg-[hsl(25,35%,25%)] px-6 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)]"
              >
                Proceed to Checkout
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
