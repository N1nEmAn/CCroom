import type { RuntimeAdapter } from "../adapter";
import type {
  RuntimeHealth,
  CapabilitySummary,
  EntitySummary,
  SessionSummary,
  EntityStats,
  RuntimeStatus,
} from "@/lib/core/types";
import { listCodexThreads } from "./threads";
import { listCodexLogs, latestLogTimestamp } from "./logs";
import { checkCodexHealth } from "./health";
import { codexActions } from "./actions";

function threadStatus(
  updatedAt: number | undefined,
  archived: boolean
): RuntimeStatus {
  if (archived) return "archived";
  if (!updatedAt) return "offline";
  const diff = Date.now() - updatedAt;
  if (diff < 5 * 60 * 1000) return "active";
  if (diff < 24 * 60 * 60 * 1000) return "idle";
  return "offline";
}

/** Group threads by cwd to form workspace entities */
function groupByCwd(threads: Awaited<ReturnType<typeof listCodexThreads>>) {
  const map = new Map<
    string,
    { cwd: string; threads: typeof threads; lastUpdated: number; totalMessages: number }
  >();

  for (const t of threads) {
    const key = t.cwd || "(unknown)";
    if (!map.has(key)) {
      map.set(key, { cwd: key, threads: [], lastUpdated: 0, totalMessages: 0 });
    }
    const entry = map.get(key)!;
    entry.threads.push(t);
    if (t.updatedAt && t.updatedAt > entry.lastUpdated) entry.lastUpdated = t.updatedAt;
    entry.totalMessages += t.messageCount;
  }

  return Array.from(map.values());
}

export const codexAdapter: RuntimeAdapter = {
  id: "codex",

  capabilities: {
    runtime: "codex",
    canListEntities: true,
    canListSessions: true,
    canResume: false,
    canFork: false,
    canViewTranscript: true,
  },

  async health(): Promise<RuntimeHealth> {
    return checkCodexHealth();
  },

  async listEntities(): Promise<EntitySummary[]> {
    let threads;
    try {
      threads = await listCodexThreads();
    } catch {
      return [];
    }
    const groups = groupByCwd(threads);
    return groups.map((g) => ({
      id: encodeURIComponent(g.cwd),
      runtime: "codex",
      displayName: g.cwd,
      workspacePath: g.cwd,
      status: threadStatus(g.lastUpdated || undefined, false),
      lastActiveAt: g.lastUpdated ? new Date(g.lastUpdated).toISOString() : undefined,
      sessionCount: g.threads.length,
      type: "workspace",
      actions: codexActions(),
    }));
  },

  async listSessions(entityId: string | null): Promise<SessionSummary[]> {
    let threads;
    try {
      threads = await listCodexThreads();
    } catch {
      return [];
    }

    const filtered = entityId
      ? threads.filter((t) => encodeURIComponent(t.cwd || "(unknown)") === entityId)
      : threads;

    return filtered.map((t) => ({
      id: t.id,
      entityId: encodeURIComponent(t.cwd || "(unknown)"),
      runtime: "codex",
      type: "thread",
      label: t.title || t.id,
      lastActiveAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : undefined,
      usage: {
        messageCount: t.messageCount,
      },
    }));
  },

  async entityStats(entityId: string): Promise<EntityStats | null> {
    let threads;
    try {
      threads = await listCodexThreads();
    } catch {
      return null;
    }
    const cwd = decodeURIComponent(entityId);
    const group = threads.filter((t) => (t.cwd || "(unknown)") === cwd);
    if (group.length === 0) return null;

    const lastUpdated = group.reduce(
      (max, t) => Math.max(max, t.updatedAt || 0),
      0
    );
    const totalMessages = group.reduce((sum, t) => sum + t.messageCount, 0);

    return {
      entityId,
      runtime: "codex",
      sessionCount: group.length,
      totalMessages,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      lastActiveAt: lastUpdated ? new Date(lastUpdated).toISOString() : undefined,
    };
  },
};
