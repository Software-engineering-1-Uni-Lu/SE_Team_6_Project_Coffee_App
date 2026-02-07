/**
 * GET/POST /api/admin/invites
 *
 * PURPOSE:
 * List and generate invite codes for staff/manager registration.
 *
 * USER STORY SATISFIED:
 * - CSA-134: Add or remove staff accounts (add = generate invite codes)
 *
 * SECURITY:
 * - Requires manager or admin role
 * - Managers can only generate staff invites
 * - Admins can generate staff and manager invites
 * - Managers only see staff invites in list
 * - Admins see all invites
 *
 * GET RESPONSE FORMAT:
 * {
 *   invites: [
 *     {
 *       id, code, role, created_by, created_at,
 *       expires_at, used, used_by, used_at, notes
 *     }
 *   ]
 * }
 *
 * POST REQUEST FORMAT:
 * {
 *   role: "staff" | "manager",
 *   prefix?: string (default: "INVITE"),
 *   expiresInDays?: number (default: 30),
 *   notes?: string
 * }
 *
 * POST RESPONSE FORMAT:
 * {
 *   message: string,
 *   inviteCode: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

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
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    // Get user's role from database
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const currentUserRole = roleError || !roleData ? "customer" : roleData.role;

    // Check if user has required role (manager or admin)
    if (currentUserRole !== "manager" && currentUserRole !== "admin") {
      return NextResponse.json(
        { error: "Access denied - Required role: manager or admin" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Extract parameters with defaults
    const { role, prefix = "INVITE", expiresInDays = 30, notes } = body;

    // Validate role
    if (!role || !["staff", "manager"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be 'staff' or 'manager'" },
        { status: 400 }
      );
    }

    // Managers can only generate staff invites
    if (currentUserRole === "manager" && role !== "staff") {
      return NextResponse.json(
        { error: "Managers can only generate staff invite codes" },
        { status: 403 }
      );
    }

    // Validate expiresInDays
    if (
      typeof expiresInDays !== "number" ||
      expiresInDays < 1 ||
      expiresInDays > 365
    ) {
      return NextResponse.json(
        { error: "expiresInDays must be a number between 1 and 365" },
        { status: 400 }
      );
    }

    // Generate invite code using database function
    const { data: inviteCode, error } = await supabase.rpc(
      "generate_invite_code",
      {
        role_input: role,
        prefix,
        expires_in_days: expiresInDays,
        notes_input: notes || null,
      }
    );

    if (error) {
      console.error("Failed to generate invite code:", error);
      return NextResponse.json(
        { error: "Failed to generate invite code" },
        { status: 500 }
      );
    }

    // Log invite creation
    await supabase.from("audit_log").insert({
      entity_type: "invite_code",
      entity_id: null,
      action: "invite_generated",
      actor_id: user.id,
      actor_email: user.email,
      changes: {
        code: inviteCode,
        role,
        expires_in_days: expiresInDays,
      },
    });

    return NextResponse.json({
      message: "Invite code generated successfully",
      inviteCode,
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Generate invite error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    // Get user's role from database
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const currentUserRole = roleError || !roleData ? "customer" : roleData.role;

    // Check if user has required role (manager or admin)
    if (currentUserRole !== "manager" && currentUserRole !== "admin") {
      return NextResponse.json(
        { error: "Access denied - Required role: manager or admin" },
        { status: 403 }
      );
    }

    // Build query based on role
    let query = supabase
      .from("staff_invite_codes")
      .select("*")
      .order("created_at", { ascending: false });

    // Managers only see staff invites
    if (currentUserRole === "manager") {
      query = query.eq("role", "staff");
    }

    const { data: invites, error } = await query;

    if (error) {
      console.error("Failed to fetch invites:", error);
      return NextResponse.json(
        { error: "Failed to fetch invite codes" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      invites: invites || [],
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Get invites error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
