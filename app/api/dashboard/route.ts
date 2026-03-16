import { NextResponse } from "next/server";
import { bootstrapAdapters } from "@/lib/runtimes/bootstrap";
import { getAllAdapters, getAllHealthStatuses } from "@/lib/runtimes/registry";
import type { EntitySummary, SessionSummary } from "@/lib/core/types";

export const dynamic = "force-dynamic";

export async function GET() {
  bootstrapAdapters();
  const adapters = getAllAdapters();

  const [healthResults, entityResults, sessionResults] = await Promise.all([
    getAllHealthStatuses(),
    Promise.allSettled(adapters.map((a) => a.listEntities())),
    Promise.allSettled(adapters.map((a) => a.listSessions({}))),
  ]);

  const entities: EntitySummary[] = [];
  entityResults.forEach((r, i) => {
    if (r.status === "fulfilled") entities.push(...r.value);
    else console.error(`[dashboard] ${adapters[i].id} listEntities failed:`, r.reason);
  });

  const sessions: SessionSummary[] = [];
  sessionResults.forEach((r, i) => {
    if (r.status === "fulfilled") sessions.push(...r.value);
    else console.error(`[dashboard] ${adapters[i].id} listSessions failed:`, r.reason);
  });

  const now = Date.now();
  const activeSessions = sessions.filter(
    (s) => s.lastActiveMs && now - s.lastActiveMs < 5 * 60 * 1000
  );
  const recentSessions = sessions.filter(
    (s) => s.lastActiveMs && now - s.lastActiveMs < 24 * 60 * 60 * 1000
  );
  const recentMessages = recentSessions.reduce(
    (sum, s) => sum + (s.usage?.messageCount ?? 0),
    0
  );

  return NextResponse.json({
    runtimes: healthResults,
    summary: {
      runtimeCount: adapters.length,
      entityCount: entities.length,
      sessionCount: sessions.length,
      activeSessionCount: activeSessions.length,
      recentMessageCount: recentMessages,
    },
    entities,
    recentSessions: sessions
      .sort((a, b) => (b.lastActiveMs ?? 0) - (a.lastActiveMs ?? 0))
      .slice(0, 20),
  });
}
