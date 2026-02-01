/**
 * GET /api/menu/items
 * POST /api/menu/items
 *
 * PURPOSE:
 * Get all menu items or create a new menu item.
 * Only managers and admins can create items.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
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

    const { data: items, error } = await supabase
      .from("items")
      .select("*, category:categories(id, name, slug)")
      .order("name");

    if (error) {
      console.error("Error fetching items:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch items" },
        { status: 500 }
      );
    }

    // Check ingredient stock: mark items as out_of_stock if any linked ingredient has insufficient stock
    const { data: recipeData } = await supabase
      .from("item_ingredients")
      .select("item_id, quantity_needed, beans(stock_quantity)");

    const outOfStockItemIds = new Set<string>();
    for (const row of (recipeData || []) as any[]) {
      const stock = row.beans?.stock_quantity ?? 0;
      if (stock < row.quantity_needed) {
        outOfStockItemIds.add(row.item_id);
      }
    }

    const enrichedItems = (items || []).map((item: any) => ({
      ...item,
      out_of_stock_ingredients: outOfStockItemIds.has(item.id),
    }));

    return NextResponse.json({ items: enrichedItems }, { status: 200 });
  } catch (error: any) {
    console.error("Unexpected error fetching items:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
        { error: "Only managers and admins can create menu items" },
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
    } = body;

    // Validate required fields
    if (!category_id || !name || !slug || price_cents === undefined) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: category_id, name, slug, price_cents",
        },
        { status: 400 }
      );
    }

    // Validate price
    if (price_cents < 0) {
      return NextResponse.json(
        { error: "Price must be non-negative" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("items")
      .insert({
        category_id,
        name,
        slug,
        description: description || null,
        price_cents,
        image_url: image_url || null,
        allergens: allergens || [],
        vegetarian: vegetarian || false,
        vegan: vegan || false,
        active: active !== undefined ? active : true,
        modifiers: modifiers || [],
        stock_quantity: stock_quantity !== undefined ? stock_quantity : null,
        track_inventory:
          track_inventory !== undefined ? track_inventory : false,
        low_stock_threshold:
          low_stock_threshold !== undefined ? low_stock_threshold : null,
        reorder_quantity:
          reorder_quantity !== undefined ? reorder_quantity : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating item:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create item" },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error: any) {
    console.error("Unexpected error creating item:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
