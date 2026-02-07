/**
 * PATCH /api/ingredients/missing/[id]
 * DELETE /api/ingredients/missing/[id]
 *
 * PURPOSE:
 * Update or delete a missing ingredient notification.
 * Only managers and admins can perform these actions.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function createSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
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
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabase(cookieStore);

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is manager or admin
    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !userRole) {
      return NextResponse.json(
        { error: "Failed to fetch user profile" },
        { status: 500 }
      );
    }

    if (!["manager", "admin"].includes(userRole.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Parse request body
    const body = await request.json();
    const { status, note } = body;

    // Validate status if provided
    if (status && !["pending", "resolved", "ignored"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Build update object
    const updateData: {
      status?: string;
      note?: string | null;
    } = {};

    if (status) {
      updateData.status = status;
    }
    if (note !== undefined) {
      updateData.note = note || null;
    }

    // Update notification
    const { data: notification, error: updateError } = await supabase
      .from("missing_ingredient_notifications")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        beans:bean_id (id, name, stock_quantity, low_stock_threshold, unit),
        reporter:profiles!reported_by (id, full_name, email),
        resolver:profiles!resolved_by (id, full_name, email)
      `
      )
      .single();

    if (updateError) {
      console.error("Error updating notification:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to update notification" },
        { status: 500 }
      );
    }

    return NextResponse.json({ notification }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabase(cookieStore);

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is manager or admin
    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !userRole) {
      return NextResponse.json(
        { error: "Failed to fetch user profile" },
        { status: 500 }
      );
    }

    if (!["manager", "admin"].includes(userRole.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Delete notification
    const { error: deleteError } = await supabase
      .from("missing_ingredient_notifications")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting notification:", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete notification" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Notification deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
