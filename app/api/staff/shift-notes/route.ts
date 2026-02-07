/**
 * GET /api/staff/shift-notes
 * POST /api/staff/shift-notes
 *
 * PURPOSE:
 * List and create shift handover notes for staff.
 * Only staff, manager, and admin can access.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/integrations/supabase/server";
import { requireRole } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    console.log(
      "[API GET] Cookies:",
      request.cookies.getAll().map((c) => c.name)
    );
    await requireRole(["staff", "manager", "admin"]);
    const supabase = await createClient();

    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    const category = url.searchParams.get("category");
    const priority = url.searchParams.get("priority");
    const resolved = url.searchParams.get("resolved");

    let query = supabase
      .from("shift_notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (date) {
      query = query.eq("shift_date", date);
    }
    if (category) {
      query = query.eq("category", category);
    }
    if (priority) {
      query = query.eq("priority", priority);
    }
    if (resolved !== null && resolved !== undefined && resolved !== "") {
      query = query.eq("resolved", resolved === "true");
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching shift notes:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch shift notes" },
        { status: 500 }
      );
    }

    return NextResponse.json({ notes: data }, { status: 200 });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json(
        { error: error.message || "Unauthorized" },
        { status: error.status }
      );
    }
    console.error("Error fetching shift notes:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log(
      "[API POST] Cookies:",
      request.cookies.getAll().map((c) => c.name)
    );
    const user = await requireRole(["staff", "manager", "admin"]);
    const supabase = await createClient();

    const body = await request.json();
    const { shift_date, shift_type, category, priority, title, note } = body;

    // Validate required fields
    if (!shift_type || !category || !title || !note) {
      return NextResponse.json(
        {
          error: "Missing required fields: shift_type, category, title, note",
        },
        { status: 400 }
      );
    }

    const validShiftTypes = ["morning", "afternoon", "evening", "night"];
    if (!validShiftTypes.includes(shift_type)) {
      return NextResponse.json(
        {
          error: `Invalid shift_type. Must be one of: ${validShiftTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const validCategories = [
      "prep_status",
      "inventory",
      "equipment",
      "customers",
      "general",
      "urgent",
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        {
          error: `Invalid category. Must be one of: ${validCategories.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const validPriorities = ["low", "normal", "high", "urgent"];
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        {
          error: `Invalid priority. Must be one of: ${validPriorities.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("shift_notes")
      .insert({
        shift_date: shift_date || new Date().toISOString().split("T")[0],
        shift_type,
        created_by: user.id,
        category,
        priority: priority || "normal",
        title,
        note,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating shift note:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create shift note" },
        { status: 500 }
      );
    }

    return NextResponse.json({ note: data }, { status: 201 });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json(
        { error: error.message || "Unauthorized" },
        { status: error.status }
      );
    }
    console.error("Error creating shift note:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
