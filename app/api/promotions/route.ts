/**
 * GET /api/promotions
 * POST /api/promotions
 *
 * List all promotions or create a new promotion.
 * Only managers and admins can list or create.
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

export async function GET() {
  const { error, supabase } = await requireManagerOrAdmin();
  if (error) return error;
  if (!supabase)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data, error: fetchError } = await supabase
      .from("promotions")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching promotions:", fetchError);
      return NextResponse.json(
        { error: fetchError.message || "Failed to fetch promotions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ promotions: data || [] }, { status: 200 });
  } catch (err: unknown) {
    console.error("Unexpected error fetching promotions:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { error, supabase } = await requireManagerOrAdmin();
  if (error) return error;
  if (!supabase)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!discount_type || !["percent", "amount"].includes(discount_type)) {
      return NextResponse.json(
        { error: "discount_type must be 'percent' or 'amount'" },
        { status: 400 }
      );
    }

    // Mutually exclusive: either category, or item, or both null (global)
    const hasCategory = category_id != null && category_id !== "";
    const hasItem = item_id != null && item_id !== "";
    if (hasCategory && hasItem) {
      return NextResponse.json(
        { error: "Choose only one target: Global, Category, or Single item" },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      description:
        description != null
          ? description === ""
            ? null
            : String(description).trim()
          : null,
      discount_type,
      value_cents:
        discount_type === "amount" ? Math.max(0, Number(value_cents) || 0) : 0,
      percent:
        discount_type === "percent"
          ? Math.max(0, Math.min(100, Number(percent) ?? 0))
          : 0,
      active: active !== false,
      start_at: start_at == null || start_at === "" ? null : start_at,
      end_at: end_at == null || end_at === "" ? null : end_at,
      category_id: hasCategory ? category_id : null,
      item_id: hasItem ? item_id : null,
    };

    const { data, error: insertError } = await supabase
      .from("promotions")
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      console.error("Error creating promotion:", insertError);
      return NextResponse.json(
        { error: insertError.message || "Failed to create promotion" },
        { status: 500 }
      );
    }

    return NextResponse.json({ promotion: data }, { status: 201 });
  } catch (err: unknown) {
    console.error("Unexpected error creating promotion:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
