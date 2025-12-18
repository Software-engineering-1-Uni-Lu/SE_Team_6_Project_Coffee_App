/**
 * GET /api/admin/staff
 *
 * PURPOSE:
 * List all staff members that the current user (manager/admin) can manage.
 * Implements role-based filtering:
 * - Managers see only staff
 * - Admins see staff, managers, and admins
 *
 * USER STORY SATISFIED:
 * - CSA-132: Browse staff accounts
 *
 * SECURITY:
 * - Requires manager or admin role
 * - Uses database function for permission-filtered queries
 * - Returns only staff that the current user has permission to manage
 *
 * RESPONSE FORMAT:
 * {
 *   staff: [
 *     {
 *       id: string,
 *       email: string,
 *       full_name: string | null,
 *       phone: string | null,
 *       role: "staff" | "manager" | "admin",
 *       blocked: boolean,
 *       created_at: string
 *     }
 *   ]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Force dynamic rendering since this route uses cookies() for authentication
export const dynamic = "force-dynamic";

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

    const userRole = roleError || !roleData ? "customer" : roleData.role;

    // Check if user has required role (manager or admin)
    if (userRole !== "manager" && userRole !== "admin") {
      return NextResponse.json(
        { error: "Access denied - Required role: manager or admin" },
        { status: 403 }
      );
    }

    // Fetch staff list directly to avoid issues with auth context in RPC calls.
    // Managers: only staff; Admins: staff + managers + admins.
    const allowedRoles =
      userRole === "manager" ? ["staff"] : ["staff", "manager", "admin"];

    // Step 1: get user_ids + roles that match allowedRoles
    const { data: roleRows, error: staffRoleError } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", allowedRoles);

    if (staffRoleError) {
      console.error("Failed to fetch staff roles:", staffRoleError);
      return NextResponse.json(
        { error: "Failed to fetch staff members" },
        { status: 500 }
      );
    }

    const userIds = (roleRows || []).map((r) => r.user_id);

    if (userIds.length === 0) {
      return NextResponse.json({ staff: [] });
    }

    // Step 2: fetch profiles for those users
    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone, blocked, created_at")
      .in("id", userIds);

    if (profileError) {
      console.error("Failed to fetch staff profiles:", profileError);
      return NextResponse.json(
        { error: "Failed to fetch staff members" },
        { status: 500 }
      );
    }

    // Map user_id -> role
    const roleMap = new Map<string, string>();
    roleRows?.forEach((row) => {
      roleMap.set(row.user_id, row.role);
    });

    const staffList =
      profileRows?.map((profile) => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        phone: profile.phone,
        blocked: profile.blocked,
        created_at: profile.created_at,
        role:
          (roleMap.get(profile.id) as "staff" | "manager" | "admin") ?? "staff",
      })) || [];

    // Return the filtered staff list
    return NextResponse.json({
      staff: staffList,
    });
  } catch (error) {
    // If error is a Response (from requireRole), re-throw it
    if (error instanceof Response) {
      throw error;
    }

    // Log unexpected errors
    console.error("Get staff error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
