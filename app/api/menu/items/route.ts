/**
 * GET /api/menu/items
 * POST /api/menu/items
 *
 * PURPOSE:
 * Get all menu items or create a new menu item.
 * Only managers and admins can create items.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/integrations/supabase/server";
import { getCurrentUser } from "@/src/lib/auth";
import { getUserRole } from "@/src/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    return NextResponse.json({ items: items || [] }, { status: 200 });
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const role = await getUserRole(user.id);
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

    const supabase = await createClient();

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
