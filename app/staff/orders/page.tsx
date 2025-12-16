/**
 * Purpose: Staff orders queue page for managing incoming orders.
 * Allows staff to view, accept, and update order status and priority.
 * Displays orders sorted by priority and creation time.
 */

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/src/integrations/supabase/client";
import { formatPrice } from "@/src/lib/cart-utils";
import { toast } from "sonner";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";
type OrderPriority = "low" | "normal" | "high" | "urgent";

interface Order {
  id: string;
  customer_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  status: OrderStatus;
  priority: OrderPriority;
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    modifiers?: Array<{ label: string; price: number }>;
  }>;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  payment_method: "card" | "cash";
  payment_status: string;
  created_at: string;
  updated_at: string;
}

const priorityOrder: Record<OrderPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const priorityColors: Record<OrderPriority, string> = {
  urgent: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  normal: "bg-blue-500 text-white",
  low: "bg-gray-400 text-white",
};

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800",
  ready: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"priority" | "time">("priority");
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "all">("all");
  const supabase = createClient();

  useEffect(() => {
    fetchOrders();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .in("status", ["pending", "confirmed", "preparing", "ready"])
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Ensure all orders have priority (default to 'normal' if missing)
      const ordersWithPriority = (data || []).map((order) => ({
        ...order,
        priority: (order.priority || "normal") as OrderPriority,
      }));

      setOrders(ordersWithPriority);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update order");
      }

      toast.success("Order status updated");
      fetchOrders();
    } catch (error: any) {
      console.error("Error updating order status:", error);
      toast.error(error.message || "Failed to update order status");
    }
  };

  const updateOrderPriority = async (
    orderId: string,
    newPriority: OrderPriority
  ) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: newPriority }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update priority");
      }

      toast.success("Order priority updated");
      fetchOrders();
    } catch (error: any) {
      console.error("Error updating order priority:", error);
      toast.error(error.message || "Failed to update priority");
    }
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const statusFlow: Record<OrderStatus, OrderStatus | null> = {
      pending: "preparing",
      confirmed: "preparing",
      preparing: "ready",
      ready: "completed",
      completed: null,
      cancelled: null,
    };
    return statusFlow[currentStatus] || null;
  };

  const sortedAndFilteredOrders = [...orders]
    .filter((order) => filterStatus === "all" || order.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === "priority") {
        const priorityDiff =
          priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      } else {
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
    });

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[hsl(25,35%,25%)] border-r-transparent"></div>
            <p className="text-[hsl(25,35%,25%)]">Loading orders...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-[hsl(25,35%,25%)]">
          Orders Queue
        </h1>
        <p className="mt-2 text-[hsl(25,35%,45%)]">
          Manage incoming orders and update their status
        </p>
      </header>

      {/* Filters and Sort */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-[hsl(25,35%,25%)]">
            Filter:
          </label>
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as OrderStatus | "all")
            }
            className="rounded-md border border-[hsl(35,20%,90%)] px-3 py-1 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-[hsl(25,35%,25%)]">
            Sort by:
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "priority" | "time")}
            className="rounded-md border border-[hsl(35,20%,90%)] px-3 py-1 text-sm"
          >
            <option value="priority">Priority</option>
            <option value="time">Time</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <section>
        {sortedAndFilteredOrders.length === 0 ? (
          <div className="rounded-lg border border-[hsl(35,20%,90%)] bg-white p-8 text-center">
            <p className="text-[hsl(25,35%,45%)]">No orders found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedAndFilteredOrders.map((order) => {
              const nextStatus = getNextStatus(order.status);
              const customerName = order.guest_name || "Customer";
              const customerEmail = order.guest_email || "";

              return (
                <div
                  key={order.id}
                  className="overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-[hsl(25,35%,25%)]">
                            Order #{order.id.slice(0, 8)}
                          </h3>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${priorityColors[order.priority]}`}
                          >
                            {order.priority.toUpperCase()}
                          </span>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[order.status]}`}
                          >
                            {order.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-[hsl(25,35%,45%)]">
                          {customerName}
                          {customerEmail && ` • ${customerEmail}`}
                        </p>
                        <p className="text-xs text-[hsl(25,35%,45%)]">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-[hsl(25,35%,25%)]">
                          {formatPrice(order.total_cents)}
                        </p>
                        <p className="text-xs text-[hsl(25,35%,45%)]">
                          {order.payment_method === "card"
                            ? "💳 Card"
                            : "💵 Cash"}{" "}
                          • {order.payment_status}
                        </p>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="mb-4 border-t border-[hsl(35,20%,90%)] pt-4">
                      <h4 className="mb-2 text-sm font-medium text-[hsl(25,35%,25%)]">
                        Items:
                      </h4>
                      <ul className="space-y-1">
                        {order.items.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex justify-between text-sm text-[hsl(25,35%,45%)]"
                          >
                            <span>
                              {item.quantity}x {item.name}
                              {item.modifiers && item.modifiers.length > 0 && (
                                <span className="ml-2 text-xs">
                                  (
                                  {item.modifiers
                                    .map((m) => m.label)
                                    .join(", ")}
                                  )
                                </span>
                              )}
                            </span>
                            <span className="font-medium">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 border-t border-[hsl(35,20%,90%)] pt-4">
                      {/* Priority Selector */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-[hsl(25,35%,25%)]">
                          Priority:
                        </label>
                        <select
                          value={order.priority}
                          onChange={(e) =>
                            updateOrderPriority(
                              order.id,
                              e.target.value as OrderPriority
                            )
                          }
                          className="rounded-md border border-[hsl(35,20%,90%)] px-2 py-1 text-xs"
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>

                      {/* Status Update Button */}
                      {nextStatus && (
                        <button
                          onClick={() =>
                            updateOrderStatus(order.id, nextStatus)
                          }
                          className="rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)]"
                        >
                          Mark as{" "}
                          {nextStatus.charAt(0).toUpperCase() +
                            nextStatus.slice(1)}
                        </button>
                      )}

                      {order.status === "ready" && (
                        <button
                          onClick={() =>
                            updateOrderStatus(order.id, "completed")
                          }
                          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                        >
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
