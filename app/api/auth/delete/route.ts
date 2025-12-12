/**
 * DELETE /api/auth/delete
 *
 * PURPOSE:
 * Permanently delete user account and all associated data.
 *
 * USER STORY SATISFIED:
 * - CSA-43: Delete account
 *
 * SECURITY:
 * - Requires valid session
 * - Permanently deletes user from Supabase Auth
 * - This operation cannot be undone
 * - Cascade deletes handled by database RLS policies
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Need to use admin client to delete user
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Delete user (cascade deletes handled by RLS)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
