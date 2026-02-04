import { Order } from "@/src/types/order";

export const ORDER_GRACE_PERIOD_MINUTES = 5;

/**
 * Checks if an order can be cancelled by the customer.
 * Criteria:
 * 1. Status is 'pending'.
 * 2. Created within the grace period (5 minutes).
 */
export function canCancelOrder(order: Order): boolean {
  if (order.status !== "pending") {
    return false;
  }

  const createdTime = new Date(order.created_at).getTime();
  const now = new Date().getTime();
  const diffMinutes = (now - createdTime) / 1000 / 60;

  return diffMinutes <= ORDER_GRACE_PERIOD_MINUTES;
}
