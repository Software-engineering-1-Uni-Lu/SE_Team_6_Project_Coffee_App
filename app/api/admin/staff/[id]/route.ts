/**
 * GET/PATCH /api/admin/staff/[id]
 *
 * PURPOSE:
 * Get and update staff member details.
 *
 * USER STORIES SATISFIED:
 * - CSA-133: View & edit staff account details
 *
 * SECURITY:
 * - Requires manager or admin role
 * - Uses can_manage_user() to verify permission for target user
 * - Prevents self-modification
 * - Only admins can change roles
 * - Validates email uniqueness
 * - Logs all changes to audit_log
 *
 * GET RESPONSE FORMAT:
 * {
 *   staff: {
 *     id, email, full_name, phone, role, blocked, created_at
 *   }
 * }
 *
 * PATCH REQUEST FORMAT:
 * {
 *   email?: string,
 *   full_name?: string,
 *   phone?: string,
 *   role?: "staff" | "manager"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const staffId = params.id;

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
        { error: "You don't have permission to view this user" },
        { status: 403 }
      );
    }

    // Fetch staff details with role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone, blocked, created_at")
      .eq("id", staffId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    const { data: staffRoleData, error: staffRoleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", staffId)
      .single();

    if (staffRoleError || !staffRoleData) {
      return NextResponse.json(
        { error: "Staff member role not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      staff: {
        ...profile,
        role: staffRoleData.role,
      },
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Get staff details error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const staffId = params.id;

    // Prevent self-modification
    if (user.id === staffId) {
      return NextResponse.json(
        { error: "You cannot modify your own account through this endpoint" },
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
        { error: "You don't have permission to modify this user" },
        { status: 403 }
      );
    }

    // Get target user's current role
    const { data: targetRoleData, error: targetRoleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", staffId)
      .single();

    if (targetRoleError || !targetRoleData) {
      return NextResponse.json(
        { error: "Target user role not found" },
        { status: 404 }
      );
    }

    const targetRole = targetRoleData.role;

    // Validate and apply updates
    const profileUpdates: {
      email?: string;
      full_name?: string;
      phone?: string;
    } = {};

    // Email update
    if (body.email && body.email !== "") {
      // Check if email already exists
      const { data: existingUser, error: emailCheckError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", body.email)
        .neq("id", staffId)
        .maybeSingle();

      if (emailCheckError) {
        console.error("Email check error:", emailCheckError);
        return NextResponse.json(
          { error: "Failed to validate email" },
          { status: 500 }
        );
      }

      if (existingUser) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        );
      }

      profileUpdates.email = body.email;
    }

    // Full name update
    if (body.full_name !== undefined) {
      profileUpdates.full_name = body.full_name;
    }

    // Phone update
    if (body.phone !== undefined) {
      profileUpdates.phone = body.phone;
    }

    // Role update (only admins, and only specific transitions)
    if (body.role && body.role !== targetRole) {
      // Only admins can change roles
      if (currentUserRole !== "admin") {
        return NextResponse.json(
          { error: "Only admins can change user roles" },
          { status: 403 }
        );
      }

      // Validate role value
      if (!["staff", "manager"].includes(body.role)) {
        return NextResponse.json(
          { error: "Invalid role. Must be 'staff' or 'manager'" },
          { status: 400 }
        );
      }

      // Validate role transition
      // Staff can become manager, manager can become staff
      // Admins cannot be demoted via this endpoint (security)
      if (targetRole === "admin") {
        return NextResponse.json(
          { error: "Cannot modify admin roles through this endpoint" },
          { status: 403 }
        );
      }

      // Update role in user_roles table
      const { error: roleUpdateError } = await supabase
        .from("user_roles")
        .update({ role: body.role })
        .eq("user_id", staffId);

      if (roleUpdateError) {
        console.error("Role update error:", roleUpdateError);
        return NextResponse.json(
          { error: "Failed to update role" },
          { status: 500 }
        );
      }

      // Log role change
      await supabase.from("audit_log").insert({
        entity_type: "user",
        entity_id: staffId,
        action: "role_change",
        actor_id: user.id,
        actor_email: user.email,
        changes: {
          before: { role: targetRole },
          after: { role: body.role },
        },
      });
    }

    // Update profile if there are changes
    if (Object.keys(profileUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", staffId);

      if (updateError) {
        console.error("Profile update error:", updateError);
        return NextResponse.json(
          { error: "Failed to update profile" },
          { status: 500 }
        );
      }

      // Log profile update
      await supabase.from("audit_log").insert({
        entity_type: "user",
        entity_id: staffId,
        action: "profile_update",
        actor_id: user.id,
        actor_email: user.email,
        changes: {
          fields: Object.keys(profileUpdates),
        },
      });
    }

    // Fetch updated staff details
    const { data: updatedProfile } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone, blocked, created_at")
      .eq("id", staffId)
      .single();

    const { data: updatedRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", staffId)
      .single();

    return NextResponse.json({
      message: "Staff updated successfully",
      staff: {
        ...updatedProfile,
        role: updatedRole?.role,
      },
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Update staff error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
