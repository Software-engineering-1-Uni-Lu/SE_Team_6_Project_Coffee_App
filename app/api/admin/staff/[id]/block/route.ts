/**
 * PATCH /api/admin/staff/[id]/block
 *
 * PURPOSE:
 * Block or unblock a staff member from accessing the system.
 * Blocked users are immediately redirected to /blocked page by middleware.
 *
 * USER STORY SATISFIED:
 * - CSA-134: Add or remove staff accounts (remove = block, soft delete)
 *
 * SECURITY:
 * - Requires manager or admin role
 * - Uses can_manage_user() to verify permission
 * - Prevents self-blocking
 * - Updates profiles.blocked column (database source of truth)
 * - Logs all blocking actions to audit_log
 *
 * REQUEST FORMAT:
 * {
 *   blocked: boolean  // true to block, false to unblock
 * }
 *
 * RESPONSE FORMAT:
 * {
 *   message: string,
 *   blocked: boolean
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id: staffId } = await params;

    // Validate blocked parameter
    const { blocked } = body;
    if (typeof blocked !== "boolean") {
      return NextResponse.json(
        { error: "blocked must be a boolean value (true or false)" },
        { status: 400 }
      );
    }

    // Prevent self-blocking
    if (user.id === staffId) {
      return NextResponse.json(
        { error: "You cannot block/unblock your own account" },
        { status: 403 }
      );
    }

    // Check if current user can manage this user
    const { data: canManage, error: permError } = await supabase.rpc(
      "can_manage_user",
      {
        manager_id: user.id,
        target_user_id: staffId,
      }
    );

    if (permError || !canManage) {
      return NextResponse.json(
        { error: "You don't have permission to block/unblock this user" },
        { status: 403 }
      );
    }

    // Update blocked status in profiles table
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ blocked })
      .eq("id", staffId);

    if (updateError) {
      console.error("Block update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update blocked status" },
        { status: 500 }
      );
    }

    // Log the action to audit log
    const { error: auditError } = await supabase.from("audit_log").insert({
      entity_type: "user",
      entity_id: staffId,
      action: blocked ? "blocked" : "unblocked",
      actor_id: user.id,
      actor_email: user.email,
      changes: {
        before: { blocked: !blocked },
        after: { blocked },
      },
    });

    if (auditError) {
      console.error("Audit log error:", auditError);
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json({
      message: `User ${blocked ? "blocked" : "unblocked"} successfully`,
      blocked,
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Block/unblock error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
