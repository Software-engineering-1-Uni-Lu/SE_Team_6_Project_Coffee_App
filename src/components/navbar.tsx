/**
 * Purpose: Global navigation bar component that appears on all pages.
 * Provides links to all main application routes and cart modal trigger.
 * Now includes session-aware and role-based navigation.
 */

"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/src/hooks/use-cart";
import { useRouter } from "next/navigation";
import { useUser } from "@/src/hooks/useUser";

interface NavbarProps {
  onCartOpen: () => void;
}

export function Navbar({ onCartOpen }: NavbarProps) {
  const { totalItems } = useCart();
  const { user, role, loading } = useUser();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      // Force full page reload to clear all state and session
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
      setLoggingOut(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-[hsl(35,20%,98%)] shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-[hsl(25,35%,25%)]">
              Café Aroma
            </Link>

            <div className="hidden items-center gap-6 md:flex">
              {/* Menu link - only show to customers and guests */}
              {(role === "customer" || !user) && (
                <Link
                  href="/menu"
                  className="text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:text-[hsl(25,40%,15%)]"
                >
                  Menu
                </Link>
              )}

              {/* Orders link for guests */}
              {!user && (
                <Link
                  href="/orders"
                  className="text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:text-[hsl(25,40%,15%)]"
                >
                  Orders
                </Link>
              )}

              {/* My Orders link - only show to customers */}
              {user && role === "customer" && (
                <Link
                  href="/orders"
                  className="text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:text-[hsl(25,40%,15%)]"
                >
                  My Orders
                </Link>
              )}

              {/* Admin dropdown - show to manager and admin */}
              {user && (role === "manager" || role === "admin") && (
                <div className="group relative">
                  <button className="text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:text-[hsl(25,40%,15%)]">
                    {role === "manager" ? "Manager" : "Admin"}
                  </button>
                  <div className="invisible absolute left-0 mt-2 w-48 rounded-md bg-white opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
                    <Link
                      href="/admin"
                      className="block px-4 py-2 text-sm text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/admin/staff"
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
              )}

              {/* Staff dropdown - show to staff, manager, and admin */}
              {user &&
                (role === "staff" ||
                  role === "manager" ||
                  role === "admin") && (
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
                )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Cart and Checkout - only show to customers and guests */}
            {(role === "customer" || !user) && (
              <>
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
              </>
            )}

            {/* Show login/register when not authenticated */}
            {!loading && !user && (
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
            )}

            {/* Show user menu when authenticated */}
            {!loading && user && (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/profile"
                  className="hidden px-4 py-2 text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:text-[hsl(25,40%,15%)] md:block"
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
