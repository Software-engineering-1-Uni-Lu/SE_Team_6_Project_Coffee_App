"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/src/integrations/supabase/client";

/**
 * Purpose: Order confirmation page displaying order summary after checkout.
 * Shows order details, items purchased, pricing breakdown, and status.
 */

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  modifiers?: Array<{ label: string; price: number }>;
}

interface Order {
  id: string;
  status: string;
  items: OrderItem[];
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  payment_method: string;
  payment_status: string;
  pickup_time?: string;
  notes?: string;
  points_earned: number;
  points_redeemed: number;
  created_at: string;
}

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError("Order ID is missing");
      setLoading(false);
      return;
    }

    async function fetchOrder() {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        if (fetchError) {
          setError("Order not found");
          return;
        }

        setOrder(data);
      } catch (err) {
        setError("Failed to load order");
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderId]);

  const formatPrice = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRelativeTime = (dateString: string) => {
    const targetDate = new Date(dateString);
    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 0) return "Time has passed";
    if (diffMins < 1) return "Now";
    if (diffMins < 60)
      return `In ${diffMins} minute${diffMins !== 1 ? "s" : ""}`;

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (mins === 0) {
      return `In ${hours} hour${hours !== 1 ? "s" : ""}`;
    }

    return `In ${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-xl text-[hsl(25,35%,25%)]">
            Loading order details...
          </div>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
          <div className="text-xl text-red-600">
            {error || "Order not found"}
          </div>
          <button
            onClick={() => router.push("/menu")}
            className="rounded-md bg-[hsl(25,75%,47%)] px-6 py-2 text-white hover:bg-[hsl(25,75%,42%)]"
          >
            Return to Menu
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-3xl">
        {/* Success Header */}
        <header className="mb-8 text-center">
          <div className="mb-4 text-6xl">✓</div>
          <h1 className="mb-2 text-4xl font-bold text-[hsl(25,35%,25%)]">
            Order Confirmed!
          </h1>
          <p className="text-lg text-[hsl(25,20%,40%)]">
            Thank you for your order
          </p>
        </header>

        {/* Order Summary Card */}
        <div className="rounded-lg border border-[hsl(25,25%,85%)] bg-white p-6 shadow-sm">
          {/* Order Info */}
          <section className="mb-6 border-b border-[hsl(25,25%,85%)] pb-6">
            <h2 className="mb-4 text-2xl font-semibold text-[hsl(25,35%,25%)]">
              Order Summary
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-[hsl(25,20%,40%)]">
                  Order Number:
                </span>
                <p className="font-mono text-[hsl(25,35%,25%)]">
                  {order.id.slice(0, 8)}
                </p>
              </div>
              <div>
                <span className="font-medium text-[hsl(25,20%,40%)]">
                  Status:
                </span>
                <p className="font-semibold text-[hsl(25,75%,47%)]">
                  {formatStatus(order.status)}
                </p>
              </div>
              <div>
                <span className="font-medium text-[hsl(25,20%,40%)]">
                  Order Date:
                </span>
                <p className="text-[hsl(25,35%,25%)]">
                  {formatDateTime(order.created_at)}
                </p>
              </div>
              {order.pickup_time && (
                <div>
                  <span className="font-medium text-[hsl(25,20%,40%)]">
                    Pickup Time:
                  </span>
                  <p className="text-[hsl(25,35%,25%)]">
                    {formatDateTime(order.pickup_time)}
                  </p>
                  <p className="text-sm text-[hsl(25,35%,55%)]">
                    ({getRelativeTime(order.pickup_time)})
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Order Items */}
          <section className="mb-6 border-b border-[hsl(25,25%,85%)] pb-6">
            <h3 className="mb-4 text-xl font-semibold text-[hsl(25,35%,25%)]">
              Items
            </h3>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-[hsl(25,35%,25%)]">
                        {item.quantity}x
                      </span>
                      <span className="text-[hsl(25,35%,25%)]">
                        {item.name}
                      </span>
                    </div>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="ml-8 mt-1 text-sm text-[hsl(25,20%,40%)]">
                        {item.modifiers.map((mod, modIndex) => (
                          <div key={modIndex}>
                            + {mod.label}{" "}
                            {mod.price > 0 && `(${formatPrice(mod.price)})`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-[hsl(25,35%,25%)]">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Pricing Breakdown */}
          <section className="mb-6 border-b border-[hsl(25,25%,85%)] pb-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[hsl(25,20%,40%)]">
                <span>Subtotal:</span>
                <span>{formatPrice(order.subtotal_cents)}</span>
              </div>
              <div className="flex justify-between text-[hsl(25,20%,40%)]">
                <span>Tax:</span>
                <span>{formatPrice(order.tax_cents)}</span>
              </div>
              {order.points_redeemed > 0 && (
                <div className="flex justify-between text-[hsl(25,75%,47%)]">
                  <span>Points Redeemed:</span>
                  <span>-{order.points_redeemed} pts</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[hsl(25,25%,85%)] pt-2 text-lg font-bold text-[hsl(25,35%,25%)]">
                <span>Total:</span>
                <span>{formatPrice(order.total_cents)}</span>
              </div>
            </div>
          </section>

          {/* Payment & Loyalty Info */}
          <section className="mb-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <span className="font-medium text-[hsl(25,20%,40%)]">
                  Payment Method:
                </span>
                <p className="text-[hsl(25,35%,25%)]">
                  {order.payment_method === "card" ? "Card" : "Cash"}
                </p>
              </div>
              {order.points_earned > 0 && (
                <div>
                  <span className="font-medium text-[hsl(25,20%,40%)]">
                    Points Earned:
                  </span>
                  <p className="font-semibold text-[hsl(25,75%,47%)]">
                    +{order.points_earned} pts
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Notes */}
          {order.notes && (
            <section className="rounded-md bg-[hsl(25,25%,95%)] p-4">
              <span className="font-medium text-[hsl(25,20%,40%)]">Notes:</span>
              <p className="mt-1 text-[hsl(25,35%,25%)]">{order.notes}</p>
            </section>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={() => router.push("/customer/orders")}
            className="rounded-md border border-[hsl(25,35%,25%)] px-6 py-3 font-medium text-[hsl(25,35%,25%)] hover:bg-[hsl(25,25%,95%)]"
          >
            View All Orders
          </button>
          <button
            onClick={() => router.push("/menu")}
            className="rounded-md bg-[hsl(25,75%,47%)] px-6 py-3 font-medium text-white hover:bg-[hsl(25,75%,42%)]"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </main>
  );
}
