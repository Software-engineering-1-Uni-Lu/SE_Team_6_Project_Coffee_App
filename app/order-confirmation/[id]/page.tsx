"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/src/integrations/supabase/client";
import { useUser } from "@/src/hooks/useUser";
import { jsPDF } from "jspdf";

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
  guest_name?: string | null;
  guest_email?: string | null;
  created_at: string;
}

const formatCurrency = (cents: number) => `€ ${(cents / 100).toFixed(2)}`;

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;
  const { user, loading: userLoading } = useUser();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [invoiceGenerating, setInvoiceGenerating] = useState(false);

  const cacheKey = useMemo(
    () => (orderId ? `order:${orderId}` : null),
    [orderId]
  );

  useEffect(() => {
    if (!orderId || userLoading) {
      return;
    }

    const tryLoadFromCache = () => {
      if (!cacheKey) return false;
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed: Order = JSON.parse(cached);
          setOrder(parsed);
          setLoading(false);
          return true;
        }
      } catch {
        // ignore cache errors
      }
      return false;
    };

    async function fetchOrderAuthenticated() {
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
        // Cache for potential later guest view
        if (cacheKey) {
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(data));
          } catch {
            // ignore cache errors
          }
        }
      } catch (err) {
        setError("Failed to load order");
      } finally {
        setLoading(false);
      }
    }

    // Guests: try cache first, then wait for manual lookup
    if (!user) {
      const cached = tryLoadFromCache();
      if (!cached) {
        setLoading(false);
      }
      return;
    }

    // Authenticated path
    fetchOrderAuthenticated();
  }, [cacheKey, orderId, user, userLoading]);

  const handleGuestLookup = async (e: FormEvent) => {
    e.preventDefault();
    if (!orderId || !emailInput.trim()) {
      setError("Please enter the email used at checkout.");
      return;
    }
    setLookupLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId, email: emailInput.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to find order");
      }

      const found =
        (data.orders as Order[] | undefined)?.find((o) => o.id === orderId) ||
        null;

      if (!found) {
        setError("Order not found for that email");
        return;
      }

      setOrder(found);
      if (cacheKey) {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(found));
        } catch {
          // ignore cache errors
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to look up order");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (!order) return;
    setInvoiceGenerating(true);
    try {
      const doc = new jsPDF();
      const lineHeight = 8;
      let y = 20;

      const addLine = (text: string, opts?: { bold?: boolean }) => {
        doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
        doc.text(text, 20, y);
        y += lineHeight;
      };

      const paymentStatus = (order.payment_status || "").toUpperCase();
      const orderStatus =
        order.status === "completed"
          ? "COMPLETED"
          : order.status === "cancelled"
            ? "CANCELLED"
            : "IN PROGRESS";
      const unpaidLabel =
        paymentStatus !== "PAID" ? "UNPAID — NOT A TAX INVOICE" : "";

      // Header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Café Aroma", 20, y);
      y += lineHeight;
      doc.setFontSize(10);
      addLine("123 Coffee Street");
      addLine("Espresso City, EU");
      addLine("hello@cafearoma.com");
      y += 4;

      // Invoice meta
      doc.setFontSize(12);
      addLine(`Invoice: ${order.id}`, { bold: true });
      addLine(`Issued: ${formatDateTime(order.created_at)}`, { bold: false });
      addLine(`Order status: ${orderStatus}`);
      addLine(`Payment status: ${paymentStatus || "UNKNOWN"}`);
      if (order.payment_method) {
        addLine(`Payment method: ${order.payment_method.toUpperCase()}`);
      }
      if (unpaidLabel) addLine(unpaidLabel, { bold: true });
      y += 4;

      // Customer
      addLine("Bill To:", { bold: true });
      addLine(getCustomerName(), { bold: false });
      addLine(getCustomerEmail(), { bold: false });
      y += 4;

      // Items
      addLine("Items:", { bold: true });
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
      addLine("Summary:", { bold: true });
      addLine(`Subtotal: ${formatCurrency(order.subtotal_cents)}`);
      addLine(`Tax: ${formatCurrency(order.tax_cents)}`);
      addLine(`Total: ${formatCurrency(order.total_cents)}`);

      doc.save(`invoice_${order.id}.pdf`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate invoice PDF"
      );
    } finally {
      setInvoiceGenerating(false);
    }
  };

  const formatPrice = (cents: number) => {
    return `€ ${(cents / 100).toFixed(2)}`;
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getCustomerName = () => {
    if (order?.guest_name) return order.guest_name;
    return "Customer";
  };

  const getCustomerEmail = () => {
    if (order?.guest_email) return order.guest_email;
    return "Email not provided";
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

  if (!loading && !order && !user && !error) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto flex min-h-[400px] max-w-lg flex-col gap-4">
          <div className="rounded-lg border border-[hsl(35,25%,85%)] bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[hsl(25,35%,25%)]">
              Find your order
            </h2>
            <p className="text-sm text-[hsl(25,25%,45%)]">
              Enter the email you used at checkout to view your guest order.
            </p>
            <form onSubmit={handleGuestLookup} className="mt-4 space-y-3">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-md border border-[hsl(35,25%,85%)] px-3 py-2 text-sm text-[hsl(25,35%,25%)] focus:border-[hsl(25,35%,25%)] focus:outline-none"
                required
              />
              <button
                type="submit"
                disabled={lookupLoading}
                className="w-full rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,20%)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {lookupLoading ? "Looking up..." : "Find my order"}
              </button>
              <p className="text-xs text-[hsl(25,25%,45%)]">
                We ask for your email to make sure only you can view this guest
                order.
              </p>
            </form>
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

  if (error || !order) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
          <div className="text-xl text-red-600">
            {error || "Order not found"}
          </div>
          {!user && (
            <form
              onSubmit={handleGuestLookup}
              className="w-full max-w-md space-y-3 rounded-lg border border-[hsl(35,25%,85%)] bg-white p-4 shadow-sm"
            >
              <label className="block text-sm font-medium text-[hsl(25,35%,25%)]">
                Enter the email you used at checkout to view your order
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-md border border-[hsl(35,25%,85%)] px-3 py-2 text-sm text-[hsl(25,35%,25%)] focus:border-[hsl(25,35%,25%)] focus:outline-none"
                required
              />
              <button
                type="submit"
                disabled={lookupLoading}
                className="w-full rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,20%)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {lookupLoading ? "Looking up..." : "Find my order"}
              </button>
              <p className="text-xs text-[hsl(25,25%,45%)]">
                We ask for your email to make sure only you can view this guest
                order.
              </p>
            </form>
          )}
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
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-semibold text-[hsl(25,35%,25%)]">
                Order Summary
              </h2>
              {order && (
                <button
                  onClick={handleDownloadInvoice}
                  disabled={invoiceGenerating}
                  className="inline-flex items-center justify-center rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[hsl(25,40%,18%)] disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Download invoice PDF"
                >
                  {invoiceGenerating ? "Preparing..." : "Download Invoice"}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-[hsl(25,20%,40%)]">
                  Order Number:
                </span>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[hsl(25,35%,25%)]">
                    {order.id.slice(0, 8)}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(order.id)}
                    className="rounded-md border border-[hsl(35,25%,85%)] bg-[hsl(35,20%,97%)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[hsl(25,35%,30%)] transition-colors hover:bg-[hsl(35,20%,93%)]"
                    aria-label="Copy full order ID"
                  >
                    Copy
                  </button>
                </div>
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
            onClick={() => router.push("/orders")}
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
