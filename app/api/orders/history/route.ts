import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();

    // Use API-safe Supabase client with explicit cookie handling
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Attach any guest orders that match the user's email to their account
    if (user.email) {
      const { error: linkError } = await supabase.rpc("link_guest_orders", {
        p_email: user.email,
      });
      if (linkError) {
        console.warn("Failed to link guest orders:", linkError.message);
      }
    }

    const { data, error } = await supabase
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
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching order history:", error);
      return NextResponse.json(
        { error: "Failed to load orders" },
        { status: 500 }
      );
    }

    return NextResponse.json({ orders: data || [] });
  } catch (error) {
    console.error("Unexpected error in GET /api/orders/history:", error);
    return NextResponse.json(
      { error: "Unexpected error loading orders" },
      { status: 500 }
    );
  }
}
