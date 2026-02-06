/**
 * PATCH /api/orders/[id]
 *
 * PURPOSE:
 * Update order status. Allows staff, admin, and manager to accept, decline, and complete orders.
 * Server-side handling ensures RLS policies are properly enforced.
 *
 * USER STORIES SATISFIED:
 * - CSA-122: Update order status via Supabase
 * - Staff, admin, and manager can transition orders through workflow stages
 *
 * SECURITY:
 * - Uses server-side Supabase client with proper RLS enforcement
 * - Validates order status transitions
 * - Restricted to staff, admin, and manager roles via RLS policies
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendOrderStatusUpdate } from "@/src/lib/notifications";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request body. Expected JSON." },
        { status: 400 }
      );
    }

    const { status } = body;

    // Validate required fields
    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Validate status value
    const validStatuses = [
      "pending",
      "confirmed",
      "preparing",
      "ready",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Create Supabase client with explicit cookie handling
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set(name, "", options);
          },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify user has staff, admin, or manager role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["staff", "admin", "manager"])
      .single();

    if (roleError || !roleData) {
      return NextResponse.json(
        { error: "Only staff, admin, and manager can update orders" },
        { status: 403 }
      );
    }

    // Update order status
    const { data: order, error: updateError } = await supabase
      .from("orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating order:", updateError);

      // Provide helpful error messages
      if (updateError.code === "42501") {
        // RLS policy violation
        return NextResponse.json(
          {
            error:
              "You don't have permission to update this order. Cannot modify completed or cancelled orders.",
          },
          { status: 403 }
        );
      }

      if (updateError.code === "PGRST116") {
        // No rows returned (order not found or no permission)
        return NextResponse.json(
          { error: "Order not found or already completed/cancelled" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: updateError.message || "Failed to update order" },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Send email notification for key status changes (best-effort)
    if (["ready", "completed", "cancelled"].includes(status)) {
      const emailTo = order.guest_email;
      const emailName = order.guest_name || "Customer";
      if (emailTo) {
        sendOrderStatusUpdate(emailTo, emailName, order.id, status).catch(
          (err) => console.error("[Email] Error:", err)
        );
      }
    }

    return NextResponse.json({ order }, { status: 200 });
  } catch (error: any) {
    console.error("Unexpected error updating order:", error);

    return NextResponse.json(
      {
        error: error?.message || "An unexpected error occurred",
        details:
          process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
