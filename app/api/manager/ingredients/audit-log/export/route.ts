/**
 * GET /api/manager/ingredients/audit-log/export
 *
 * PURPOSE:
 * Export stock audit log entries to CSV file.
 * Only managers and admins can export audit logs.
 * Part of CSA-214: Modify In-Stock Quantity
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function escapeCSVField(field: any): string {
  if (field === null || field === undefined) {
    return "";
  }
  const str = String(field);
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCSV(data: any[]): string {
  const headers = [
    "Date/Time",
    "Ingredient ID",
    "Ingredient Name",
    "User ID",
    "User Name",
    "Old Quantity",
    "New Quantity",
    "Reason",
    "Note",
  ];

  const rows = data.map((entry) => [
    entry.created_at,
    entry.ingredient_id,
    entry.ingredient_name || "",
    entry.user_id,
    entry.user_name || "",
    entry.old_quantity,
    entry.new_quantity,
    entry.reason,
    entry.note || "",
  ]);

  const csvRows = [
    headers.map(escapeCSVField).join(","),
    ...rows.map((row) => row.map(escapeCSVField).join(",")),
  ];

  return csvRows.join("\n");
}

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
        { error: "Only managers and admins can export audit logs" },
        { status: 403 }
      );
    }

    // Get query parameters (same filters as GET endpoint)
    const { searchParams } = new URL(request.url);
    const itemId =
      searchParams.get("ingredient_id") || searchParams.get("item_id");
    const userId = searchParams.get("user_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const reason = searchParams.get("reason");

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
      `
      )
      .order("created_at", { ascending: false });

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
    const { data, error } = await query;

    if (error) {
      console.error("Error fetching audit log for export:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch audit log" },
        { status: 500 }
      );
    }

    // Format data
    const formattedData =
      data?.map((entry: any) => ({
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
      })) || [];

    // Generate CSV
    const csvContent = generateCSV(formattedData);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `stock_audit_log_${timestamp}.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Unexpected error exporting audit log:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
