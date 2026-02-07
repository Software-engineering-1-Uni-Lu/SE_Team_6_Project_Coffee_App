/**
 * POST /api/auth/mfa/enroll
 *
 * PURPOSE:
 * Enroll the current user in TOTP MFA using Supabase Auth's built-in support.
 * Returns QR code URI for authenticator app setup.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/src/integrations/supabase/server";
import { getCurrentUser } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Cafe Aroma Authenticator",
    });

    if (error) {
      console.error("MFA enroll error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to enroll in MFA" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("MFA enroll error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
