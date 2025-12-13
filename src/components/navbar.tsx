/**
 * Purpose: Global navigation bar component that appears on all pages.
 * Provides links to all main application routes and cart modal trigger.
 */

"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/src/hooks/use-cart";

interface NavbarProps {
  onCartOpen: () => void;
}

export function Navbar({ onCartOpen }: NavbarProps) {
  const { totalItems } = useCart();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-[hsl(35,20%,98%)] shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-[hsl(25,35%,25%)]">
              Café Aroma
            </Link>

            <div className="hidden items-center gap-6 md:flex">
              <Link
                href="/menu"
                className="text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:text-[hsl(25,40%,15%)]"
              >
                Menu
              </Link>

              <div className="group relative">
                <button className="text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:text-[hsl(25,40%,15%)]">
                  Customer
                </button>
                <div className="invisible absolute left-0 mt-2 w-48 rounded-md bg-white opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
                  <Link
                    href="/customer/orders"
                    className="block px-4 py-2 text-sm text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
                  >
                    My Orders
                  </Link>
                  <Link
                    href="/customer/account"
                    className="block px-4 py-2 text-sm text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
                  >
                    My Account
                  </Link>
                </div>
              </div>

              <div className="group relative">
                <button className="text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:text-[hsl(25,40%,15%)]">
                  Manager
                </button>
                <div className="invisible absolute left-0 mt-2 w-48 rounded-md bg-white opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
                  <Link
                    href="/manager/dashboard"
                    className="block px-4 py-2 text-sm text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/manager/staff-management"
                    className="block px-4 py-2 text-sm text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
                  >
                    Staff Management
                  </Link>
                  <Link
                    href="/manager/menu"
                    className="block px-4 py-2 text-sm text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
                  >
                    Menu Management
                  </Link>
                </div>
              </div>

              <div className="group relative">
                <button className="text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:text-[hsl(25,40%,15%)]">
                  Staff
                </button>
                <div className="invisible absolute left-0 mt-2 w-48 rounded-md bg-white opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
                  <Link
                    href="/staff/menu"
                    className="block px-4 py-2 text-sm text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
                  >
                    Menu
                  </Link>
                  <Link
                    href="/staff/orders"
                    className="block px-4 py-2 text-sm text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
                  >
                    Orders
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onCartOpen}
              className="relative px-4 py-2 text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:text-[hsl(25,40%,15%)]"
            >
              Cart
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(25,35%,25%)] text-xs text-white">
                  {totalItems}
                </span>
              )}
            </button>

            <Link
              href="/checkout"
              className="hidden px-4 py-2 text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:text-[hsl(25,40%,15%)] md:block"
            >
              Checkout
            </Link>

            <Link
              href="/account"
              className="hidden px-4 py-2 text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:text-[hsl(25,40%,15%)] md:block"
            >
              Account
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="px-4 py-2 text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:text-[hsl(25,40%,15%)]"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)]"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
