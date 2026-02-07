/**
 * DELETE /api/admin/invites/[id]
 *
 * PURPOSE:
 * Revoke (delete) an unused invite code.
 * Used invite codes cannot be deleted to preserve audit trail.
 *
 * USER STORY SATISFIED:
 * - CSA-134: Add or remove staff accounts (manage invite codes)
 *
 * SECURITY:
 * - Requires manager or admin role
 * - Managers can only delete staff invites
 * - Admins can delete any invite
 * - Cannot delete used invite codes (preserves audit trail)
 *
 * RESPONSE FORMAT:
 * {
 *   message: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    // Check if invite exists and get its details
    const { data: invite, error: fetchError } = await supabase
      .from("staff_invite_codes")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !invite) {
      return NextResponse.json(
        { error: "Invite code not found" },
        { status: 404 }
      );
    }

    // Managers can only delete staff invites
    if (currentUserRole === "manager" && invite.role !== "staff") {
      return NextResponse.json(
        { error: "You can only delete staff invite codes" },
        { status: 403 }
      );
    }

    // Prevent deletion of used invite codes (preserve audit trail)
    if (invite.used) {
      return NextResponse.json(
        {
          error:
            "Cannot delete used invite codes. They are preserved for audit purposes.",
        },
        { status: 400 }
      );
    }

    // Delete the invite
    const { error: deleteError } = await supabase
      .from("staff_invite_codes")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Delete invite error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete invite code" },
        { status: 500 }
      );
    }

    // Log the deletion
    await supabase.from("audit_log").insert({
      entity_type: "invite_code",
      entity_id: id,
      action: "invite_revoked",
      actor_id: user.id,
      actor_email: user.email,
      changes: {
        code: invite.code,
        role: invite.role,
      },
    });

    return NextResponse.json({
      message: "Invite code revoked successfully",
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Delete invite error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
