/**
 * PATCH /api/orders/[id]
 *
 * PURPOSE:
 * Update an order (status, priority, etc.)
 * Allows staff to update order status and priority.
 *
 * SECURITY:
 * - Requires authentication
 * - Only staff/admin can update orders
 * - RLS policies enforce additional restrictions
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/integrations/supabase/server";
import { getCurrentUser, getUserRole } from "@/src/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const role = await getUserRole(user.id);
    if (role !== "staff" && role !== "admin" && role !== "manager") {
      return NextResponse.json(
        { error: "Only staff, managers, and admins can update orders" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, priority } = body;

    if (!status && !priority) {
      return NextResponse.json(
        { error: "At least one field (status or priority) must be provided" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const updates: { status?: string; priority?: string; updated_at?: string } =
      {};
    if (status) {
      const validStatuses = [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "completed",
        "cancelled",
      ];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = status;
    }
    if (priority) {
      const validPriorities = ["low", "normal", "high", "urgent"];
      if (!validPriorities.includes(priority)) {
        return NextResponse.json(
          { error: "Invalid priority" },
          { status: 400 }
        );
      }
      updates.priority = priority;
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating order:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update order" },
        { status: 500 }
      );
    }

    return NextResponse.json({ order: data }, { status: 200 });
  } catch (error: any) {
    console.error("Unexpected error updating order:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
