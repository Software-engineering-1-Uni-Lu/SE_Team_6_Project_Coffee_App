/**
 * POST /api/auth/login
 *
 * PURPOSE:
 * Authenticate user with email and password, create session.
 *
 * USER STORIES SATISFIED:
 * - CSA-24: Log in to account
 * - CSA-57: Blocked user handling (checks blocked status after auth)
 *
 * SECURITY:
 * - Uses Supabase Auth for credential verification
 * - Checks if user is blocked before allowing access
 * - Sets httpOnly cookie for session management
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isBlocked } from "@/src/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Create response to attach cookies to
    const response = NextResponse.json({ message: "Login successful" });
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
            // Set cookie in both cookieStore and response
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

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!data.user || !data.session) {
      return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }

    // Check if user is blocked (CSA-57)
    if (isBlocked(data.user)) {
      // Log them out immediately
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Account is blocked", code: "BLOCKED_USER" },
        { status: 403 }
      );
    }

    // Check if MFA is required (AAL2 needed for staff/admin with enrolled factors)
    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (
      aalData &&
      aalData.nextLevel === "aal2" &&
      aalData.currentLevel === "aal1"
    ) {
      return NextResponse.json(
        {
          message: "MFA required",
          mfa_required: true,
          user: {
            id: data.user.id,
            email: data.user.email,
          },
        },
        {
          status: 200,
          headers: response.headers,
        }
      );
    }

    // Create success response
    const successData = {
      message: "Login successful",
      user: {
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata,
      },
    };

    // CRITICAL: Let Supabase set the cookie through its handlers
    // Call getUser() to trigger Supabase SSR to set the session cookie
    // This ensures the cookie is set in the format Supabase expects
    await supabase.auth.getUser();

    // Return the response with updated body but preserve all cookies
    // This is the pattern that works - return response with headers
    return NextResponse.json(successData, {
      status: 200,
      headers: response.headers, // Includes all Set-Cookie headers from Supabase
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
