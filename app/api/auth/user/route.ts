/**
 * GET /api/auth/user
 *
 * PURPOSE:
 * Get current authenticated user's details including role from database.
 *
 * USER STORY SATISFIED:
 * - CSA-33: View account details
 * - CSA-53: Persistent session (includes role fetching)
 *
 * ARCHITECTURE:
 * - Fetches role from user_roles table (source of truth)
 * - Used by client-side useUser() hook
 * - Includes blocked status check
 *
 * SECURITY:
 * - Returns user data only if valid session exists
 * - Uses server-side session validation with proper cookie handling
 * - Role comes from database (cannot be tampered with)
 *
 * IMPORTANT:
 * - Uses explicit cookie handling for API routes (get/set/remove)
 * - Different from Server Components which use getAll/setAll
 */

import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isBlockedFromDB } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
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
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Fetch role from database (source of truth)
    // Query directly using the authenticated Supabase client to ensure RLS policies work
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const role =
      roleError || !roleData
        ? "customer"
        : (roleData.role as "customer" | "staff" | "manager" | "admin");

    // Check blocked status from database (source of truth)
    const blocked = await isBlockedFromDB(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role, // Role from user_roles table
        isBlocked: blocked, // Blocked status from profiles table
        user_metadata: user.user_metadata,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
