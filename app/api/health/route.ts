/**
 * GET /api/health
 *
 * PURPOSE:
 * Health check endpoint for uptime monitoring.
 * Returns application and database status.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/src/integrations/supabase/server";

export async function GET() {
  const start = Date.now();

  let dbStatus: "ok" | "error" = "error";
  let dbLatencyMs = 0;

  try {
    const supabase = await createClient();
    const dbStart = Date.now();
    const { error } = await supabase
      .from("settings")
      .select("id")
      .limit(1)
      .single();
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = error ? "error" : "ok";
  } catch {
    dbStatus = "error";
  }

  const totalLatencyMs = Date.now() - start;
  const status = dbStatus === "ok" ? "healthy" : "degraded";

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: dbStatus,
          latency_ms: dbLatencyMs,
        },
      },
      latency_ms: totalLatencyMs,
    },
    { status: status === "healthy" ? 200 : 503 }
  );
}
