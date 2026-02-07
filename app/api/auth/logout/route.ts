/**
 * POST /api/auth/logout
 *
 * PURPOSE:
 * End user session and clear authentication cookies.
 *
 * USER STORY SATISFIED:
 * - CSA-29: Log out of account
 *
 * SECURITY:
 * - Invalidates session server-side
 * - Clears httpOnly cookies
 * - Supports both local and global logout
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Create response to attach cookie removal to
    const response = NextResponse.json({ message: "Logout successful" });
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

    // Sign out from Supabase (clears session and cookies)
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return response with cookie removal headers
    return NextResponse.json(
      { message: "Logout successful" },
      {
        headers: response.headers,
      }
    );
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
