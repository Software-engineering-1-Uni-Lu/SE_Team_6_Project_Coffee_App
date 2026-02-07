/**
 * GET /api/ingredients/missing
 * POST /api/ingredients/missing
 *
 * PURPOSE:
 * Get missing ingredient notifications or report a new missing ingredient.
 * Staff can view and report, managers can manage.
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

export async function GET(request: NextRequest) {
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

    // Check if user is staff or above
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

    if (!["staff", "manager", "admin"].includes(userRole.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    // Fetch missing ingredient notifications with related data
    let query = supabase
      .from("missing_ingredient_notifications")
      .select(
        `
        *,
        beans:bean_id (id, name, stock_quantity, low_stock_threshold, unit),
        reporter:profiles!reported_by (id, full_name, email),
        resolver:profiles!resolved_by (id, full_name, email)
      `
      )
      .order("created_at", { ascending: false });

    // Filter by status if specified
    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error("Error fetching missing ingredient notifications:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch notifications" },
        { status: 500 }
      );
    }

    return NextResponse.json({ notifications }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Check if user is staff or above
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

    if (!["staff", "manager", "admin"].includes(userRole.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { bean_id, note } = body;

    // Validate required fields
    if (!bean_id) {
      return NextResponse.json(
        { error: "Bean ID is required" },
        { status: 400 }
      );
    }

    // Check if ingredient exists
    const { data: bean, error: beanError } = await supabase
      .from("beans")
      .select("id, name")
      .eq("id", bean_id)
      .single();

    if (beanError || !bean) {
      return NextResponse.json(
        { error: "Ingredient not found" },
        { status: 404 }
      );
    }

    // Check if there's already a pending notification for this ingredient
    const { data: existingNotification } = await supabase
      .from("missing_ingredient_notifications")
      .select("id")
      .eq("bean_id", bean_id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingNotification) {
      return NextResponse.json(
        { error: "A pending notification already exists for this ingredient" },
        { status: 409 }
      );
    }

    // Create notification
    const { data: notification, error: insertError } = await supabase
      .from("missing_ingredient_notifications")
      .insert({
        bean_id,
        reported_by: user.id,
        note: note || null,
        status: "pending",
      })
      .select(
        `
        *,
        beans:bean_id (id, name, stock_quantity, low_stock_threshold, unit),
        reporter:profiles!reported_by (id, full_name, email)
      `
      )
      .single();

    if (insertError) {
      console.error("Error creating notification:", insertError);
      return NextResponse.json(
        { error: insertError.message || "Failed to create notification" },
        { status: 500 }
      );
    }

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
