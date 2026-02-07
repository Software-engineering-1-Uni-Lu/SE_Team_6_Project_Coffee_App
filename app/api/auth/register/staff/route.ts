/**
 * POST /api/auth/register/staff
 *
 * PURPOSE:
 * Register staff, manager, or admin accounts using invite codes.
 * Role is determined by the invite code and assigned by database trigger.
 *
 * ARCHITECTURE (UPDATED):
 * - User provides email, password, and invite code
 * - API passes invite_code in user metadata
 * - Database trigger (handle_new_user) validates code and assigns role
 * - Trigger marks invite code as used automatically
 * - All validation happens server-side in database
 *
 * USER STORY SATISFIED:
 * - CSA-19: Staff/admin signup with invite-based registration
 *
 * SECURITY:
 * - Invite code validation happens in database trigger
 * - Role assignment controlled by database (cannot be tampered with)
 * - Single-use codes enforced by trigger
 * - Expiration check enforced by trigger
 * - User cannot choose or manipulate their role
 *
 * REGISTRATION FLOW:
 * 1. User provides email, password, and invite code
 * 2. API passes invite_code in metadata to signUp
 * 3. Supabase creates user account
 * 4. Database trigger validates invite code
 * 5. Trigger assigns role based on invite code
 * 6. Trigger marks invite code as used
 * 7. If validation fails, trigger prevents account creation
 * 8. Return success to user
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

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

    /**
     * Create user with invite_code in metadata
     *
     * The database trigger will:
     * 1. Validate the invite code (exists, not used, not expired)
     * 2. Extract the role from the invite code
     * 3. Assign the role in user_roles table
     * 4. Mark the invite code as used
     *
     * If validation fails, the trigger will PREVENT account creation
     * and raise an exception with a helpful error message.
     */
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          invite_code: inviteCode, // Database trigger will validate this
        },
      },
    });

    if (error) {
      // Check if error is from database trigger (invite code validation)
      if (error.message.includes("invite code")) {
        return NextResponse.json(
          {
            error:
              "Invalid, expired, or already used invite code. Please contact an administrator.",
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Registration successful",
        user: {
          id: data.user.id,
          email: data.user.email,
          // Role will be in user_roles table (assigned by trigger)
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
