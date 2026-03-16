import { NextResponse } from "next/server";
import { bootstrapAdapters } from "@/lib/runtimes/bootstrap";
import { getAllAdapters, getAllHealthStatuses } from "@/lib/runtimes/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  bootstrapAdapters();
  const adapters = getAllAdapters();
  const healthResults = await getAllHealthStatuses();
  const healthMap = new Map(healthResults.map((h) => [h.runtime, h]));

  const runtimes = adapters.map((a) => ({
    id: a.id,
    capabilities: a.capabilities,
    health: healthMap.get(a.id) ?? { runtime: a.id, status: "error" },
  }));

  return NextResponse.json(runtimes);
}
