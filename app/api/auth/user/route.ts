/**
 * GET /api/auth/user
 *
 * PURPOSE:
 * Get current authenticated user's details.
 *
 * USER STORY SATISFIED:
 * - CSA-33: View account details
 *
 * SECURITY:
 * - Returns user data only if valid session exists
 * - Uses server-side session validation
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
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
