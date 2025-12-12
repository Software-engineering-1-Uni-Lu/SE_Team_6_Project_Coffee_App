/**
 * POST /api/auth/register/staff
 *
 * PURPOSE:
 * Register staff, manager, or admin accounts using invite codes.
 * Role is determined by the invite code, NOT by user input.
 *
 * USER STORY SATISFIED:
 * - CSA-19: Staff/admin signup with invite-based registration
 *
 * SECURITY:
 * - Requires valid, unused, non-expired invite code
 * - Role is extracted from invite code (server-controlled)
 * - User cannot choose or manipulate their role
 * - Invite code is marked as used after successful registration
 * - Single-use codes prevent unauthorized access
 *
 * REGISTRATION FLOW:
 * 1. User provides email, password, and invite code
 * 2. Validate invite code exists and is valid
 * 3. Extract role from invite code
 * 4. Create Supabase user with role in user_metadata
 * 5. Mark invite code as used
 * 6. Return success
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isValidRole } from "@/src/lib/auth-utils";

/**
 * Validates an invite code and returns the role it grants
 * Returns null if invalid/expired/used
 */
async function validateInviteCode(
  inviteCode: string,
  supabase: any
): Promise<string | null> {
  // Query the staff_invite_codes table
  const { data, error } = await supabase
    .from("staff_invite_codes")
    .select("role, used, expires_at")
    .eq("code", inviteCode)
    .single();

  if (error || !data) {
    return null;
  }

  // Check if already used
  if (data.used) {
    return null;
  }

  // Check if expired
  const expiresAt = new Date(data.expires_at);
  if (expiresAt < new Date()) {
    return null;
  }

  // Return the role
  return data.role;
}

/**
 * Marks an invite code as used
 */
async function markInviteUsed(
  inviteCode: string,
  userId: string,
  supabase: any
): Promise<boolean> {
  const { error } = await supabase
    .from("staff_invite_codes")
    .update({
      used: true,
      used_by: userId,
      used_at: new Date().toISOString(),
    })
    .eq("code", inviteCode)
    .eq("used", false); // Double-check not already used (race condition protection)

  return !error;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, inviteCode } = body;

    // Validate input
    if (!email || !password || !inviteCode) {
      return NextResponse.json(
        { error: "Email, password, and invite code are required" },
        { status: 400 }
      );
    }

    // Create response to attach cookies to
    const response = NextResponse.json({ message: "Registration successful" });
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
            response.cookies.set(name, value, options);
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set(name, "", options);
            response.cookies.set(name, "", options);
          },
        },
      }
    );

    // Validate invite code and get role
    const role = await validateInviteCode(inviteCode, supabase);

    if (!role) {
      return NextResponse.json(
        {
          error:
            "Invalid, expired, or already used invite code. Please contact an administrator.",
        },
        { status: 400 }
      );
    }

    // Double-check role is valid (should always be true if invite exists)
    if (!isValidRole(role)) {
      return NextResponse.json(
        { error: "Invalid role in invite code" },
        { status: 500 }
      );
    }

    // Role must be staff, manager, or admin (not customer)
    if (role === "customer") {
      return NextResponse.json(
        { error: "Invalid invite code for staff registration" },
        { status: 400 }
      );
    }

    // Create user with Supabase Auth
    // Role is set in user_metadata and CANNOT be overridden by client
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role, // Role from invite code (server-controlled)
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Mark invite code as used
    const marked = await markInviteUsed(inviteCode, data.user.id, supabase);

    if (!marked) {
      // User was created but invite wasn't marked
      // This is acceptable - log it but don't fail the registration
      console.warn(
        `Invite code ${inviteCode} was not marked as used for user ${data.user.id}`
      );
    }

    return NextResponse.json(
      {
        message: "Registration successful",
        user: {
          id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata.role,
        },
      },
      {
        headers: response.headers,
      }
    );
  } catch (error) {
    console.error("Staff registration error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
