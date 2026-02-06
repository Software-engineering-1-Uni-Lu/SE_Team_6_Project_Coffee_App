/**
 * PATCH /api/staff/shift-notes/[id]
 *
 * PURPOSE:
 * Update or resolve a shift handover note.
 * Only staff, manager, and admin can access.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/integrations/supabase/server";
import { requireRole } from "@/src/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireRole(["staff", "manager", "admin"]);
    const supabase = await createClient();

    const body = await request.json();
    const { resolved, title, note, category, priority } = body;

    const updates: Record<string, unknown> = {};

    if (resolved !== undefined) {
      updates.resolved = resolved;
      if (resolved) {
        updates.resolved_by = user.id;
        updates.resolved_at = new Date().toISOString();
      } else {
        updates.resolved_by = null;
        updates.resolved_at = null;
      }
    }

    if (title !== undefined) updates.title = title;
    if (note !== undefined) updates.note = note;
    if (category !== undefined) updates.category = category;
    if (priority !== undefined) updates.priority = priority;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("shift_notes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating shift note:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Shift note not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message || "Failed to update shift note" },
        { status: 500 }
      );
    }

    return NextResponse.json({ note: data }, { status: 200 });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json(
        { error: error.message || "Unauthorized" },
        { status: error.status }
      );
    }
    console.error("Error updating shift note:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
