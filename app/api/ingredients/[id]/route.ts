/**
 * PATCH /api/ingredients/[id]
 * DELETE /api/ingredients/[id]
 *
 * PURPOSE:
 * Update or delete an ingredient.
 * Only managers and admins can modify ingredients.
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

async function authorizeManager(
  supabase: ReturnType<typeof createServerClient>
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
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
        { error: "Only managers and admins can modify ingredients" },
        { status: 403 }
      ),
    };
  }

  return { user };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabase(cookieStore);

    const auth = await authorizeManager(supabase);
    if ("error" in auth && auth.error) return auth.error;

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

    if (price_delta_cents !== undefined && price_delta_cents < 0) {
      return NextResponse.json(
        { error: "Price delta must be non-negative" },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price_delta_cents !== undefined)
      updates.price_delta_cents = price_delta_cents;
    if (stock_quantity !== undefined) updates.stock_quantity = stock_quantity;
    if (low_stock_threshold !== undefined)
      updates.low_stock_threshold = low_stock_threshold;
    if (supplier !== undefined) updates.supplier = supplier;
    if (unit !== undefined) updates.unit = unit;
    if (active !== undefined) updates.active = active;

    const { data, error } = await supabase
      .from("beans")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating ingredient:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update ingredient" },
        { status: 500 }
      );
    }

    // Sync category associations if provided
    if (category_ids !== undefined) {
      await supabase.from("bean_categories").delete().eq("bean_id", params.id);
      if (category_ids.length > 0) {
        const rows = category_ids.map((cid: string) => ({
          bean_id: params.id,
          category_id: cid,
        }));
        await supabase.from("bean_categories").insert(rows);
      }
    }

    return NextResponse.json({ ingredient: data }, { status: 200 });
  } catch (error: any) {
    console.error("Unexpected error updating ingredient:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabase(cookieStore);

    const auth = await authorizeManager(supabase);
    if ("error" in auth && auth.error) return auth.error;

    const { error } = await supabase.from("beans").delete().eq("id", params.id);

    if (error) {
      console.error("Error deleting ingredient:", error);
      return NextResponse.json(
        { error: error.message || "Failed to delete ingredient" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Ingredient deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Unexpected error deleting ingredient:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
