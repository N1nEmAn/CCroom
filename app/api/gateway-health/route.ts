import { NextResponse } from "next/server";
import { openclawAdapter } from "@/lib/runtimes/openclaw/adapter";

/**
 * GET /api/gateway-health
 * OpenClaw-specific gateway health check.
 * Returns the openclaw runtime health from the adapter.
 */
export async function GET() {
  try {
    const health = await openclawAdapter.health();
    return NextResponse.json({
      ok: health.status === "online" || health.status === "active" || health.status === "idle",
      runtime: health.runtime,
      status: health.status,
      version: health.version,
      homeFound: health.homeFound,
      cliFound: health.cliFound,
      error: health.error,
      checkedAt: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, status: "error", error: err.message, checkedAt: Date.now() },
      { status: 500 }
    );
  }
}
