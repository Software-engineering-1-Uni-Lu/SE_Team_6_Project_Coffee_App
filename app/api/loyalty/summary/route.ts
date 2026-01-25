/**
 * GET /api/loyalty/summary
 *
 * Purpose: Return the authenticated customer's loyalty points balance
 * and recent earned history.
 */

import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const HISTORY_LIMIT = 20;

export async function GET() {
  try {
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

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const role = roleError || !roleData ? "customer" : roleData.role;
    if (role !== "customer") {
      return NextResponse.json(
        { error: "Only customers can view loyalty points" },
        { status: 403 }
      );
    }

    const { data: ledgerRows, error: ledgerError } = await supabase
      .from("loyalty_ledger")
      .select("id, order_id, points_delta, reason, created_at")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });

    if (ledgerError) {
      return NextResponse.json(
        { error: "Failed to load loyalty history" },
        { status: 500 }
      );
    }

    const allEntries = ledgerRows || [];
    const balance = allEntries.reduce(
      (sum, entry) => sum + (entry.points_delta || 0),
      0
    );

    const history = allEntries
      .filter((entry) => entry.points_delta > 0)
      .slice(0, HISTORY_LIMIT);

    return NextResponse.json({ balance, history }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/loyalty/summary:", error);
    return NextResponse.json(
      { error: "Unexpected error loading loyalty summary" },
      { status: 500 }
    );
  }
}
