/**
 * POST /api/auth/mfa/verify
 *
 * PURPOSE:
 * Verify a TOTP code for MFA challenge or enrollment verification.
 * Uses Supabase Auth's built-in MFA challenge and verify flow.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/integrations/supabase/server";
import { getCurrentUser } from "@/src/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { factorId, code } = body;

    if (!factorId || !code) {
      return NextResponse.json(
        { error: "factorId and code are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Create a challenge
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError) {
      console.error("MFA challenge error:", challengeError);
      return NextResponse.json(
        { error: challengeError.message || "Failed to create MFA challenge" },
        { status: 500 }
      );
    }

    // Verify the code
    const { data: verifyData, error: verifyError } =
      await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

    if (verifyError) {
      console.error("MFA verify error:", verifyError);
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "MFA verification successful", session: verifyData },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("MFA verify error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
