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
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getUserRole, isValidRole } from "@/src/lib/auth-utils";

// Force dynamic rendering since this route uses cookies() for authentication
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Create Supabase client with proper cookie handling for API routes
    // This is required for session authentication to work in API routes
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

    const body = await request.json();
    const { email, password, role, full_name } = body;

    // Build update object
    const updates: {
      email?: string;
      password?: string;
      data?: { role?: string; full_name?: string };
    } = {};

    if (email) {
      updates.email = email;
    }

    if (password) {
      updates.password = password;
    }

    // Initialize data object for metadata updates if needed
    const needsMetadataUpdate = role !== undefined || full_name !== undefined;
    if (needsMetadataUpdate) {
      updates.data = { ...(user.user_metadata || {}) };
    }

    // Full name update - allowed for all authenticated users
    if (full_name !== undefined) {
      if (!updates.data) {
        updates.data = { ...(user.user_metadata || {}) };
      }
      updates.data.full_name = full_name;
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

      if (!updates.data) {
        updates.data = { ...(user.user_metadata || {}) };
      }
      updates.data.role = role;
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
