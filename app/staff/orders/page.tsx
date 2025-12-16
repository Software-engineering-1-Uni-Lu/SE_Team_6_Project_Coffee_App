/**
 * Purpose: Staff orders queue page for managing incoming orders.
 * Allows staff to view, accept, and update order status.
 *
 * User Stories:
 * - CSA-121: Create /staff/orders page
 * - CSA-122: Fetch active orders (pending, confirmed, preparing)
 * - CSA-123: Sort by priority (earliest first/ASAP)
 * - CSA-124: Display order summary in modal
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/src/integrations/supabase/client";
import {
  Order,
  OrderStatus,
  ACTIVE_ORDER_STATUSES,
  ORDER_STATUS_CONFIG,
  getOrderCustomerName,
  getOrderCustomerEmail,
  formatOrderPrice,
  formatOrderTime,
  getOrderAge,
} from "@/src/types/order";

/**
 * Order status badge component
 */
function StatusBadge({ status }: { status: OrderStatus }) {
  const config = ORDER_STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${config.color} ${config.bgColor} ${config.borderColor}`}
      aria-label={`Order status: ${config.label}`}
    >
      {config.label}
    </span>
  );
}

/**
 * Order card component for displaying individual orders in the queue
 */
function OrderCard({
  order,
  onViewDetails,
  isHighPriority,
}: {
  order: Order;
  onViewDetails: (order: Order) => void;
  isHighPriority: boolean;
}) {
  const customerName = getOrderCustomerName(order);
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const orderAge = getOrderAge(order.created_at);

  return (
    <div
      className={`rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md ${
        isHighPriority
          ? "border-l-4 border-b-red-200 border-l-red-500 border-r-red-200 border-t-red-200"
          : "border-[hsl(35,20%,90%)]"
      }`}
      role="article"
      aria-label={`Order from ${customerName}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Order header */}
          <div className="mb-2 flex items-center gap-3">
            <StatusBadge status={order.status} />
            {isHighPriority && (
              <span className="inline-flex items-center rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                ⚡ Priority
              </span>
            )}
            {order.guest_name && (
              <span className="inline-flex items-center rounded-full border border-purple-300 bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
                Guest
              </span>
            )}
          </div>

          {/* Customer info */}
          <h3 className="truncate font-semibold text-[hsl(25,35%,25%)]">
            {customerName}
          </h3>

          {/* Order summary */}
          <p className="mt-1 text-sm text-[hsl(25,35%,45%)]">
            {itemCount} {itemCount === 1 ? "item" : "items"} •{" "}
            {formatOrderPrice(order.total_cents)}
          </p>

          {/* Time info */}
          <div className="mt-2 flex items-center gap-3 text-xs text-[hsl(25,35%,55%)]">
            <span>🕐 {formatOrderTime(order.created_at)}</span>
            <span>• {orderAge}</span>
          </div>

          {/* Notes preview */}
          {order.notes && (
            <p className="mt-2 truncate rounded bg-[hsl(35,20%,97%)] px-2 py-1 text-xs text-[hsl(25,35%,45%)]">
              📝 {order.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2">
          <span className="text-lg font-bold text-[hsl(25,35%,25%)]">
            {formatOrderPrice(order.total_cents)}
          </span>
          <button
            onClick={() => onViewDetails(order)}
            className="rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)] focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)] focus:ring-offset-2"
            aria-label={`View details for order from ${customerName}`}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Order detail modal component (CSA-124)
 */
function OrderDetailModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const customerName = getOrderCustomerName(order);
  const customerEmail = getOrderCustomerEmail(order);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black bg-opacity-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-title"
      >
        <div className="flex max-h-[85vh] flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2
                id="order-detail-title"
                className="text-xl font-bold text-[hsl(25,35%,25%)]"
              >
                Order Details
              </h2>
              <p className="text-sm text-[hsl(25,35%,55%)]">
                Order #{order.id.slice(0, 8)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-2xl text-[hsl(25,35%,45%)] transition-colors hover:text-[hsl(25,35%,25%)]"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {/* Status */}
            <div className="flex items-center gap-3">
              <StatusBadge status={order.status} />
              {order.guest_name && (
                <span className="inline-flex items-center rounded-full border border-purple-300 bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
                  Guest Order
                </span>
              )}
            </div>

            {/* Customer Information */}
            <div className="rounded-lg border border-[hsl(35,20%,90%)] p-4">
              <h3 className="mb-2 font-semibold text-[hsl(25,35%,25%)]">
                Customer Information
              </h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-[hsl(25,35%,55%)]">Name:</span>{" "}
                  <span className="font-medium text-[hsl(25,35%,25%)]">
                    {customerName}
                  </span>
                </p>
                <p>
                  <span className="text-[hsl(25,35%,55%)]">Email:</span>{" "}
                  <span className="font-medium text-[hsl(25,35%,25%)]">
                    {customerEmail}
                  </span>
                </p>
                {order.customer?.phone && (
                  <p>
                    <span className="text-[hsl(25,35%,55%)]">Phone:</span>{" "}
                    <span className="font-medium text-[hsl(25,35%,25%)]">
                      {order.customer.phone}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="rounded-lg border border-[hsl(35,20%,90%)] p-4">
              <h3 className="mb-3 font-semibold text-[hsl(25,35%,25%)]">
                Order Items
              </h3>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div
                    key={item.productId || index}
                    className="flex items-start justify-between border-b border-[hsl(35,20%,95%)] pb-2 last:border-0 last:pb-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[hsl(25,35%,25%)]">
                          {item.quantity}x
                        </span>
                        <span className="text-sm text-[hsl(25,35%,25%)]">
                          {item.name}
                        </span>
                      </div>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="ml-6 mt-1">
                          {item.modifiers.map((mod: any, modIndex: number) => {
                            // Handle different modifier structures (old vs new)
                            const modLabel =
                              mod.label || mod.name || "Modifier";
                            const modPrice = mod.price ?? mod.price_cents ?? 0;
                            return (
                              <p
                                key={modIndex}
                                className="text-xs text-[hsl(25,35%,55%)]"
                              >
                                + {modLabel}
                                {modPrice > 0 &&
                                  ` (${formatOrderPrice(modPrice)})`}
                              </p>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-[hsl(25,35%,25%)]">
                      {formatOrderPrice(
                        ((item as any).price ??
                          (item as any).price_cents ??
                          0) * item.quantity
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Notes */}
            {order.notes && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <h3 className="mb-2 font-semibold text-yellow-800">
                  📝 Special Instructions
                </h3>
                <p className="text-sm text-yellow-900">{order.notes}</p>
              </div>
            )}

            {/* Price Breakdown */}
            <div className="rounded-lg border border-[hsl(35,20%,90%)] p-4">
              <h3 className="mb-3 font-semibold text-[hsl(25,35%,25%)]">
                Payment Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[hsl(25,35%,55%)]">Subtotal</span>
                  <span className="text-[hsl(25,35%,25%)]">
                    {formatOrderPrice(order.subtotal_cents)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[hsl(25,35%,55%)]">Tax</span>
                  <span className="text-[hsl(25,35%,25%)]">
                    {formatOrderPrice(order.tax_cents)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[hsl(35,20%,90%)] pt-2 font-semibold">
                  <span className="text-[hsl(25,35%,25%)]">Total</span>
                  <span className="text-[hsl(25,35%,25%)]">
                    {formatOrderPrice(order.total_cents)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 text-xs">
                  <span className="text-[hsl(25,35%,55%)]">Payment Method</span>
                  <span className="capitalize text-[hsl(25,35%,25%)]">
                    {order.payment_method}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[hsl(25,35%,55%)]">Payment Status</span>
                  <span
                    className={`capitalize ${
                      order.payment_status === "paid"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {order.payment_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Timestamps */}
            <div className="space-y-1 text-xs text-[hsl(25,35%,55%)]">
              <p>
                Created: {formatOrderTime(order.created_at)} •{" "}
                {getOrderAge(order.created_at)}
              </p>
              {order.updated_at !== order.created_at && (
                <p>
                  Last updated: {formatOrderTime(order.updated_at)} •{" "}
                  {getOrderAge(order.updated_at)}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t p-4">
            <button
              onClick={onClose}
              className="rounded-md border border-[hsl(35,20%,85%)] px-4 py-2 text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Filter tabs for order status
 */
function StatusFilter({
  activeFilter,
  onFilterChange,
  orderCounts,
}: {
  activeFilter: OrderStatus | "all";
  onFilterChange: (filter: OrderStatus | "all") => void;
  orderCounts: Record<OrderStatus | "all", number>;
}) {
  const filters: Array<{ value: OrderStatus | "all"; label: string }> = [
    { value: "all", label: "All Active" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "preparing", label: "Preparing" },
  ];

  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Filter orders by status"
    >
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            activeFilter === filter.value
              ? "bg-[hsl(25,35%,25%)] text-white"
              : "bg-[hsl(35,20%,95%)] text-[hsl(25,35%,45%)] hover:bg-[hsl(35,20%,90%)]"
          }`}
          role="tab"
          aria-selected={activeFilter === filter.value}
          aria-controls="orders-list"
        >
          {filter.label} ({orderCounts[filter.value]})
        </button>
      ))}
    </div>
  );
}

/**
 * Priority threshold in minutes - orders older than this are marked as high priority
 */
const PRIORITY_THRESHOLD_MINUTES = 10;

/**
 * Check if an order is high priority (older than threshold)
 */
function isOrderHighPriority(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = diffMs / 60000;
  return diffMins >= PRIORITY_THRESHOLD_MINUTES;
}

/**
 * Sort orders by priority: earliest first (ASAP)
 * Orders are sorted by created_at ascending (oldest first = highest priority)
 */
function sortOrdersByPriority(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    // Primary sort: by created_at ascending (oldest first = highest priority)
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateA - dateB;
  });
}

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  /**
   * Fetch active orders from database (CSA-122)
   * Includes customer profile information via join
   */
  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      const supabase = createClient();

      // Fetch orders with customer profile data
      // Using left join pattern: customer_id references profiles(id)
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select(
          `
          *,
          customer:profiles!orders_customer_id_fkey(
            id,
            full_name,
            email,
            phone
          )
        `
        )
        .in("status", ACTIVE_ORDER_STATUSES)
        .order("created_at", { ascending: true });

      if (fetchError) {
        console.error("Error fetching orders:", fetchError);
        throw new Error(fetchError.message);
      }

      // Transform the data to match our Order type
      const transformedOrders: Order[] = (data || []).map((order) => ({
        ...order,
        customer: order.customer || null,
      }));

      setOrders(transformedOrders);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Set up real-time subscription for order updates
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("staff-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("Order change detected:", payload.eventType);
          // Refetch all orders to ensure consistency
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  // Filter orders by status
  const filteredOrders =
    statusFilter === "all"
      ? orders
      : orders.filter((order) => order.status === statusFilter);

  // Sort filtered orders by priority (CSA-123)
  const sortedOrders = sortOrdersByPriority(filteredOrders);

  // Calculate order counts for each status
  const orderCounts: Record<OrderStatus | "all", number> = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready: 0, // Not shown in active queue
    completed: 0, // Not shown in active queue
    cancelled: 0, // Not shown in active queue
  };

  // Loading state
  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[hsl(25,35%,25%)] border-r-transparent"></div>
            <p className="mt-4 text-[hsl(25,35%,45%)]">Loading orders...</p>
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-red-600">Error</p>
            <p className="mt-2 text-[hsl(25,35%,45%)]">{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                fetchOrders();
              }}
              className="mt-4 rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)]"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-[hsl(25,35%,25%)]">
          Orders Queue
        </h1>
        <p className="mt-1 text-[hsl(25,35%,55%)]">
          Manage and process customer orders • Sorted by priority (earliest
          first)
        </p>
      </header>

      {/* Quick Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-800">
            {orderCounts.pending}
          </p>
          <p className="text-sm text-yellow-600">Pending</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
          <p className="text-2xl font-bold text-blue-800">
            {orderCounts.confirmed}
          </p>
          <p className="text-sm text-blue-600">Confirmed</p>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-center">
          <p className="text-2xl font-bold text-orange-800">
            {orderCounts.preparing}
          </p>
          <p className="text-sm text-orange-600">Preparing</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-6">
        <StatusFilter
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          orderCounts={orderCounts}
        />
      </div>

      {/* Orders List */}
      <section id="orders-list" role="tabpanel" aria-label="Orders list">
        {sortedOrders.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-[hsl(35,20%,85%)] p-12 text-center">
            <div className="mb-4 text-5xl">☕</div>
            <h2 className="text-xl font-semibold text-[hsl(25,35%,25%)]">
              No active orders
            </h2>
            <p className="mt-2 text-[hsl(25,35%,55%)]">
              {statusFilter === "all"
                ? "When customers place orders, they will appear here."
                : `No orders with "${statusFilter}" status.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onViewDetails={setSelectedOrder}
                isHighPriority={isOrderHighPriority(order.created_at)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Order Detail Modal (CSA-124) */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </main>
  );
}
