// /api/models — aggregate model info across all runtimes.
// Each runtime's capabilities indicate what model info is available.
import { NextResponse } from "next/server";
import { bootstrapAdapters } from "@/lib/runtimes/bootstrap";
import { getAllAdapters } from "@/lib/runtimes/registry";
import type { RuntimeId } from "@/lib/core/types";

export const dynamic = "force-dynamic";

export async function GET() {
  bootstrapAdapters();
  const adapters = getAllAdapters();

  // Gather model info from entity metadata across all runtimes
  const entityResults = await Promise.allSettled(
    adapters.map((a) => a.listEntities())
  );

  const modelsByRuntime: Record<RuntimeId, { id: string; label?: string; provider?: string }[]> = {} as never;

  entityResults.forEach((r, i) => {
    const runtime = adapters[i].id;
    if (r.status !== "fulfilled") {
      modelsByRuntime[runtime] = [];
      return;
    }
    const seen = new Map<string, { id: string; label?: string; provider?: string }>();
    for (const entity of r.value) {
      const m = entity.model;
      if (m?.id && !seen.has(m.id)) {
        seen.set(m.id, { id: m.id, label: m.label, provider: m.provider });
      }
    }
    modelsByRuntime[runtime] = Array.from(seen.values());
  });

  return NextResponse.json(modelsByRuntime);
}
