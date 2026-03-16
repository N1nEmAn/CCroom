// Runtime adapter registry — central place to access all adapters.
import type { RuntimeAdapter } from "./adapter";
import type { RuntimeId, RuntimeHealth } from "@/lib/core/types";

const adapters = new Map<RuntimeId, RuntimeAdapter>();

export function registerAdapter(adapter: RuntimeAdapter): void {
  adapters.set(adapter.id, adapter);
}

export function getAdapter(id: RuntimeId): RuntimeAdapter | undefined {
  return adapters.get(id);
}

export function getAllAdapters(): RuntimeAdapter[] {
  return Array.from(adapters.values());
}

export async function getAllHealthStatuses(): Promise<RuntimeHealth[]> {
  const results = await Promise.allSettled(
    getAllAdapters().map((a) => a.health())
  );
  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    const id = getAllAdapters()[i].id;
    return { runtime: id, status: "error" as const, error: String((r as PromiseRejectedResult).reason) };
  });
}
