/**
 * PATCH /api/menu/items/[id]
 * DELETE /api/menu/items/[id]
 *
 * PURPOSE:
 * Update or delete a menu item.
 * Only managers and admins can modify items.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/integrations/supabase/server";
import { getCurrentUser } from "@/src/lib/auth";
import { getUserRole } from "@/src/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const role = await getUserRole(user.id);
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
    } = body;

    // Validate price if provided
    if (price_cents !== undefined && price_cents < 0) {
      return NextResponse.json(
        { error: "Price must be non-negative" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const role = await getUserRole(user.id);
    if (role !== "admin" && role !== "manager") {
      return NextResponse.json(
        { error: "Only managers and admins can delete menu items" },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.from("items").delete().eq("id", params.id);

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
