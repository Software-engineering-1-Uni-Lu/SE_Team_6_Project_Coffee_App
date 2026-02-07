/**
 * GET /api/manager/ingredients/audit-log
 *
 * PURPOSE:
 * Retrieve stock audit log entries with filtering and pagination.
 * Only managers and admins can view audit logs.
 * Part of CSA-214: Modify In-Stock Quantity
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Create Supabase client
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

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user's role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const role = roleError || !roleData ? "customer" : roleData.role;

    if (role !== "admin" && role !== "manager") {
      return NextResponse.json(
        { error: "Only managers and admins can view audit logs" },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const itemId =
      searchParams.get("ingredient_id") || searchParams.get("item_id");
    const userId = searchParams.get("user_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const reason = searchParams.get("reason");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Validate pagination
    if (page < 1) {
      return NextResponse.json({ error: "Page must be >= 1" }, { status: 400 });
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 100" },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;

    // Build query (bean_stock_audit_log = ingredient stock audit)
    let query = supabase
      .from("bean_stock_audit_log")
      .select(
        `
        id,
        bean_id,
        user_id,
        old_quantity,
        new_quantity,
        reason,
        note,
        created_at,
        beans:bean_id (
          id,
          name
        ),
        profiles:user_id (
          id,
          full_name,
          email
        )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters (ingredient_id = bean_id)
    if (itemId) {
      query = query.eq("bean_id", itemId);
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    if (reason) {
      query = query.eq("reason", reason);
    }

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching audit log:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch audit log" },
        { status: 500 }
      );
    }

    // Format response
    const formattedData = data?.map((entry: any) => ({
      id: entry.id,
      ingredient_id: entry.bean_id,
      ingredient_name: entry.beans?.name || null,
      user_id: entry.user_id,
      user_name: entry.profiles?.full_name || entry.profiles?.email || null,
      old_quantity: Number(entry.old_quantity),
      new_quantity: Number(entry.new_quantity),
      reason: entry.reason,
      note: entry.note,
      created_at: entry.created_at,
    }));

    return NextResponse.json(
      {
        data: formattedData || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Unexpected error fetching audit log:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
