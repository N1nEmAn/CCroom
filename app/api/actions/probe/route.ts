import { NextRequest, NextResponse } from "next/server";
import { getAllAdapters, getAdapter } from "@/lib/runtimes/registry";
import type { RuntimeId } from "@/lib/core/types";

/**
 * POST /api/actions/probe
 * Body: { runtime?: RuntimeId }  — omit to probe all runtimes
 *
 * Re-runs health checks for the given runtime(s) and returns fresh status.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    const raw = await req.json();
    if (raw && typeof raw === "object") body = raw as Record<string, unknown>;
  } catch {
    // empty body is fine — probe all
  }

  const targetRuntime = body.runtime as RuntimeId | undefined;

  const adapters = targetRuntime
    ? (getAdapter(targetRuntime) ? [getAdapter(targetRuntime)!] : [])
    : getAllAdapters();

  if (targetRuntime && adapters.length === 0) {
    return NextResponse.json(
      { error: `unknown runtime '${targetRuntime}'` },
      { status: 400 }
    );
  }

  const results = await Promise.all(
    adapters.map(async (adapter) => {
      try {
        const health = await adapter.health();
        return health;
      } catch (err) {
        return {
          runtime: adapter.id,
          status: "error" as const,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    })
  );

  return NextResponse.json({ ok: true, results });
}
