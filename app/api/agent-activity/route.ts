import { NextResponse } from "next/server";
import { bootstrapAdapters } from "@/lib/runtimes/bootstrap";
import { getAllAdapters } from "@/lib/runtimes/registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/agent-activity
 * Returns recent session activity across all runtimes.
 * Originally OpenClaw-only; now multi-runtime.
 * Query params:
 *   - limit: max sessions to return (default 20)
 *   - runtime: filter to a specific runtime
 */
export async function GET(req: Request) {
  bootstrapAdapters();
  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const runtimeFilter = searchParams.get("runtime") ?? undefined;

  const adapters = getAllAdapters().filter(
    (a) => !runtimeFilter || a.id === runtimeFilter
  );

  const allSessions: Array<{
    sessionId: string;
    runtime: string;
    entityId: string;
    title?: string;
    status?: string;
    lastActiveAt?: string;
    messageCount?: number;
    totalTokens?: number;
  }> = [];

  await Promise.allSettled(
    adapters.map(async (adapter) => {
      try {
        const sessions = await adapter.listSessions({ limit });
        for (const s of sessions) {
          allSessions.push({
            sessionId: s.id,
            runtime: adapter.id,
            entityId: s.entityId ?? "",
            title: s.title,
            status: s.status,
            lastActiveAt: s.lastActiveAt,
            messageCount: s.usage?.messageCount,
            totalTokens: s.usage?.totalTokens,
          });
        }
      } catch {
        // skip failed adapter
      }
    })
  );

  allSessions.sort((a, b) => {
    const ta = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
    const tb = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
    return tb - ta;
  });

  return NextResponse.json({
    sessions: allSessions.slice(0, limit),
    total: allSessions.length,
    generatedAt: Date.now(),
  });
}
