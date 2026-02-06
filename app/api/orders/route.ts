/**
 * POST /api/orders
 *
 * PURPOSE:
 * Create a new order. Handles both authenticated customer orders and guest orders.
 * Server-side handling ensures RLS policies are properly enforced.
 *
 * USER STORIES SATISFIED:
 * - Customer checkout and order placement
 * - Guest checkout functionality
 *
 * SECURITY:
 * - Uses server-side Supabase client with proper RLS enforcement
 * - Validates order data before insertion
 * - Handles both authenticated and guest orders
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAnonClient } from "@/src/integrations/supabase/anon";
import { isWithinOpeningHours, OpeningHours } from "@/src/lib/opening-hours";
import { sendOrderConfirmation } from "@/src/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    // Parse request body with error handling
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

    const {
      items,
      subtotal_cents,
      tax_cents,
      total_cents,
      payment_method,
      payment_status,
      guest_name,
      guest_email,
      pickup_time,
    } = body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Order must contain at least one item" },
        { status: 400 }
      );
    }

    if (
      subtotal_cents === undefined ||
      tax_cents === undefined ||
      total_cents === undefined
    ) {
      return NextResponse.json(
        { error: "Order totals are required" },
        { status: 400 }
      );
    }

    if (
      !payment_method ||
      !["card", "cash", "loyalty_points", "digital_wallet"].includes(
        payment_method
      )
    ) {
      return NextResponse.json(
        { error: "Valid payment method is required" },
        { status: 400 }
      );
    }

    // Create Supabase client with explicit cookie handling (same as working /api/auth/user)
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

    // Validate pickup time if provided
    if (pickup_time) {
      const pickupDate = new Date(pickup_time);

      // Fetch opening hours
      const { data: settingsData } = await supabase
        .from("settings")
        .select("opening_hours")
        .limit(1)
        .single();

      if (settingsData && settingsData.opening_hours) {
        const openingHours =
          settingsData.opening_hours as unknown as OpeningHours;
        if (!isWithinOpeningHours(pickupDate, openingHours)) {
          return NextResponse.json(
            { error: "Pickup time is outside opening hours" },
            { status: 400 }
          );
        }
      }
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.log("Auth check result:", authError.message);
    }
    console.log("User detected:", user?.id || "none (guest)");

    // Determine if this is a guest order or authenticated order
    // Guest order: no authenticated user AND guest info provided
    // Authenticated order: user is authenticated (will use customer_id)
    const isGuest = !user;

    // For authenticated users, verify they have customer role
    if (user) {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "customer")
        .single();

      if (roleError || !roleData) {
        return NextResponse.json(
          {
            error:
              "You must have a customer account to place orders. Staff and admin accounts cannot place customer orders.",
          },
          { status: 403 }
        );
      }
    } else {
      // For guests, validate required fields
      if (!guest_email || !guest_email.trim()) {
        return NextResponse.json(
          { error: "Email is required for guest orders" },
          { status: 400 }
        );
      }
      if (!guest_name || !guest_name.trim()) {
        return NextResponse.json(
          { error: "Name is required for guest orders" },
          { status: 400 }
        );
      }
      if (payment_method === "loyalty_points") {
        return NextResponse.json(
          { error: "Loyalty points require an authenticated account" },
          { status: 400 }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guest_email.trim())) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }
    }

    // Prepare order data
    // CRITICAL: guest_name and guest_email are now used for ALL orders to store contact info
    // - For guest orders: customer_id is null, guest fields store the guest's info
    // - For authenticated orders: customer_id is set, guest fields store custom contact info (e.g., ordering for a friend)
    const orderData: {
      customer_id: string | null;
      guest_name: string | null;
      guest_email: string | null;
      status: string;
      items: typeof items;
      subtotal_cents: number;
      tax_cents: number;
      total_cents: number;
      payment_method: "card" | "cash" | "loyalty_points" | "digital_wallet";
      payment_status: string;
      pickup_time: string | null;
    } = {
      customer_id: user ? user.id : null,
      guest_name: guest_name?.trim() || null,
      guest_email: guest_email?.trim() || null,
      status: "pending",
      items,
      subtotal_cents,
      tax_cents,
      total_cents,
      payment_method,
      payment_status:
        payment_status ||
        (payment_method === "card" ||
        payment_method === "loyalty_points" ||
        payment_method === "digital_wallet"
          ? "paid"
          : "unpaid"),
      pickup_time: pickup_time || null,
    };

    // Insert order into database
    // CRITICAL: Use different clients based on authentication status
    let order;
    let error;

    if (user) {
      // For authenticated customers: use authenticated client
      // RLS policy: auth.uid() = customer_id AND has_role(auth.uid(), 'customer')
      if (payment_method === "loyalty_points") {
        const result = await supabase.rpc("create_loyalty_points_order", {
          p_items: orderData.items,
          p_subtotal_cents: orderData.subtotal_cents,
          p_tax_cents: orderData.tax_cents,
          p_total_cents: orderData.total_cents,
          p_pickup_time: orderData.pickup_time,
          p_status: orderData.status,
        });

        order = result.data;
        error = result.error;
      } else {
        const result = await supabase
          .from("orders")
          .insert(orderData)
          .select()
          .single();

        order = result.data;
        error = result.error;
      }

      if (error) {
        console.error("Customer order error:", error);

        if (error.message?.includes("Insufficient points")) {
          return NextResponse.json(
            { error: "Insufficient loyalty points for this order" },
            { status: 400 }
          );
        }

        if (error.message?.includes("Only customers")) {
          return NextResponse.json(
            { error: "Only customers can use loyalty points" },
            { status: 403 }
          );
        }

        // Provide helpful error messages
        if (error.code === "42501") {
          // RLS policy violation
          return NextResponse.json(
            {
              error:
                "You don't have permission to create orders. Please ensure you have a customer account.",
            },
            { status: 403 }
          );
        }

        return NextResponse.json(
          { error: error.message || "Failed to create order" },
          { status: 500 }
        );
      }
    } else {
      // For guests: CRITICAL - use anon client
      // This ensures auth.uid() IS NULL, matching the TO anon RLS policy
      let anonClient;
      try {
        anonClient = createAnonClient();
      } catch (clientError) {
        console.error("Error creating anon client:", clientError);
        return NextResponse.json(
          { error: "Failed to initialize guest order client" },
          { status: 500 }
        );
      }

      try {
        // Double-check: verify no session exists
        // This helps debug if there's any lingering auth context
        const {
          data: { session },
        } = await anonClient.auth.getSession();
        if (session) {
          console.warn(
            "Anon client has session, clearing...",
            session.user?.id
          );
          await anonClient.auth.signOut();
        }

        // Verify user is null (additional check)
        const {
          data: { user: anonUser },
        } = await anonClient.auth.getUser();
        if (anonUser) {
          console.warn(
            "Anon client has user, this should not happen:",
            anonUser.id
          );
        }

        const result = await anonClient
          .from("orders")
          .insert(orderData)
          .select()
          .single();

        order = result.data;
        error = result.error;
      } catch (anonError) {
        console.error("Error in guest order creation:", anonError);
        return NextResponse.json(
          { error: "Failed to create guest order. Please try again." },
          { status: 500 }
        );
      }

      if (error) {
        console.error("Guest order error:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);

        // Provide helpful error messages
        if (error.code === "42501") {
          // RLS policy violation
          return NextResponse.json(
            {
              error:
                "Failed to create guest order. Please ensure you're not logged in and all guest information is provided.",
            },
            { status: 403 }
          );
        }

        return NextResponse.json(
          { error: error.message || "Failed to create guest order" },
          { status: 500 }
        );
      }
    }

    if (!order) {
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // Send order confirmation email (best-effort, don't block response)
    const emailTo = orderData.guest_email;
    const emailName = orderData.guest_name || "Customer";
    if (emailTo) {
      sendOrderConfirmation({
        orderId: order.id,
        customerEmail: emailTo,
        customerName: emailName,
        items: orderData.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price || 0,
        })),
        totalCents: orderData.total_cents,
        paymentMethod: orderData.payment_method,
        pickupTime: orderData.pickup_time,
      }).catch((err) => console.error("[Email] Error:", err));
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (error: any) {
    console.error("Unexpected error creating order:", error);
    console.error("Error stack:", error?.stack);
    console.error("Error message:", error?.message);

    // Ensure we always return JSON, even for unexpected errors
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
