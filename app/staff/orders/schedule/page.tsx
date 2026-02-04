"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/src/integrations/supabase/client";
import {
  Order,
  getOrderCustomerName,
  formatOrderPrice,
  formatOrderTime,
  ORDER_STATUS_CONFIG,
} from "@/src/types/order";

export default function StaffSchedulePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState<"today" | "tomorrow">("today");

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const supabase = createClient();

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const dateToCheck = viewDate === "today" ? today : tomorrow;
      // Set to midnight local time effectively, but we deal with ISO strings.
      // Simplest way: use start of day in local time, convert to ISO.
      // However, pickup_time is TIMESTAMPTZ.
      // Let's rely on standard ISO string comparison which works for UTC.
      // We need start of day in UTC? Or user's local timezone?
      // Since this is a cafe app likely used in one timezone, let's assume local machine time matches cafe time.
      const startOfDay = new Date(dateToCheck);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateToCheck);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          customer:profiles!orders_customer_id_fkey(full_name, email, phone)
        `
        )
        .not("pickup_time", "is", null)
        .gte("pickup_time", startOfDay.toISOString())
        .lte("pickup_time", endOfDay.toISOString())
        .neq("status", "cancelled")
        .neq("status", "completed")
        .order("pickup_time", { ascending: true });

      if (data) {
        setOrders(
          data.map((o) => ({ ...o, customer: o.customer || null })) as Order[]
        );
      }
      setLoading(false);
    };

    fetchOrders();
  }, [viewDate]);

  // Group orders by hour
  const groupedOrders = orders.reduce(
    (acc, order) => {
      if (!order.pickup_time) return acc;
      const date = new Date(order.pickup_time);
      const hour = date.getHours();
      const timeSlot = `${hour}:00`;

      if (!acc[timeSlot]) acc[timeSlot] = [];
      acc[timeSlot].push(order);
      return acc;
    },
    {} as Record<string, Order[]>
  );

  const sortedTimeSlots = Object.keys(groupedOrders).sort((a, b) => {
    return parseInt(a.split(":")[0]) - parseInt(b.split(":")[0]);
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[hsl(25,35%,25%)]">
            Pickup Schedule
          </h1>
          <p className="text-[hsl(25,35%,55%)]">
            Scheduled orders for {viewDate === "today" ? "Today" : "Tomorrow"}
          </p>
        </div>
        <Link
          href="/staff/orders"
          className="text-sm font-medium text-[hsl(25,35%,45%)] hover:text-[hsl(25,35%,25%)] hover:underline"
        >
          ← Back to Queue
        </Link>
      </div>

      {/* Date Toggle */}
      <div className="mb-8 flex gap-2">
        <button
          onClick={() => setViewDate("today")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            viewDate === "today"
              ? "bg-[hsl(25,35%,25%)] text-white"
              : "bg-[hsl(35,20%,95%)] text-[hsl(25,35%,45%)] hover:bg-[hsl(35,20%,90%)]"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setViewDate("tomorrow")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            viewDate === "tomorrow"
              ? "bg-[hsl(25,35%,25%)] text-white"
              : "bg-[hsl(35,20%,95%)] text-[hsl(25,35%,45%)] hover:bg-[hsl(35,20%,90%)]"
          }`}
        >
          Tomorrow
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(25,35%,25%)] border-t-transparent"></div>
        </div>
      ) : sortedTimeSlots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[hsl(35,20%,85%)] p-12 text-center">
          <p className="text-[hsl(25,35%,55%)]">
            No scheduled orders for {viewDate}.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedTimeSlots.map((slot) => (
            <div key={slot} className="relative pl-8">
              {/* Timeline line */}
              <div className="absolute bottom-0 left-3 top-0 w-px bg-[hsl(35,20%,85%)]"></div>
              {/* Time bubble */}
              <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(25,35%,25%)] text-xs font-bold text-white">
                •
              </div>

              <h3 className="mb-4 text-lg font-bold text-[hsl(25,35%,25%)]">
                {slot}
              </h3>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groupedOrders[slot].map((order) => {
                  const statusConfig = ORDER_STATUS_CONFIG[order.status];
                  return (
                    <div
                      key={order.id}
                      className="rounded-lg border border-[hsl(35,20%,90%)] bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-[hsl(25,35%,55%)]">
                          {formatOrderTime(order.pickup_time!)}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusConfig.color} ${statusConfig.bgColor} ${statusConfig.borderColor}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                      <h4 className="font-bold text-[hsl(25,35%,25%)]">
                        {getOrderCustomerName(order)}
                      </h4>
                      <p className="text-sm text-[hsl(25,35%,45%)]">
                        {order.items.length} items •{" "}
                        {formatOrderPrice(order.total_cents)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
