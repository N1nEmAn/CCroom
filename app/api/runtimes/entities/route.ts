import { NextResponse } from "next/server";
import { bootstrapAdapters } from "@/lib/runtimes/bootstrap";
import { getAllAdapters } from "@/lib/runtimes/registry";
import type { EntitySummary } from "@/lib/core/types";

export const dynamic = "force-dynamic";

export async function GET() {
  bootstrapAdapters();
  const adapters = getAllAdapters();
  const results = await Promise.allSettled(
    adapters.map((a) => a.listEntities())
  );
  const entities: EntitySummary[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      entities.push(...r.value);
    } else {
      console.error(`[runtimes/entities] ${adapters[i].id} failed:`, r.reason);
    }
  });
  return NextResponse.json(entities);
}
