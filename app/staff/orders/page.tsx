/**
 * Purpose: Staff orders queue page for managing incoming orders.
 * Allows staff to view, accept, and update order status.
 *
 * User Stories:
 * - CSA-121: Create /staff/orders page
 * - CSA-122: Fetch active orders (pending, confirmed, preparing) & Update order status via Supabase
 * - CSA-123: Sort by priority (earliest first/ASAP) & Confirm action with modal
 * - CSA-124: Display order summary in modal & Update queue UI
 * - CSA-125: Add "Accept / Decline / Completed" buttons per order
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
  onQuickAction,
}: {
  order: Order;
  onViewDetails: (order: Order) => void;
  isHighPriority: boolean;
  onQuickAction?: (orderId: string, action: "accept" | "decline") => void;
}) {
  const customerName = getOrderCustomerName(order);
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const orderAge = getOrderAge(order.created_at);

  // Show quick action buttons only for pending orders
  const showQuickActions = order.status === "pending" && onQuickAction;

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
            {!order.customer_id && (
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

          {/* Quick action buttons for pending orders (CSA-125) */}
          {showQuickActions && (
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAction(order.id, "accept");
                }}
                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                aria-label={`Accept order from ${customerName}`}
                title="Accept order"
              >
                ✓
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAction(order.id, "decline");
                }}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label={`Decline order from ${customerName}`}
                title="Decline order"
              >
                ✕
              </button>
            </div>
          )}

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
 * Confirmation modal component (CSA-123)
 */
function ConfirmationModal({
  title,
  message,
  confirmLabel,
  confirmColor = "bg-[hsl(25,35%,25%)] hover:bg-[hsl(25,40%,15%)]",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black bg-opacity-50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
      >
        <h3
          id="confirmation-title"
          className="mb-3 text-xl font-bold text-[hsl(25,35%,25%)]"
        >
          {title}
        </h3>
        <p className="mb-6 text-[hsl(25,35%,45%)]">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-md border border-[hsl(35,20%,85%)] px-4 py-2 text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${confirmColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * Order detail modal component (CSA-124)
 */
function OrderDetailModal({
  order,
  onClose,
  onStatusUpdate,
}: {
  order: Order;
  onClose: () => void;
  onStatusUpdate: (orderId: string, newStatus: OrderStatus) => void;
}) {
  const customerName = getOrderCustomerName(order);
  const customerEmail = getOrderCustomerEmail(order);
  const [showConfirmation, setShowConfirmation] = useState<{
    action: "accept" | "decline" | "prepare" | "ready" | "complete";
    status: OrderStatus;
  } | null>(null);

  const handleActionClick = (
    action: "accept" | "decline" | "prepare" | "ready" | "complete",
    status: OrderStatus
  ) => {
    setShowConfirmation({ action, status });
  };

  const handleConfirm = () => {
    if (showConfirmation) {
      onStatusUpdate(order.id, showConfirmation.status);
      setShowConfirmation(null);
      onClose();
    }
  };

  const getConfirmationDetails = () => {
    if (!showConfirmation) return null;

    const configs = {
      accept: {
        title: "Accept Order",
        message: `Are you sure you want to accept this order from ${customerName}?`,
        confirmLabel: "Accept Order",
        confirmColor: "bg-green-600 hover:bg-green-700",
      },
      decline: {
        title: "Decline Order",
        message: `Are you sure you want to decline this order from ${customerName}? This action cannot be undone.`,
        confirmLabel: "Decline Order",
        confirmColor: "bg-red-600 hover:bg-red-700",
      },
      prepare: {
        title: "Start Preparing Order",
        message: `Start preparing this order from ${customerName}?`,
        confirmLabel: "Start Preparing",
        confirmColor: "bg-orange-600 hover:bg-orange-700",
      },
      ready: {
        title: "Mark Order as Ready",
        message: `Mark this order from ${customerName} as ready for pickup?`,
        confirmLabel: "Mark as Ready",
        confirmColor: "bg-blue-600 hover:bg-blue-700",
      },
      complete: {
        title: "Complete Order",
        message: `Mark this order from ${customerName} as completed and handed over?`,
        confirmLabel: "Complete Order",
        confirmColor: "bg-[hsl(25,35%,25%)] hover:bg-[hsl(25,40%,15%)]",
      },
    };

    return configs[showConfirmation.action];
  };

  const confirmationDetails = getConfirmationDetails();

  // Determine which action buttons to show based on current status
  const showAcceptButton = order.status === "pending";
  const showDeclineButton = ["pending", "confirmed", "preparing"].includes(
    order.status
  );
  const showPrepareButton = order.status === "confirmed";
  const showReadyButton = order.status === "preparing";
  const showCompleteButton = order.status === "ready";

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
              {!order.customer_id && (
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
                    {order.payment_method === "card"
                      ? "Card"
                      : order.payment_method === "cash"
                        ? "Cash"
                        : "Loyalty Points"}
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

          {/* Footer with action buttons (CSA-125) */}
          <div className="flex flex-wrap justify-end gap-3 border-t p-4">
            {showAcceptButton && (
              <button
                onClick={() => handleActionClick("accept", "confirmed")}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                aria-label="Accept order"
              >
                ✓ Accept Order
              </button>
            )}
            {showPrepareButton && (
              <button
                onClick={() => handleActionClick("prepare", "preparing")}
                className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                aria-label="Start preparing order"
              >
                🔥 Start Preparing
              </button>
            )}
            {showReadyButton && (
              <button
                onClick={() => handleActionClick("ready", "ready")}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Mark as ready"
              >
                ✓ Mark as Ready
              </button>
            )}
            {showCompleteButton && (
              <button
                onClick={() => handleActionClick("complete", "completed")}
                className="rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)] focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)] focus:ring-offset-2"
                aria-label="Mark as completed"
              >
                ✓ Complete & Hand Over
              </button>
            )}
            {showDeclineButton && (
              <button
                onClick={() => handleActionClick("decline", "cancelled")}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Decline order"
              >
                ✕ Decline Order
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-md border border-[hsl(35,20%,85%)] px-4 py-2 text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal (CSA-123) */}
      {showConfirmation && confirmationDetails && (
        <ConfirmationModal
          title={confirmationDetails.title}
          message={confirmationDetails.message}
          confirmLabel={confirmationDetails.confirmLabel}
          confirmColor={confirmationDetails.confirmColor}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirmation(null)}
        />
      )}
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
    { value: "ready", label: "Ready" },
  ];

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Filter orders by status"
    >
      {filters.map((filter) => {
        const isSelected = activeFilter === filter.value;
        const buttonProps: React.ButtonHTMLAttributes<HTMLButtonElement> = {
          onClick: () => onFilterChange(filter.value),
          className: `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            isSelected
              ? "bg-[hsl(25,35%,25%)] text-white"
              : "bg-[hsl(35,20%,95%)] text-[hsl(25,35%,45%)] hover:bg-[hsl(35,20%,90%)]"
          }`,
          "aria-pressed": isSelected ? "true" : "false",
        };
        return (
          <button key={filter.value} {...buttonProps}>
            {filter.label} ({orderCounts[filter.value]})
          </button>
        );
      })}
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
  const [updating, setUpdating] = useState(false);
  const [quickActionConfirm, setQuickActionConfirm] = useState<{
    orderId: string;
    action: "accept" | "decline";
  } | null>(null);

  /**
   * Update order status (CSA-122)
   */
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setUpdating(true);
      setError(null);

      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update order");
      }

      // Success - immediately refresh the orders list
      console.log(`Order ${orderId} updated to ${newStatus}`);
      await fetchOrders(); // Immediate UI update
    } catch (err) {
      console.error("Failed to update order:", err);
      setError(err instanceof Error ? err.message : "Failed to update order");
      // Re-throw to let the caller handle it if needed
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  /**
   * Handle quick actions from order cards (CSA-125)
   */
  const handleQuickAction = (orderId: string, action: "accept" | "decline") => {
    setQuickActionConfirm({ orderId, action });
  };

  /**
   * Confirm quick action
   */
  const confirmQuickAction = async () => {
    if (!quickActionConfirm) return;

    const newStatus: OrderStatus =
      quickActionConfirm.action === "accept" ? "confirmed" : "cancelled";

    try {
      await updateOrderStatus(quickActionConfirm.orderId, newStatus);
      setQuickActionConfirm(null);
    } catch (err) {
      // Error already handled in updateOrderStatus
      setQuickActionConfirm(null);
    }
  };

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
    ready: orders.filter((o) => o.status === "ready").length,
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
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
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
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
          <p className="text-2xl font-bold text-green-800">
            {orderCounts.ready}
          </p>
          <p className="text-sm text-green-600">Ready</p>
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
                onQuickAction={handleQuickAction}
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
          onStatusUpdate={updateOrderStatus}
        />
      )}

      {/* Quick Action Confirmation Modal (CSA-123) */}
      {quickActionConfirm && (
        <ConfirmationModal
          title={
            quickActionConfirm.action === "accept"
              ? "Accept Order"
              : "Decline Order"
          }
          message={
            quickActionConfirm.action === "accept"
              ? "Are you sure you want to accept this order?"
              : "Are you sure you want to decline this order? This action cannot be undone."
          }
          confirmLabel={
            quickActionConfirm.action === "accept"
              ? "Accept Order"
              : "Decline Order"
          }
          confirmColor={
            quickActionConfirm.action === "accept"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700"
          }
          onConfirm={confirmQuickAction}
          onCancel={() => setQuickActionConfirm(null)}
        />
      )}
    </main>
  );
}
