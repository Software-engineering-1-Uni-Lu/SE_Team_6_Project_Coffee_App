import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    let body: { orderId?: string; email?: string };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Expected JSON." },
        { status: 400 }
      );
    }

    const orderId = body.orderId?.trim();
    const email = body.email?.trim();

    if (!orderId || !UUID_REGEX.test(orderId)) {
      return NextResponse.json(
        { error: "A valid order ID is required" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required to look up an order" },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY for order lookup");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Step 1: Verify the order ID belongs to the provided email
    const { data: orderMatch, error: matchError } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .ilike("guest_email", normalizedEmail)
      .maybeSingle();

    if (matchError) {
      console.error("Error verifying guest order ownership:", matchError);
      return NextResponse.json(
        { error: "Unable to verify order" },
        { status: 500 }
      );
    }

    if (!orderMatch) {
      return NextResponse.json(
        { error: "Order not found for that email" },
        { status: 404 }
      );
    }

    // Step 2: Return only the specific order that was requested
    const { data: order, error: lookupError } = await supabaseAdmin
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
      .eq("id", orderId)
      .single();

    if (lookupError) {
      console.error("Error fetching guest order:", lookupError);
      return NextResponse.json(
        { error: "Failed to fetch order" },
        { status: 500 }
      );
    }

    // Return as array for compatibility with existing frontend code
    return NextResponse.json({ orders: [order] });
  } catch (error) {
    console.error("Unexpected error in POST /api/orders/lookup:", error);
    return NextResponse.json(
      { error: "Unexpected error looking up order" },
      { status: 500 }
    );
  }
}
