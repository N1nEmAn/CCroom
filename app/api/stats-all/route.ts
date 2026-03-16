import { NextResponse } from "next/server";
import { getAllAdapters } from "@/lib/runtimes/registry";
import { bootstrapAdapters } from "@/lib/runtimes/bootstrap";

// 60s cache
let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 60_000;

interface DayStat {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  messageCount: number;
}

/**
 * GET /api/stats-all
 * Returns aggregated daily/weekly/monthly stats across all runtimes.
 */
export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  bootstrapAdapters();
  const adapters = getAllAdapters();

  // Collect all sessions from all adapters
  const dayMap: Record<string, DayStat> = {};
  const runtimeTotals: Record<string, { sessions: number; messages: number; inputTokens: number; outputTokens: number }> = {};

  await Promise.allSettled(
    adapters.map(async (adapter) => {
      try {
        const sessions = await adapter.listSessions({});
        runtimeTotals[adapter.id] = { sessions: sessions.length, messages: 0, inputTokens: 0, outputTokens: 0 };
        for (const s of sessions) {
          const dateKey = s.lastActiveAt ? s.lastActiveAt.slice(0, 10) : null;
          if (!dateKey) continue;
          if (!dayMap[dateKey]) {
            dayMap[dateKey] = { date: dateKey, inputTokens: 0, outputTokens: 0, totalTokens: 0, messageCount: 0 };
          }
          const day = dayMap[dateKey];
          day.messageCount += s.usage?.messageCount ?? 0;
          day.inputTokens += s.usage?.inputTokens ?? 0;
          day.outputTokens += s.usage?.outputTokens ?? 0;
          day.totalTokens += s.usage?.totalTokens ?? (s.usage?.inputTokens ?? 0) + (s.usage?.outputTokens ?? 0);
          runtimeTotals[adapter.id].messages += s.usage?.messageCount ?? 0;
          runtimeTotals[adapter.id].inputTokens += s.usage?.inputTokens ?? 0;
          runtimeTotals[adapter.id].outputTokens += s.usage?.outputTokens ?? 0;
        }
      } catch {}
    })
  );

  const daily = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

  // Weekly aggregation
  const weekMap: Record<string, DayStat> = {};
  for (const d of daily) {
    const dt = new Date(d.date + "T00:00:00Z");
    const dow = dt.getUTCDay();
    const offset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(dt.getTime() + offset * 86400000).toISOString().slice(0, 10);
    if (!weekMap[monday]) weekMap[monday] = { date: monday, inputTokens: 0, outputTokens: 0, totalTokens: 0, messageCount: 0 };
    weekMap[monday].inputTokens += d.inputTokens;
    weekMap[monday].outputTokens += d.outputTokens;
    weekMap[monday].totalTokens += d.totalTokens;
    weekMap[monday].messageCount += d.messageCount;
  }

  // Monthly aggregation
  const monthMap: Record<string, DayStat> = {};
  for (const d of daily) {
    const mk = d.date.slice(0, 7);
    if (!monthMap[mk]) monthMap[mk] = { date: mk, inputTokens: 0, outputTokens: 0, totalTokens: 0, messageCount: 0 };
    monthMap[mk].inputTokens += d.inputTokens;
    monthMap[mk].outputTokens += d.outputTokens;
    monthMap[mk].totalTokens += d.totalTokens;
    monthMap[mk].messageCount += d.messageCount;
  }

  const data = {
    daily,
    weekly: Object.values(weekMap).sort((a, b) => a.date.localeCompare(b.date)),
    monthly: Object.values(monthMap).sort((a, b) => a.date.localeCompare(b.date)),
    runtimeTotals,
  };

  cache = { data, ts: Date.now() };
  return NextResponse.json(data);
}
