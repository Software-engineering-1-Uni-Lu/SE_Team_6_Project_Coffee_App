/**
 * Purpose: Checkout page for completing purchases.
 * Allows customers to finalize their order and make payment.
 * Supports both authenticated users and guest orders.
 */

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCart } from "@/src/hooks/use-cart";
import { useUser } from "@/src/hooks/useUser";
import { formatPrice } from "@/src/lib/cart-utils";
import { createClient } from "@/src/integrations/supabase/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { PickupTimePicker } from "@/src/components/pickup-time-picker";

const TAX_RATE = 0.1; // 10% tax rate

// Base checkout schema with optional guest fields
const baseCheckoutSchema = z.object({
  guest_name: z.string().optional(),
  guest_email: z.string().email().optional().or(z.literal("")),
  paymentMethod: z.enum(["card", "cash"]),
  cardNumber: z.string().optional(),
  cardName: z.string().optional(),
  expiry: z.string().optional(),
  cvc: z.string().optional(),
});

// Refined schema that validates based on payment method
const checkoutSchema = baseCheckoutSchema.refine(
  (data) => {
    // If card payment, require all card fields
    if (data.paymentMethod === "card") {
      const cardNumberDigits = data.cardNumber?.replace(/\s/g, "") || "";
      if (cardNumberDigits.length !== 16) {
        return false;
      }
      if (!data.cardName?.trim()) {
        return false;
      }
      const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
      if (!expiryRegex.test(data.expiry || "")) {
        return false;
      }
      // Check if card is not expired
      const [month, year] = (data.expiry || "").split("/");
      if (month && year) {
        const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
        const now = new Date();
        if (expiryDate < now) {
          return false;
        }
      }
      if (!data.cvc || data.cvc.length !== 3) {
        return false;
      }
    }
    return true;
  },
  {
    message: "Please complete all card details correctly",
    path: ["cardNumber"],
  }
);

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, isLoading: cartLoading, clearCart } = useCart();
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card");
  const [pickupTime, setPickupTime] = useState<Date | null>(null);

  // Calculate totals (EU VAT logic - prices include tax)
  const total = totalPrice; // Total stays the same as cart
  const netPrice = Math.round(total / (1 + TAX_RATE)); // Price without VAT
  const tax = total - netPrice; // VAT amount included in the price

  const isGuest = !user;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      guest_name: "",
      guest_email: "",
      paymentMethod: "card",
      cardNumber: "",
      cardName: "",
      expiry: "",
      cvc: "",
    },
  });

  // Watch payment method to update state
  const watchedPaymentMethod = watch("paymentMethod");

  useEffect(() => {
    if (watchedPaymentMethod) {
      setPaymentMethod(watchedPaymentMethod);
    }
  }, [watchedPaymentMethod]);

  // Redirect if cart is empty (only after cart has finished loading)
  useEffect(() => {
    // Wait for both cart and user loading to complete before redirecting
    // This prevents premature redirects during initialization
    if (!cartLoading && !userLoading && items.length === 0) {
      router.push("/menu");
    }
  }, [cartLoading, userLoading, items.length, router]);

  // Format card number input
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s/g, "");
    value = value.replace(/(\d{4})/g, "$1 ").trim();
    value = value.slice(0, 19); // Limit to 16 digits + 3 spaces
    setValue("cardNumber", value);
  };

  // Format expiry input
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length >= 2) {
      value = value.slice(0, 2) + "/" + value.slice(2, 4);
    }
    value = value.slice(0, 5); // Limit to MM/YY
    setValue("expiry", value);
  };

  // Format CVC input
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 3);
    setValue("cvc", value);
  };

  const onSubmit = async (data: CheckoutFormData) => {
    setIsSubmitting(true);

    try {
      // CRITICAL: Fresh auth check at submit time to avoid stale state
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      const isActuallyGuest = !currentUser;

      // Validate guest fields for guest checkout
      if (isActuallyGuest) {
        if (!data.guest_name || !data.guest_name.trim()) {
          toast.error("Please enter your name");
          return;
        }
        if (!data.guest_email || !data.guest_email.trim()) {
          toast.error("Please enter your email address");
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.guest_email)) {
          toast.error("Please enter a valid email address");
          return;
        }
      }

      // Prepare order items in the format expected by the database
      const orderItems = items.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        basePrice: item.basePrice,
        quantity: item.quantity,
        modifiers: item.modifiers || [],
        imageUrl: item.imageUrl,
      }));

      // Prepare order data
      // For authenticated users: customer_id is set, guest_name and guest_email are null
      // For guest users: customer_id is null, guest_name and guest_email are set
      const orderData: {
        customer_id: string | null;
        guest_name: string | null;
        guest_email: string | null;
        status: string;
        items: typeof orderItems;
        subtotal_cents: number;
        tax_cents: number;
        total_cents: number;
        payment_method: "card" | "cash";
        payment_status: string;
        pickup_time: string | null;
      } = {
        customer_id: isActuallyGuest ? null : currentUser?.id || null,
        guest_name: isActuallyGuest ? data.guest_name?.trim() || null : null,
        guest_email: isActuallyGuest ? data.guest_email?.trim() || null : null,
        status: "pending",
        items: orderItems,
        subtotal_cents: netPrice,
        tax_cents: tax,
        total_cents: total,
        payment_method: data.paymentMethod,
        payment_status: data.paymentMethod === "card" ? "paid" : "unpaid",
        pickup_time: pickupTime ? pickupTime.toISOString() : null,
      };

      // GUEST ORDERS: Client-side only (bypass API route completely)
      // Solution 1 from the guide: Create a fresh client with NO storage access
      // This ensures no session can be loaded, so auth.uid() IS NULL naturally
      if (isActuallyGuest) {
        // Create a FRESH client instance specifically for guest orders
        // This client has NO storage access, so it can't load any session
        // This matches Solution 1 from the guide
        const guestClient = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            auth: {
              // CRITICAL: No storage access = no session can be loaded
              storage: {
                getItem: () => null, // Never return any stored session
                setItem: () => {}, // Never store sessions
                removeItem: () => {}, // Never remove
              },
              persistSession: false, // Don't persist sessions
              autoRefreshToken: false, // Don't auto-refresh
            },
            global: {
              // Custom fetch for anonymous requests
              // Supabase REST API requires Authorization header for authentication
              // BUT: When Authorization is the anon key (not a user JWT), auth.uid() IS NULL
              fetch: (url, options = {}) => {
                const headers = new Headers(options.headers);
                const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

                // Ensure apikey is set (required for Supabase REST API)
                if (!headers.has("apikey")) {
                  headers.set("apikey", anonKey);
                }

                // CRITICAL: Set Authorization header with anon key
                // The anon key is NOT a user JWT, so auth.uid() will be NULL
                // But Supabase REST API needs this header for authentication
                if (!headers.has("Authorization")) {
                  headers.set("Authorization", `Bearer ${anonKey}`);
                }

                return fetch(url, {
                  ...options,
                  credentials: "omit", // CRITICAL: Don't send cookies
                  headers,
                });
              },
            },
          }
        );

        // Verify no session exists (should be null since storage returns null)
        const {
          data: { session },
        } = await guestClient.auth.getSession();
        const {
          data: { user },
        } = await guestClient.auth.getUser();

        if (session || user) {
          toast.error("Please clear your browser storage and try again.");
          return;
        }

        // Use Postgres function via RPC to create guest order
        // This bypasses RLS issues with REST API anonymous requests
        // The function validates auth.uid() IS NULL and all requirements
        // Returns the full order as JSONB (bypasses RLS for SELECT too)
        const { data: orderData_result, error: rpcError } =
          await guestClient.rpc("create_guest_order", {
            p_guest_name: orderData.guest_name,
            p_guest_email: orderData.guest_email,
            p_items: orderData.items,
            p_subtotal_cents: orderData.subtotal_cents,
            p_tax_cents: orderData.tax_cents,
            p_total_cents: orderData.total_cents,
            p_payment_method: orderData.payment_method,
            p_payment_status: orderData.payment_status,
            p_status: orderData.status,
            p_pickup_time: orderData.pickup_time,
          });

        if (rpcError) {
          console.error("Guest order RPC error:", rpcError);
          toast.error(
            rpcError.message ||
              "Failed to create guest order. Please try again."
          );
          return;
        }

        if (!orderData_result) {
          console.error("No order data returned from RPC");
          toast.error("Failed to create order. Please try again.");
          return;
        }

        // The function returns the full order as JSONB, so we can use it directly
        const order = orderData_result;

        // Extract order ID - the RPC returns the order as JSONB with id field
        const orderId = (order as any)?.id;

        if (!orderId) {
          console.error("Order ID not found in RPC result:", order);
          toast.error("Failed to create order. Please try again.");
          return;
        }

        // Validate order ID is a string (UUID)
        if (typeof orderId !== "string") {
          console.error("Invalid order ID format:", orderId, typeof orderId);
          toast.error("Failed to create order. Please try again.");
          return;
        }

        console.log("Guest order created successfully with ID:", orderId);

        toast.success("Order placed successfully!");

        // Best-effort cart clear; do not block redirect on failure
        try {
          await clearCart();
        } catch (clearErr) {
          console.warn("Failed to clear cart after guest order", clearErr);
        }

        try {
          // Cache order for confirmation page (guest can't fetch via RLS)
          sessionStorage.setItem(`order:${orderId}`, JSON.stringify(order));
        } catch {
          // Ignore storage failures
        }

        // Redirect to confirmation (same as authenticated users)
        // Use window.location.href for a hard redirect to ensure it works
        console.log(
          "Redirecting to order confirmation:",
          `/order-confirmation/${orderId}`
        );
        window.location.href = `/order-confirmation/${orderId}`;
        return;
      }

      // AUTHENTICATED ORDERS: Use API route (server-side for security)
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      // Check content type before parsing
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response from API:", text);
        toast.error("Server error: Invalid response format. Please try again.");
        return;
      }

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError);
        toast.error(
          "Server error: Failed to parse response. Please try again."
        );
        return;
      }

      if (!response.ok) {
        console.error("Error creating order:", result.error);
        toast.error(result.error || "Failed to place order. Please try again.");
        return;
      }

      toast.success("Order placed successfully!");

      // Clear cart
      await clearCart();
      router.push(`/order-confirmation/${result.order.id}`);
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to place order. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartLoading || userLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[hsl(25,35%,25%)] border-r-transparent"></div>
            <p className="text-[hsl(25,35%,25%)]">Loading checkout...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="mb-4 text-4xl font-bold text-[hsl(25,35%,25%)]">
          Checkout
        </h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Checkout Form */}
          <section className="lg:col-span-2">
            <div className="overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm">
              <div className="p-6">
                <h2 className="mb-6 text-2xl font-bold text-[hsl(25,35%,25%)]">
                  Contact Information
                </h2>

                <div className="space-y-4">
                  {/* Guest Name Field - Only show for guests */}
                  {isGuest && (
                    <div>
                      <label
                        htmlFor="guest_name"
                        className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
                      >
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="guest_name"
                        {...register("guest_name")}
                        className={`w-full rounded-md border px-4 py-2 text-[hsl(25,35%,25%)] transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-20 ${
                          errors.guest_name
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                            : "border-[hsl(35,20%,90%)] focus:border-[hsl(25,35%,25%)] focus:ring-[hsl(25,35%,25%)]"
                        }`}
                        placeholder="John Doe"
                      />
                      {errors.guest_name && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.guest_name.message}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Guest Email Field - Only show for guests */}
                  {isGuest && (
                    <div>
                      <label
                        htmlFor="guest_email"
                        className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
                      >
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="guest_email"
                        {...register("guest_email")}
                        className={`w-full rounded-md border px-4 py-2 text-[hsl(25,35%,25%)] transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-20 ${
                          errors.guest_email
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                            : "border-[hsl(35,20%,90%)] focus:border-[hsl(25,35%,25%)] focus:ring-[hsl(25,35%,25%)]"
                        }`}
                        placeholder="john@example.com"
                      />
                      {errors.guest_email && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.guest_email.message}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Authenticated User Info */}
                  {!isGuest && user && (
                    <div className="rounded-lg bg-[hsl(35,20%,95%)] p-4">
                      <p className="text-sm font-medium text-[hsl(25,35%,25%)]">
                        Ordering as: {user.email}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mt-6 overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm">
              <div className="p-6">
                <h2 className="mb-6 text-2xl font-bold text-[hsl(25,35%,25%)]">
                  Payment Method
                </h2>

                {/* Payment method selection */}
                <div className="mb-6 flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("card");
                      setValue("paymentMethod", "card");
                    }}
                    className={`flex-1 rounded-md border-2 px-4 py-3 text-sm font-medium transition-colors ${
                      paymentMethod === "card"
                        ? "border-[hsl(25,35%,25%)] bg-[hsl(25,35%,25%)] text-white"
                        : "border-[hsl(35,20%,90%)] bg-white text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
                    }`}
                  >
                    💳 Card
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("cash");
                      setValue("paymentMethod", "cash");
                    }}
                    className={`flex-1 rounded-md border-2 px-4 py-3 text-sm font-medium transition-colors ${
                      paymentMethod === "cash"
                        ? "border-[hsl(25,35%,25%)] bg-[hsl(25,35%,25%)] text-white"
                        : "border-[hsl(35,20%,90%)] bg-white text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
                    }`}
                  >
                    💵 Cash
                  </button>
                </div>

                <input
                  type="hidden"
                  {...register("paymentMethod")}
                  value={paymentMethod}
                />

                {/* Card Payment Form */}
                {paymentMethod === "card" && (
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="cardNumber"
                        className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
                      >
                        Card Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="cardNumber"
                        {...register("cardNumber")}
                        onChange={handleCardNumberChange}
                        className={`w-full rounded-md border px-4 py-2 text-[hsl(25,35%,25%)] transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-20 ${
                          errors.cardNumber
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                            : "border-[hsl(35,20%,90%)] focus:border-[hsl(25,35%,25%)] focus:ring-[hsl(25,35%,25%)]"
                        }`}
                        placeholder="1234 5678 9012 3456"
                      />
                      {errors.cardNumber && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.cardNumber.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="cardName"
                        className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
                      >
                        Cardholder Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="cardName"
                        {...register("cardName")}
                        className={`w-full rounded-md border px-4 py-2 text-[hsl(25,35%,25%)] transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-20 ${
                          errors.cardName
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                            : "border-[hsl(35,20%,90%)] focus:border-[hsl(25,35%,25%)] focus:ring-[hsl(25,35%,25%)]"
                        }`}
                        placeholder="John Doe"
                      />
                      {errors.cardName && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.cardName.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="expiry"
                          className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
                        >
                          Expiry Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="expiry"
                          {...register("expiry")}
                          onChange={handleExpiryChange}
                          className={`w-full rounded-md border px-4 py-2 text-[hsl(25,35%,25%)] transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-20 ${
                            errors.expiry
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                              : "border-[hsl(35,20%,90%)] focus:border-[hsl(25,35%,25%)] focus:ring-[hsl(25,35%,25%)]"
                          }`}
                          placeholder="MM/YY"
                        />
                        {errors.expiry && (
                          <p className="mt-1 text-xs text-red-500">
                            {errors.expiry.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          htmlFor="cvc"
                          className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
                        >
                          CVC <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="cvc"
                          {...register("cvc")}
                          onChange={handleCvcChange}
                          className={`w-full rounded-md border px-4 py-2 text-[hsl(25,35%,25%)] transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-20 ${
                            errors.cvc
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                              : "border-[hsl(35,20%,90%)] focus:border-[hsl(25,35%,25%)] focus:ring-[hsl(25,35%,25%)]"
                          }`}
                          placeholder="123"
                        />
                        {errors.cvc && (
                          <p className="mt-1 text-xs text-red-500">
                            {errors.cvc.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Cash Payment Info */}
                {paymentMethod === "cash" && (
                  <div className="rounded-lg bg-[hsl(35,20%,95%)] p-4">
                    <p className="text-sm text-[hsl(25,35%,25%)]">
                      Please prepare exact change or the total amount.
                    </p>
                    <p className="mt-2 text-sm font-medium text-[hsl(25,35%,25%)]">
                      Payment will be collected when you pick up your order.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Pickup Time */}
            <div className="mt-6 overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm">
              <div className="p-6">
                <h2 className="mb-6 text-2xl font-bold text-[hsl(25,35%,25%)]">
                  Pickup Time (Optional)
                </h2>
                <PickupTimePicker
                  value={pickupTime}
                  onChange={setPickupTime}
                  minAdvanceMinutes={15}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </section>

          {/* Order Summary */}
          <aside className="lg:col-span-1">
            <div className="overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm">
              <div className="p-6">
                <h2 className="mb-4 text-xl font-bold text-[hsl(25,35%,25%)]">
                  Order Summary
                </h2>

                {/* Cart Items */}
                <div className="mb-4 space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.cartItemId}
                      className="flex gap-3 border-b border-[hsl(35,20%,90%)] pb-4 last:border-b-0"
                    >
                      {/* Item image */}
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-[hsl(35,20%,95%)]">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-2xl text-[hsl(25,35%,45%)]">
                            ☕
                          </div>
                        )}
                      </div>

                      {/* Item details */}
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-[hsl(25,35%,25%)]">
                            {item.name}
                          </h3>
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
                          <p className="mt-1 text-xs text-[hsl(25,35%,45%)]">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-[hsl(25,35%,25%)]">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price breakdown */}
                <div className="space-y-2 border-t border-[hsl(35,20%,90%)] pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(25,35%,45%)]">
                      Subtotal (excl. VAT)
                    </span>
                    <span className="font-medium text-[hsl(25,35%,25%)]">
                      {formatPrice(netPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(25,35%,45%)]">VAT (10%)</span>
                    <span className="font-medium text-[hsl(25,35%,25%)]">
                      {formatPrice(tax)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[hsl(35,20%,90%)] pt-2 text-base font-bold">
                    <span className="text-[hsl(25,35%,25%)]">
                      Total (incl. VAT)
                    </span>
                    <span className="text-[hsl(25,35%,25%)]">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>

                {/* Pickup Time Display */}
                {pickupTime && (
                  <div className="border-t border-[hsl(35,20%,90%)] pt-4">
                    <h3 className="text-sm font-medium text-[hsl(25,35%,45%)]">
                      Pickup Time
                    </h3>
                    <p className="mt-1 text-base font-semibold text-[hsl(25,35%,25%)]">
                      {pickupTime.toLocaleString("en-GB", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting || items.length === 0}
                  className="mt-6 w-full rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Processing..." : "Place Order"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </form>
    </main>
  );
}
