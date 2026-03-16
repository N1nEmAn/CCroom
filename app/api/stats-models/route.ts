import { NextResponse } from "next/server";
import { bootstrapAdapters } from "@/lib/runtimes/bootstrap";
import { getAllAdapters } from "@/lib/runtimes/registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/stats-models
 * Returns model usage aggregated across all runtimes.
 * Each entry: { model, provider, runtime, sessionCount, totalTokens }
 */
export async function GET() {
  bootstrapAdapters();
  const adapters = getAllAdapters();

  const modelMap: Record<
    string,
    { model: string; provider: string; runtime: string; sessionCount: number; totalTokens: number }
  > = {};

  await Promise.allSettled(
    adapters.map(async (adapter) => {
      try {
        const sessions = await adapter.listSessions({});
        for (const s of sessions) {
          const model = s.model?.id ?? "unknown";
          const provider = s.model?.provider ?? adapter.id;
          const key = `${adapter.id}:${provider}:${model}`;
          if (!modelMap[key]) {
            modelMap[key] = { model, provider, runtime: adapter.id, sessionCount: 0, totalTokens: 0 };
          }
          modelMap[key].sessionCount++;
          modelMap[key].totalTokens += (s.usage?.totalTokens ?? 0);
        }
      } catch {
        // skip failed adapter
      }
    })
  );

  const models = Object.values(modelMap).sort((a, b) => b.totalTokens - a.totalTokens);
  return NextResponse.json({ models, generatedAt: Date.now() });
}
