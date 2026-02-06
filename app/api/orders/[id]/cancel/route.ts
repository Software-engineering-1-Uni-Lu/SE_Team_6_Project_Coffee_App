import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/integrations/supabase/server";
import { getCurrentUser } from "@/src/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Fetch order
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check ownership
    if (order.customer_id !== user.id) {
      return NextResponse.json(
        { error: "You can only cancel your own orders" },
        { status: 403 }
      );
    }

    // Check status
    if (order.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending orders can be cancelled" },
        { status: 400 }
      );
    }

    // Check grace period
    const { data: settingsData } = await supabase
      .from("settings")
      .select("cancellation_grace_period_minutes")
      .limit(1)
      .single();

    const gracePeriodMinutes =
      settingsData?.cancellation_grace_period_minutes ?? 5;
    const createdTime = new Date(order.created_at).getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - createdTime) / 1000 / 60;

    if (diffMinutes > gracePeriodMinutes) {
      return NextResponse.json(
        {
          error:
            "Cancellation grace period has expired. You can no longer cancel this order.",
        },
        { status: 400 }
      );
    }

    // Cancel order
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to cancel order" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Order cancelled successfully", order: updatedOrder },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error cancelling order:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
