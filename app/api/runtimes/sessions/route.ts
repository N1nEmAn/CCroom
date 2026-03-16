import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { bootstrapAdapters } from "@/lib/runtimes/bootstrap";
import { getAllAdapters, getAdapter } from "@/lib/runtimes/registry";
import type { SessionSummary, SessionFilter } from "@/lib/core/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  bootstrapAdapters();
  const { searchParams } = req.nextUrl;
  const runtimeParam = searchParams.get("runtime");
  const entityId = searchParams.get("entityId") ?? undefined;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

  const filter: SessionFilter = { entityId, limit };

  const adapters = runtimeParam
    ? [getAdapter(runtimeParam as any)].filter(Boolean)
    : getAllAdapters();

  const results = await Promise.allSettled(
    (adapters as NonNullable<ReturnType<typeof getAdapter>>[]).map((a) =>
      a.listSessions(filter)
    )
  );

  const sessions: SessionSummary[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      sessions.push(...r.value);
    } else {
      console.error(`[runtimes/sessions] failed:`, r.reason);
    }
  });

  // sort by lastActiveMs descending
  sessions.sort((a, b) => (b.lastActiveMs ?? 0) - (a.lastActiveMs ?? 0));

  return NextResponse.json(sessions);
}
