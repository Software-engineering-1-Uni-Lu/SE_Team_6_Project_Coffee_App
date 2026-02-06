/**
 * Purpose: Print-optimized order ticket page for staff.
 * Designed for thermal printer-friendly output (80mm width).
 * Staff navigates here and uses browser Print (Ctrl+P / Cmd+P).
 */

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/src/integrations/supabase/client";
import {
  Order,
  getOrderCustomerName,
  formatOrderPrice,
  formatOrderTime,
} from "@/src/types/order";

export default function PrintTicketPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("orders")
        .select(
          `*, customer:profiles!orders_customer_id_fkey(id, full_name, email, phone)`
        )
        .eq("id", orderId)
        .single();

      if (!error && data) {
        setOrder({ ...data, customer: data.customer || null });
      }
      setLoading(false);
    };

    fetchOrder();
  }, [orderId]);

  useEffect(() => {
    // Auto-trigger print dialog when order loads
    if (order && !loading) {
      setTimeout(() => window.print(), 500);
    }
  }, [order, loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Order not found</p>
      </div>
    );
  }

  const customerName = getOrderCustomerName(order);

  return (
    <>
      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 2mm;
          }
          body {
            font-family: "Courier New", monospace;
            font-size: 12px;
            color: #000;
            background: #fff;
          }
          .no-print {
            display: none !important;
          }
        }
        @media screen {
          .ticket {
            max-width: 320px;
            margin: 20px auto;
            border: 1px dashed #ccc;
            padding: 16px;
            font-family: "Courier New", monospace;
            font-size: 12px;
          }
        }
      `}</style>

      {/* Print button (hidden during print) */}
      <div className="no-print mb-4 flex justify-center gap-4 pt-4">
        <button
          onClick={() => window.print()}
          className="rounded-md bg-[hsl(25,35%,25%)] px-6 py-2 text-sm font-medium text-white hover:bg-[hsl(25,40%,15%)]"
        >
          Print Ticket
        </button>
        <button
          onClick={() => router.push("/staff/orders")}
          className="rounded-md border border-[hsl(35,20%,85%)] px-6 py-2 text-sm font-medium text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
        >
          Back to Orders
        </button>
      </div>

      {/* Ticket Content */}
      <div className="ticket">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <div style={{ fontSize: "16px", fontWeight: "bold" }}>CAFE AROMA</div>
          <div>--- ORDER TICKET ---</div>
        </div>

        {/* Order Info */}
        <div style={{ borderTop: "1px dashed #000", paddingTop: "4px" }}>
          <div>Order: #{order.id.slice(0, 8)}</div>
          <div>Time: {formatOrderTime(order.created_at)}</div>
          <div>Customer: {customerName}</div>
          {order.pickup_time && (
            <div>Pickup: {formatOrderTime(order.pickup_time)}</div>
          )}
          {!order.pickup_time && <div>Type: ASAP</div>}
        </div>

        {/* Divider */}
        <div
          style={{
            borderTop: "1px dashed #000",
            margin: "6px 0",
          }}
        />

        {/* Items */}
        <div>
          {order.items.map((item, index) => (
            <div key={index} style={{ marginBottom: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  {item.quantity}x {item.name}
                </span>
                <span>
                  {formatOrderPrice(
                    ((item as any).price ?? (item as any).price_cents ?? 0) *
                      item.quantity
                  )}
                </span>
              </div>
              {item.modifiers &&
                item.modifiers.map((mod: any, modIdx: number) => (
                  <div
                    key={modIdx}
                    style={{ paddingLeft: "12px", fontSize: "11px" }}
                  >
                    + {mod.label || mod.name}
                  </div>
                ))}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            borderTop: "1px dashed #000",
            margin: "6px 0",
          }}
        />

        {/* Totals */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Subtotal:</span>
            <span>{formatOrderPrice(order.subtotal_cents)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Tax:</span>
            <span>{formatOrderPrice(order.tax_cents)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: "bold",
              marginTop: "4px",
            }}
          >
            <span>TOTAL:</span>
            <span>{formatOrderPrice(order.total_cents)}</span>
          </div>
        </div>

        {/* Payment */}
        <div style={{ marginTop: "6px" }}>
          <div>
            Payment: {order.payment_method.toUpperCase()} (
            {order.payment_status.toUpperCase()})
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div
            style={{
              borderTop: "1px dashed #000",
              marginTop: "6px",
              paddingTop: "4px",
            }}
          >
            <div style={{ fontWeight: "bold" }}>NOTES:</div>
            <div>{order.notes}</div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            marginTop: "8px",
            borderTop: "1px dashed #000",
            paddingTop: "4px",
          }}
        >
          <div>Thank you!</div>
        </div>
      </div>
    </>
  );
}
