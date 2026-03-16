import { NextResponse } from "next/server";
import { bootstrapAdapters } from "@/lib/runtimes/bootstrap";
import { getAllAdapters } from "@/lib/runtimes/registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/activity-heatmap
 * Returns per-day message/token counts across all runtimes for heatmap rendering.
 * Query params:
 *   - days: number of days to look back (default 90)
 *   - runtime: filter to a single runtime
 */
export async function GET(req: Request) {
  bootstrapAdapters();
  const { searchParams } = new URL(req.url);
  const days = Math.min(365, Math.max(1, parseInt(searchParams.get("days") ?? "90", 10)));
  const runtimeFilter = searchParams.get("runtime") ?? undefined;

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const adapters = getAllAdapters().filter(
    (a) => !runtimeFilter || a.id === runtimeFilter
  );

  // date -> { messageCount, totalTokens }
  const dayMap: Record<string, { date: string; messageCount: number; totalTokens: number }> = {};

  await Promise.allSettled(
    adapters.map(async (adapter) => {
      try {
        const sessions = await adapter.listSessions({});
        for (const s of sessions) {
          const lastActive = s.lastActiveAt ? new Date(s.lastActiveAt).getTime() : 0;
          if (lastActive < cutoff) continue;
          const date = new Date(lastActive).toISOString().slice(0, 10);
          if (!dayMap[date]) dayMap[date] = { date, messageCount: 0, totalTokens: 0 };
          dayMap[date].messageCount += s.usage?.messageCount ?? 0;
          dayMap[date].totalTokens += s.usage?.totalTokens ?? 0;
        }
      } catch {
        // skip failed adapter
      }
    })
  );

  const heatmap = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  return NextResponse.json({ heatmap, days, generatedAt: Date.now() });
}
