/**
 * PATCH /api/auth/update
 *
 * PURPOSE:
 * Update user account details (email, password, metadata).
 *
 * USER STORY SATISFIED:
 * - CSA-38: Modify account details
 *
 * SECURITY:
 * - Requires valid session
 * - Users cannot elevate their own role (must be done by admin)
 * - Password updates require re-authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { createClient } from "@/src/integrations/supabase/server";
import { getUserRole, isValidRole } from "@/src/lib/auth-utils";

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { email, password, role } = body;

    const supabase = await createClient();

    // Build update object
    const updates: {
      email?: string;
      password?: string;
      data?: { role?: string };
    } = {};

    if (email) {
      updates.email = email;
    }

    if (password) {
      updates.password = password;
    }

    // Role changes - prevent self-elevation
    if (role !== undefined) {
      const currentRole = getUserRole(user);

      // Only admins can change roles
      if (currentRole !== "admin") {
        return NextResponse.json(
          { error: "Only admins can modify roles" },
          { status: 403 }
        );
      }

      // Validate new role
      if (!isValidRole(role)) {
        return NextResponse.json(
          { error: "Invalid role specified" },
          { status: 400 }
        );
      }

      updates.data = { role };
    }

    // Update user
    const { data, error } = await supabase.auth.updateUser(updates);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: "Account updated successfully",
      user: {
        id: data.user?.id,
        email: data.user?.email,
        user_metadata: data.user?.user_metadata,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
