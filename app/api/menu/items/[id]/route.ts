/**
 * PATCH /api/menu/items/[id]
 * DELETE /api/menu/items/[id]
 *
 * PURPOSE:
 * Update or delete a menu item.
 * Only managers and admins can modify items.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
        { error: "Only managers and admins can update menu items" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      category_id,
      name,
      slug,
      description,
      price_cents,
      image_url,
      allergens,
      vegetarian,
      vegan,
      active,
      modifiers,
      stock_quantity,
      track_inventory,
      low_stock_threshold,
      reorder_quantity,
      sold_out,
    } = body;

    // Validate price if provided
    if (price_cents !== undefined && price_cents < 0) {
      return NextResponse.json(
        { error: "Price must be non-negative" },
        { status: 400 }
      );
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (category_id !== undefined) updates.category_id = category_id;
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug;
    if (description !== undefined) updates.description = description;
    if (price_cents !== undefined) updates.price_cents = price_cents;
    if (image_url !== undefined) updates.image_url = image_url;
    if (allergens !== undefined) updates.allergens = allergens;
    if (vegetarian !== undefined) updates.vegetarian = vegetarian;
    if (vegan !== undefined) updates.vegan = vegan;
    if (active !== undefined) updates.active = active;
    if (modifiers !== undefined) updates.modifiers = modifiers;
    if (stock_quantity !== undefined) updates.stock_quantity = stock_quantity;
    if (track_inventory !== undefined)
      updates.track_inventory = track_inventory;
    if (low_stock_threshold !== undefined)
      updates.low_stock_threshold = low_stock_threshold;
    if (reorder_quantity !== undefined)
      updates.reorder_quantity = reorder_quantity;
    if (sold_out !== undefined) updates.sold_out = sold_out;

    const { data, error } = await supabase
      .from("items")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating item:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update item" },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: data }, { status: 200 });
  } catch (error: any) {
    console.error("Unexpected error updating item:", error);
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
        { error: "Only managers and admins can delete menu items" },
        { status: 403 }
      );
    }

    // Soft delete: set deleted_at instead of removing the row
    const { error } = await supabase
      .from("items")
      .update({ deleted_at: new Date().toISOString(), active: false })
      .eq("id", params.id);

    if (error) {
      console.error("Error deleting item:", error);
      return NextResponse.json(
        { error: error.message || "Failed to delete item" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Item deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Unexpected error deleting item:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
