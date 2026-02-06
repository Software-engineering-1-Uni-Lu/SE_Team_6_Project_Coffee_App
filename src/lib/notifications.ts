/**
 * Email notification service using Resend.
 *
 * Sends transactional emails for order lifecycle events.
 * Requires RESEND_API_KEY environment variable.
 *
 * Falls back gracefully if RESEND_API_KEY is not set (logs instead of sending).
 */

import { Resend } from "resend";

const FROM_EMAIL = "Cafe Aroma <orders@cafearoma.com>";

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

interface OrderEmailData {
  orderId: string;
  customerEmail: string;
  customerName: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  totalCents: number;
  paymentMethod: string;
  pickupTime?: string | null;
}

function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

export async function sendOrderConfirmation(data: OrderEmailData) {
  const resend = getResendClient();

  const itemsList = data.items
    .map(
      (item) =>
        `${item.quantity}x ${item.name} - ${formatPrice(item.price * item.quantity)}`
    )
    .join("\n");

  const pickupInfo = data.pickupTime
    ? `\nPickup Time: ${new Date(data.pickupTime).toLocaleString("en-GB")}`
    : "";

  const text = `Hi ${data.customerName},

Thank you for your order at Cafe Aroma!

Order #${data.orderId.slice(0, 8)}

Items:
${itemsList}

Total: ${formatPrice(data.totalCents)}
Payment: ${data.paymentMethod}${pickupInfo}

We'll notify you when your order is ready for pickup.

- Cafe Aroma Team`;

  if (!resend) {
    console.log(
      "[Email] Order confirmation (no RESEND_API_KEY):",
      data.customerEmail
    );
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `Order Confirmed - #${data.orderId.slice(0, 8)}`,
      text,
    });
  } catch (error) {
    console.error("[Email] Failed to send order confirmation:", error);
  }
}

export async function sendOrderStatusUpdate(
  customerEmail: string,
  customerName: string,
  orderId: string,
  newStatus: string
) {
  const resend = getResendClient();

  const statusMessages: Record<string, string> = {
    confirmed: "Your order has been confirmed and will be prepared shortly.",
    preparing: "Your order is now being prepared!",
    ready: "Your order is ready for pickup! Please come to the counter.",
    completed:
      "Your order has been completed. Thank you for visiting Cafe Aroma!",
    cancelled:
      "Your order has been cancelled. If you have questions, please contact us.",
  };

  const message =
    statusMessages[newStatus] ||
    `Your order status has been updated to: ${newStatus}`;

  const text = `Hi ${customerName},

${message}

Order #${orderId.slice(0, 8)}

- Cafe Aroma Team`;

  if (!resend) {
    console.log(
      `[Email] Order status update to ${newStatus} (no RESEND_API_KEY):`,
      customerEmail
    );
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject:
        newStatus === "ready"
          ? `Your Order is Ready! - #${orderId.slice(0, 8)}`
          : `Order Update - #${orderId.slice(0, 8)}`,
      text,
    });
  } catch (error) {
    console.error("[Email] Failed to send status update:", error);
  }
}

export async function sendOrderReadyForPickup(
  customerEmail: string,
  customerName: string,
  orderId: string
) {
  return sendOrderStatusUpdate(customerEmail, customerName, orderId, "ready");
}
