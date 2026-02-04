/**
 * /orders - Unified order tracking for customers and guests.
 *
 * Features:
 * - Authenticated customers: auto-load their orders (most recent first)
 * - Guests: lookup orders by order ID + email (safe against enumeration)
 * - List view with status, total, and date
 * - Modal with full order details
 *
 * Security:
 * - Authenticated fetch uses RLS-protected /api/orders/history
 * - Guest lookup goes through /api/orders/lookup (requires order ID + email)
 */

"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@/src/hooks/useUser";
import { toast } from "sonner";
import { canCancelOrder } from "@/src/lib/order-utils";
import {
  ORDER_STATUS_CONFIG,
  Order,
  OrderStatus,
  formatOrderDate,
  formatOrderPrice,
  formatOrderTime,
  getOrderCustomerEmail,
  getOrderCustomerName,
} from "@/src/types/order";
import { jsPDF } from "jspdf";

interface OrdersResponse {
  orders: Order[];
  error?: string;
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const config = ORDER_STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${config.color} ${config.bgColor} ${config.borderColor}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

function DetailModal({
  order,
  onClose,
  onOrderCancelled,
}: {
  order: Order;
  onClose: () => void;
  onOrderCancelled: () => void;
}) {
  const customerName = getOrderCustomerName(order);
  const customerEmail = getOrderCustomerEmail(order);
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel");
      }
      toast.success("Order cancelled successfully");
      onOrderCancelled();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const showCancel = canCancelOrder(order);

  const renderInvoicePdf = () => {
    const doc = new jsPDF();
    const lineHeight = 8;
    let y = 20;

    const formatCurrency = (cents: number) => `€${(cents / 100).toFixed(2)}`;

    const addLine = (text: string, options?: { bold?: boolean }) => {
      if (options?.bold) {
        doc.setFont("helvetica", "bold");
      } else {
        doc.setFont("helvetica", "normal");
      }
      doc.text(text, 20, y);
      y += lineHeight;
    };

    const paymentStatus =
      order.payment_status?.toLowerCase() === "paid" ? "PAID" : "UNPAID";
    const orderStatusLabel = order.status.toUpperCase();
    const unpaidLabel =
      paymentStatus !== "PAID" ? "UNPAID — NOT A TAX INVOICE" : "";

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Café Aroma", 20, y);
    y += lineHeight;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    addLine("123 Coffee Street");
    addLine("Espresso City, EU");
    addLine("hello@cafearoma.com");
    y += 4;

    // Invoice meta
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    addLine(`Invoice: ${order.id}`);
    doc.setFont("helvetica", "normal");
    addLine(
      `Issued: ${formatOrderDate(order.created_at)} ${formatOrderTime(
        order.created_at
      )}`
    );
    addLine(`Order status: ${orderStatusLabel}`);
    addLine(`Payment status: ${paymentStatus}`);
    if (order.payment_method) {
      addLine(`Payment method: ${order.payment_method.toUpperCase()}`);
    }
    if (unpaidLabel) {
      addLine(unpaidLabel, { bold: true });
    }
    y += 4;

    // Customer
    doc.setFont("helvetica", "bold");
    addLine("Bill To:");
    doc.setFont("helvetica", "normal");
    addLine(customerName);
    addLine(customerEmail);
    y += 4;

    // Items header
    doc.setFont("helvetica", "bold");
    addLine("Items:");
    doc.setFont("helvetica", "normal");
    order.items.forEach((item) => {
      addLine(
        `${item.name} (${item.quantity} x ${formatCurrency(
          item.price
        )}) - ${formatCurrency(item.price * item.quantity)}`
      );
    });
    y += 4;

    // Summary
    doc.setFont("helvetica", "bold");
    addLine("Summary:");
    doc.setFont("helvetica", "normal");
    addLine(`Subtotal: ${formatCurrency(order.subtotal_cents)}`);
    addLine(`Tax: ${formatCurrency(order.tax_cents)}`);
    addLine(`Total: ${formatCurrency(order.total_cents)}`);

    const filename = `invoice_${order.id}.pdf`;
    doc.save(filename);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-10"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[hsl(35,25%,90%)] px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <StatusBadge status={order.status} />
              {!order.customer_id && (
                <span className="rounded-full bg-[hsl(25,75%,94%)] px-2 py-1 text-xs font-semibold text-[hsl(25,65%,35%)]">
                  Guest order
                </span>
              )}
            </div>
            <h3 className="mt-2 text-2xl font-bold text-[hsl(25,35%,20%)]">
              Order {order.id.slice(0, 8)}
            </h3>
            <p className="text-sm text-[hsl(25,25%,45%)]">
              Placed on {formatOrderDate(order.created_at)} at{" "}
              {formatOrderTime(order.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-[hsl(35,25%,90%)] p-2 text-[hsl(25,35%,35%)] transition-colors hover:bg-[hsl(35,20%,96%)]"
            aria-label="Close order details"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-6 border-b border-[hsl(35,25%,90%)] px-6 py-6 md:grid-cols-2">
          <div className="space-y-3 rounded-lg bg-[hsl(35,20%,97%)] p-4">
            <div className="text-sm text-[hsl(25,25%,45%)]">Customer</div>
            <div className="text-lg font-semibold text-[hsl(25,35%,20%)]">
              {customerName}
            </div>
            <div className="text-sm text-[hsl(25,25%,45%)]">
              {customerEmail}
            </div>
            {!order.customer_id && (
              <div className="text-sm text-[hsl(25,25%,45%)]">
                Guest checkout (no account)
              </div>
            )}
          </div>
          <div className="space-y-3 rounded-lg bg-[hsl(35,20%,97%)] p-4">
            <div className="text-sm text-[hsl(25,25%,45%)]">Summary</div>
            <div className="text-lg font-semibold text-[hsl(25,35%,20%)]">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </div>
            <div className="text-sm text-[hsl(25,25%,45%)]">
              Payment:{" "}
              {order.payment_method === "card"
                ? "Card"
                : order.payment_method === "cash"
                  ? "Cash"
                  : "Loyalty Points"}{" "}
              ({order.payment_status})
            </div>
            {order.pickup_time && (
              <div className="text-sm text-[hsl(25,25%,45%)]">
                Pickup: {formatOrderDate(order.pickup_time)} at{" "}
                {formatOrderTime(order.pickup_time)}
              </div>
            )}
            <div className="text-sm text-[hsl(25,25%,45%)]">
              Last updated: {formatOrderDate(order.updated_at)} at{" "}
              {formatOrderTime(order.updated_at)}
            </div>
            <button
              onClick={renderInvoicePdf}
              className="mt-2 w-full rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[hsl(25,40%,18%)] focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)] focus:ring-offset-2"
              aria-label="Download invoice PDF"
            >
              Download Invoice
            </button>
          </div>
        </div>

        <div className="px-6 py-6">
          <h4 className="text-lg font-semibold text-[hsl(25,35%,20%)]">
            Items
          </h4>
          <div className="mt-3 divide-y divide-[hsl(35,25%,90%)] rounded-lg border border-[hsl(35,25%,90%)]">
            {order.items.map((item, index) => (
              <div
                key={`${item.productId}-${index}`}
                className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <div className="flex items-baseline gap-2 text-[hsl(25,35%,20%)]">
                    <span className="text-sm font-semibold">
                      {item.quantity}x
                    </span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="mt-1 text-sm text-[hsl(25,25%,45%)]">
                      {item.modifiers.map((mod, modIndex) => (
                        <div key={modIndex}>
                          + {mod.label}{" "}
                          {mod.price > 0 && `(${formatOrderPrice(mod.price)})`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right font-semibold text-[hsl(25,35%,20%)]">
                  {formatOrderPrice(item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 rounded-lg bg-[hsl(35,20%,97%)] px-4 py-3 sm:grid-cols-2 sm:items-center">
            <div className="space-y-1 text-sm text-[hsl(25,25%,45%)]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-[hsl(25,35%,20%)]">
                  {formatOrderPrice(order.subtotal_cents)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span className="font-semibold text-[hsl(25,35%,20%)]">
                  {formatOrderPrice(order.tax_cents)}
                </span>
              </div>
              {order.points_redeemed > 0 && (
                <div className="flex justify-between text-[hsl(25,65%,35%)]">
                  <span>Points redeemed</span>
                  <span className="font-semibold">
                    -{order.points_redeemed} pts
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white px-3 py-3 text-lg font-bold text-[hsl(25,35%,20%)] shadow-sm">
              <span>Total</span>
              <span>{formatOrderPrice(order.total_cents)}</span>
            </div>
          </div>

          {order.notes && (
            <div className="mt-4 rounded-lg border border-[hsl(35,25%,90%)] bg-[hsl(35,20%,97%)] px-4 py-3 text-[hsl(25,35%,25%)]">
              <span className="text-sm font-semibold text-[hsl(25,35%,25%)]">
                Notes:
              </span>{" "}
              {order.notes}
            </div>
          )}
        </div>

        {showCancel && (
          <div className="border-t border-[hsl(35,25%,90%)] px-6 py-4">
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {isCancelling ? "Cancelling..." : "Cancel Order"}
            </button>
            <p className="mt-2 text-center text-xs text-[hsl(25,25%,45%)]">
              You can cancel this order within 5 minutes of placement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const customerName = getOrderCustomerName(order);

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-[hsl(35,25%,90%)] bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,35%)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            {!order.customer_id && (
              <span className="rounded-full bg-[hsl(25,75%,94%)] px-2 py-1 text-[11px] font-semibold text-[hsl(25,65%,35%)]">
                Guest
              </span>
            )}
          </div>
          <div className="text-sm font-semibold uppercase tracking-wide text-[hsl(25,35%,30%)]">
            {formatOrderDate(order.created_at)} ·{" "}
            {formatOrderTime(order.created_at)}
          </div>
          <div className="text-lg font-bold text-[hsl(25,35%,20%)]">
            {customerName}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[hsl(25,25%,45%)]">
            <span>
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
            <span className="text-[hsl(35,15%,70%)]">•</span>
            <span>Total {formatOrderPrice(order.total_cents)}</span>
            {order.pickup_time && (
              <>
                <span className="text-[hsl(35,15%,70%)]">•</span>
                <span>Pickup {formatOrderTime(order.pickup_time)}</span>
              </>
            )}
          </div>
          {order.notes && (
            <p className="rounded-md bg-[hsl(35,20%,97%)] px-3 py-2 text-sm text-[hsl(25,25%,45%)]">
              📝 {order.notes}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold text-[hsl(25,35%,20%)]">
            {formatOrderPrice(order.total_cents)}
          </div>
          <div className="text-xs text-[hsl(25,25%,45%)]">
            #{order.id.slice(0, 8)}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function OrdersPage() {
  const { user, loading: userLoading } = useUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOrder, setModalOrder] = useState<Order | null>(null);

  const [guestEmail, setGuestEmail] = useState("");
  const [guestOrderId, setGuestOrderId] = useState("");
  const [lastLookupEmail, setLastLookupEmail] = useState<string | null>(null);
  const userEmail = user?.email;
  const showGuestLookup = !user && !userLoading;

  const fetchAuthenticatedOrders = useCallback(async () => {
    setOrdersLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/orders/history");
      const data: OrdersResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load orders");
      }

      const sortedOrders = (data.orders || []).sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setOrders(sortedOrders);
      setLastLookupEmail(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const fetchGuestOrder = useCallback(
    async (orderId: string, email: string) => {
      setOrdersLoading(true);
      setLookupLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/orders/lookup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: orderId.trim(),
            email: email.trim(),
          }),
        });

        const data: OrdersResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to find orders for that email");
        }

        const sortedOrders = (data.orders || []).sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setOrders(sortedOrders);
        setLastLookupEmail(email.trim());
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to find that order"
        );
        setOrders([]);
        setLastLookupEmail(null);
      } finally {
        setOrdersLoading(false);
        setLookupLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (userLoading) return;
    if (user) {
      fetchAuthenticatedOrders();
    } else {
      setOrders([]);
      setOrdersLoading(false);
    }
  }, [fetchAuthenticatedOrders, user, userLoading]);

  const handleGuestLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetchGuestOrder(guestOrderId, guestEmail);
  };

  const handleOrderCancelled = () => {
    if (user) {
      fetchAuthenticatedOrders();
    } else if (guestOrderId && guestEmail) {
      fetchGuestOrder(guestOrderId, guestEmail);
    }
  };

  const contextLabel = useMemo(() => {
    if (userEmail) {
      return `Signed in as ${userEmail}`;
    }
    if (lastLookupEmail) {
      return `Guest lookup for ${lastLookupEmail}`;
    }
    return "Guest lookup required";
  }, [lastLookupEmail, userEmail]);

  const hasOrders = orders.length > 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[hsl(35,25%,98%)] to-white">
      <div className="container mx-auto px-4 py-10">
        <header className="mb-8">
          <div className="inline-flex items-center rounded-full bg-[hsl(35,20%,92%)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[hsl(25,35%,35%)]">
            Orders & Tracking
          </div>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[hsl(25,35%,20%)]">
                Stay on top of your order
              </h1>
              <p className="mt-2 max-w-2xl text-[hsl(25,25%,45%)]">
                Customers get their history automatically. Guests can track with
                the order ID and email from their confirmation.
              </p>
            </div>
            <div className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[hsl(25,35%,35%)] shadow-sm">
              {contextLabel}
            </div>
          </div>
        </header>

        <div
          className={`grid gap-6 ${
            showGuestLookup ? "lg:grid-cols-[2fr,1fr]" : ""
          }`}
        >
          <section className="rounded-2xl border border-[hsl(35,25%,90%)] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[hsl(25,35%,20%)]">
                  {user ? "Your orders" : "Orders"}
                </h2>
                <p className="text-sm text-[hsl(25,25%,45%)]">
                  Sorted by most recent first.
                </p>
              </div>
              {user && (
                <button
                  onClick={fetchAuthenticatedOrders}
                  className="rounded-md border border-[hsl(35,25%,88%)] px-3 py-2 text-sm font-medium text-[hsl(25,35%,30%)] transition-colors hover:bg-[hsl(35,20%,96%)]"
                  disabled={ordersLoading}
                >
                  {ordersLoading ? "Refreshing..." : "Refresh"}
                </button>
              )}
            </div>

            <div className="mt-4 space-y-4">
              {ordersLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-24 w-full animate-pulse rounded-xl bg-[hsl(35,20%,96%)]"
                    />
                  ))}
                </div>
              )}

              {!ordersLoading && error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {!ordersLoading && !error && !hasOrders && (
                <div className="rounded-xl border border-[hsl(35,25%,90%)] bg-[hsl(35,20%,97%)] px-5 py-10 text-center">
                  <div className="text-lg font-semibold text-[hsl(25,35%,25%)]">
                    {user
                      ? "No orders yet"
                      : "Lookup an order to see its status"}
                  </div>
                  <p className="mt-2 text-sm text-[hsl(25,25%,45%)]">
                    {user
                      ? "Place an order to see it appear here."
                      : "Enter your order ID and the email you used at checkout."}
                  </p>
                  {!user && (
                    <p className="mt-3 text-xs text-[hsl(25,25%,45%)]">
                      Order IDs are in your confirmation email and on the
                      success page.
                    </p>
                  )}
                </div>
              )}

              {!ordersLoading && !error && hasOrders && (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onClick={() => setModalOrder(order)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {showGuestLookup && (
            <section className="rounded-2xl border border-[hsl(35,25%,90%)] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(25,35%,20%)]">
                    Track an order
                  </h3>
                  <p className="text-sm text-[hsl(25,25%,45%)]">
                    Guests use order ID + email to find their orders.
                  </p>
                </div>
                <span className="rounded-full bg-[hsl(35,20%,96%)] px-3 py-1 text-xs font-semibold text-[hsl(25,35%,30%)]">
                  Guest friendly
                </span>
              </div>

              <form className="mt-4 space-y-4" onSubmit={handleGuestLookup}>
                <div className="space-y-2">
                  <label
                    htmlFor="order-id"
                    className="text-sm font-medium text-[hsl(25,35%,25%)]"
                  >
                    Order ID
                  </label>
                  <input
                    id="order-id"
                    name="order-id"
                    value={guestOrderId}
                    onChange={(e) => setGuestOrderId(e.target.value)}
                    placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                    className="w-full rounded-lg border border-[hsl(35,25%,88%)] px-3 py-2 text-sm text-[hsl(25,35%,25%)] shadow-sm focus:border-[hsl(25,35%,35%)] focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="order-email"
                    className="text-sm font-medium text-[hsl(25,35%,25%)]"
                  >
                    Email used at checkout
                  </label>
                  <input
                    id="order-email"
                    name="order-email"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-[hsl(35,25%,88%)] px-3 py-2 text-sm text-[hsl(25,35%,25%)] shadow-sm focus:border-[hsl(25,35%,35%)] focus:outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={lookupLoading}
                  className="w-full rounded-lg bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[hsl(25,40%,18%)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {lookupLoading ? "Searching..." : "Find my order"}
                </button>
                <p className="text-xs text-[hsl(25,25%,45%)]">
                  We require both the order ID and email so only you can view
                  your guest orders.
                </p>
              </form>
            </section>
          )}
        </div>
      </div>

      {modalOrder && (
        <DetailModal
          order={modalOrder}
          onClose={() => setModalOrder(null)}
          onOrderCancelled={handleOrderCancelled}
        />
      )}
    </main>
  );
}
