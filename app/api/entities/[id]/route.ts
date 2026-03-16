import { NextResponse } from "next/server";
import { bootstrapAdapters } from "@/lib/runtimes/bootstrap";
import { getAllAdapters } from "@/lib/runtimes/registry";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  bootstrapAdapters();
  const { id } = await params;

  const adapters = getAllAdapters();

  // Find the entity across all runtimes
  const entityResults = await Promise.allSettled(
    adapters.map((a) => a.listEntities())
  );

  let entity = null;
  let adapterForEntity = null;
  for (let i = 0; i < adapters.length; i++) {
    const r = entityResults[i];
    if (r.status === "fulfilled") {
      const found = r.value.find((e) => e.id === id);
      if (found) {
        entity = found;
        adapterForEntity = adapters[i];
        break;
      }
    }
  }

  if (!entity || !adapterForEntity) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  const [stats, sessions] = await Promise.allSettled([
    adapterForEntity.entityStats(id),
    adapterForEntity.listSessions({ entityId: id }),
  ]);

  return NextResponse.json({
    entity,
    stats: stats.status === "fulfilled" ? stats.value : null,
    sessions: sessions.status === "fulfilled" ? sessions.value : [],
  });
}
