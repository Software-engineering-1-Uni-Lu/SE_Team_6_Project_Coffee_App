/**
 * GET /api/ingredients
 * POST /api/ingredients
 *
 * PURPOSE:
 * Get all ingredients or create a new ingredient.
 * Only managers and admins can create ingredients.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

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

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabase(cookieStore);

    const { data: ingredients, error } = await supabase
      .from("beans")
      .select(
        "*, bean_categories(category_id, categories:categories(id, name))"
      )
      .order("name");

    if (error) {
      console.error("Error fetching ingredients:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch ingredients" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ingredients: ingredients || [] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Unexpected error fetching ingredients:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabase(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const role = roleError || !roleData ? "customer" : roleData.role;

    if (role !== "admin" && role !== "manager") {
      return NextResponse.json(
        { error: "Only managers and admins can create ingredients" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      price_delta_cents,
      stock_quantity,
      low_stock_threshold,
      supplier,
      unit,
      active,
      category_ids,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    if (price_delta_cents !== undefined && price_delta_cents < 0) {
      return NextResponse.json(
        { error: "Price delta must be non-negative" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("beans")
      .insert({
        name,
        description: description || null,
        price_delta_cents: price_delta_cents ?? 0,
        stock_quantity: stock_quantity ?? 0,
        low_stock_threshold: low_stock_threshold ?? 5,
        supplier: supplier || null,
        unit: unit || "g",
        active: active !== undefined ? active : true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating ingredient:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create ingredient" },
        { status: 500 }
      );
    }

    // Insert category associations
    if (category_ids && category_ids.length > 0) {
      const rows = category_ids.map((cid: string) => ({
        bean_id: data.id,
        category_id: cid,
      }));
      await supabase.from("bean_categories").insert(rows);
    }

    return NextResponse.json({ ingredient: data }, { status: 201 });
  } catch (error: any) {
    console.error("Unexpected error creating ingredient:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
