/**
 * POST /api/auth/register
 *
 * PURPOSE:
 * Register a new CUSTOMER account with email and password.
 * This is the public registration portal for customers only.
 *
 * USER STORY SATISFIED:
 * - CSA-13: Register for an account (customer registration)
 *
 * SECURITY (UPDATED):
 * - Uses Supabase Auth for secure password hashing
 * - Role is FORCED to "customer" (server-controlled)
 * - IGNORES any role provided by client
 * - Staff/manager/admin registration uses separate endpoint with invite codes
 *
 * IMPORTANT:
 * This endpoint is for CUSTOMERS ONLY. Any role provided in the request
 * body is ignored. For staff/manager/admin registration, use:
 * POST /api/auth/register/staff (requires invite code)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // Validate input
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
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

    // Create user with Supabase Auth
    // Database trigger will automatically assign "customer" role
    // We also store the name in user_metadata for easy access
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name.trim(),
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

    // Update the profile with the full name
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: name.trim() })
      .eq("id", data.user.id);

    if (profileError) {
      console.error("Failed to update profile name:", profileError);
      // Don't fail the registration if profile update fails
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
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
