/**
 * Purpose: Type definitions for order-related entities.
 * Defines interfaces for orders, order items, and order status management.
 *
 * Tasks:
 * - CSA-121: Create /staff/orders page
 * - CSA-122: Fetch active orders (pending, confirmed, preparing)
 * - CSA-123: Sort by priority (earliest first/ASAP)
 * - CSA-124: Display order summary in modal
 */

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type PaymentMethod = "card" | "cash";

export type PaymentStatus = "paid" | "unpaid" | "refunded";

/**
 * Individual item within an order (stored in JSONB)
 */
export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number; // Price in cents
  basePrice?: number; // Base price before modifiers
  modifiers?: Array<{
    label: string;
    price: number; // Price in cents
  }>;
  imageUrl?: string | null;
}

/**
 * Customer profile information (from profiles table join)
 */
export interface OrderCustomer {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
}

/**
 * Complete order object with all fields
 */
export interface Order {
  id: string;
  customer_id: string | null;
  status: OrderStatus;
  items: OrderItem[];
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  payment_method: PaymentMethod;
  payment_status: string;
  pickup_time: string | null;
  notes: string | null;
  points_earned: number;
  points_redeemed: number;
  guest_name: string | null;
  guest_email: string | null;
  created_at: string;
  updated_at: string;
  // Joined from profiles table
  customer?: OrderCustomer | null;
}

/**
 * Active order statuses that should appear in the staff queue
 */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
];

/**
 * Order status display information
 */
export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  pending: {
    label: "Pending",
    color: "text-yellow-800",
    bgColor: "bg-yellow-100",
    borderColor: "border-yellow-300",
  },
  confirmed: {
    label: "Confirmed",
    color: "text-blue-800",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-300",
  },
  preparing: {
    label: "Preparing",
    color: "text-orange-800",
    bgColor: "bg-orange-100",
    borderColor: "border-orange-300",
  },
  ready: {
    label: "Ready",
    color: "text-green-800",
    bgColor: "bg-green-100",
    borderColor: "border-green-300",
  },
  completed: {
    label: "Completed",
    color: "text-gray-800",
    bgColor: "bg-gray-100",
    borderColor: "border-gray-300",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-800",
    bgColor: "bg-red-100",
    borderColor: "border-red-300",
  },
};

/**
 * Helper to get customer display name from order
 * Returns guest name if guest order, or customer full_name if authenticated order
 */
export function getOrderCustomerName(order: Order): string {
  if (order.guest_name) {
    return order.guest_name;
  }
  if (order.customer?.full_name) {
    return order.customer.full_name;
  }
  return "Unknown Customer";
}

/**
 * Helper to get customer email from order
 * Returns guest email if guest order, or customer email if authenticated order
 */
export function getOrderCustomerEmail(order: Order): string {
  if (order.guest_email) {
    return order.guest_email;
  }
  if (order.customer?.email) {
    return order.customer.email;
  }
  return "No email provided";
}

/**
 * Format price from cents to currency string
 */
export function formatOrderPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

/**
 * Format order timestamp for display
 */
export function formatOrderTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format order date for display
 */
export function formatOrderDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Calculate time elapsed since order was created
 */
export function getOrderAge(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins === 1) return "1 min ago";
  if (diffMins < 60) return `${diffMins} mins ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1 hour ago";
  return `${diffHours} hours ago`;
}
