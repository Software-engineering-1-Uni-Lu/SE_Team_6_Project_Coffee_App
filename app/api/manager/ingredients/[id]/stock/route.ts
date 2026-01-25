/**
 * PATCH /api/manager/ingredients/[id]/stock
 *
 * PURPOSE:
 * Update stock quantity for an item (ingredient) with audit trail logging.
 * Only managers and admins can modify stock.
 * Part of CSA-214: Modify In-Stock Quantity
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const STOCK_ADJUSTMENT_REASONS = [
  "Restock",
  "Waste",
  "Correction",
  "Manual Adjustment",
] as const;

type StockAdjustmentReason = (typeof STOCK_ADJUSTMENT_REASONS)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();

    // Create Supabase client with proper cookie handling for API routes
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

    // Get user's role from database
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const role = roleError || !roleData ? "customer" : roleData.role;

    if (role !== "admin" && role !== "manager") {
      return NextResponse.json(
        { error: "Only managers and admins can modify stock" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { new_quantity, reason, note } = body;

    // Validate required fields
    if (new_quantity === undefined || new_quantity === null) {
      return NextResponse.json(
        { error: "new_quantity is required" },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: "reason is required" },
        { status: 400 }
      );
    }

    // Validate reason is one of allowed values
    if (!STOCK_ADJUSTMENT_REASONS.includes(reason as StockAdjustmentReason)) {
      return NextResponse.json(
        {
          error: `Invalid reason. Must be one of: ${STOCK_ADJUSTMENT_REASONS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate quantity
    const quantity = Number(new_quantity);
    if (isNaN(quantity) || quantity < 0) {
      return NextResponse.json(
        { error: "new_quantity must be a non-negative number" },
        { status: 400 }
      );
    }

    // Validate note length if provided
    if (note && note.length > 500) {
      return NextResponse.json(
        { error: "note must be 500 characters or less" },
        { status: 400 }
      );
    }

    // Get current item to retrieve old stock quantity
    const { data: currentItem, error: itemError } = await supabase
      .from("items")
      .select("id, stock_quantity, name")
      .eq("id", id)
      .single();

    if (itemError || !currentItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const oldQuantity = currentItem.stock_quantity || 0;

    // Update stock quantity in a transaction
    // First, update the item
    const { data: updatedItem, error: updateError } = await supabase
      .from("items")
      .update({
        stock_quantity: quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating item stock:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to update stock" },
        { status: 500 }
      );
    }

    // Create audit log entry
    const { data: auditLog, error: auditError } = await supabase
      .from("stock_audit_log")
      .insert({
        item_id: id,
        user_id: user.id,
        old_quantity: oldQuantity,
        new_quantity: quantity,
        reason: reason as StockAdjustmentReason,
        note: note || null,
      })
      .select()
      .single();

    if (auditError) {
      console.error("Error creating audit log:", auditError);
      // Note: We don't rollback the stock update here, but we log the error
      // In production, you might want to use a database transaction to ensure both succeed
      return NextResponse.json(
        {
          success: true,
          updated_ingredient: updatedItem,
          warning: "Stock updated but audit log creation failed",
          error: auditError.message,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        updated_ingredient: updatedItem,
        audit_log_id: auditLog.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Unexpected error updating stock:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
