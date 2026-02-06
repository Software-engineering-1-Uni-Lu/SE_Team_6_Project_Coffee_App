/**
 * PATCH /api/promotions/[id]
 * DELETE /api/promotions/[id]
 *
 * Update or delete a promotion.
 * Only managers and admins can modify promotions.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

async function requireManagerOrAdmin() {
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
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
      supabase: null,
    };
  }

  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const role = roleError || !roleData ? "customer" : roleData.role;

  if (role !== "admin" && role !== "manager") {
    return {
      error: NextResponse.json(
        { error: "Only managers and admins can manage promotions" },
        { status: 403 }
      ),
      supabase: null,
    };
  }

  return { error: null, supabase };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireManagerOrAdmin();
  if (error) return error;
  if (!supabase)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "Promotion ID required" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const {
      name,
      description,
      discount_type,
      value_cents,
      percent,
      active,
      start_at,
      end_at,
      category_id,
      item_id,
    } = body;

    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }
    if (description !== undefined)
      updates.description = description === "" ? null : description;
    if (discount_type !== undefined) {
      if (!["percent", "amount"].includes(discount_type)) {
        return NextResponse.json(
          { error: "discount_type must be 'percent' or 'amount'" },
          { status: 400 }
        );
      }
      updates.discount_type = discount_type;
    }
    if (value_cents !== undefined)
      updates.value_cents = Math.max(0, Number(value_cents) || 0);
    if (percent !== undefined)
      updates.percent = Math.max(0, Math.min(100, Number(percent) ?? 0));
    if (active !== undefined) updates.active = active;
    if (start_at !== undefined)
      updates.start_at = start_at === "" ? null : start_at;
    if (end_at !== undefined) updates.end_at = end_at === "" ? null : end_at;

    if (category_id !== undefined && item_id !== undefined) {
      const hasCategory = category_id != null && category_id !== "";
      const hasItem = item_id != null && item_id !== "";
      if (hasCategory && hasItem) {
        return NextResponse.json(
          { error: "Choose only one target: Global, Category, or Single item" },
          { status: 400 }
        );
      }
      updates.category_id = hasCategory ? category_id : null;
      updates.item_id = hasItem ? item_id : null;
    }

    const { data, error: updateError } = await supabase
      .from("promotions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating promotion:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to update promotion" },
        { status: 500 }
      );
    }

    return NextResponse.json({ promotion: data }, { status: 200 });
  } catch (err: unknown) {
    console.error("Unexpected error updating promotion:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireManagerOrAdmin();
  if (error) return error;
  if (!supabase)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "Promotion ID required" },
      { status: 400 }
    );
  }

  try {
    const { error: deleteError } = await supabase
      .from("promotions")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting promotion:", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete promotion" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Promotion deleted successfully" },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("Unexpected error deleting promotion:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
