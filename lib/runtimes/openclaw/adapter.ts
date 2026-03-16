import fs from "fs";
import path from "path";
import os from "os";
import type { RuntimeAdapter } from "../adapter";
import type {
  RuntimeId,
  RuntimeHealth,
  CapabilitySummary,
  EntitySummary,
  SessionSummary,
  EntityStats,
  RuntimeStatus,
} from "@/lib/core/types";

const home = os.homedir();
const OPENCLAW_HOME =
  process.env.CCROOM_OPENCLAW_HOME ||
  process.env.OPENCLAW_HOME ||
  path.join(home, ".openclaw");

function agentStatus(lastActiveMs: number | null, lastAssistantMs: number | null): RuntimeStatus {
  if (!lastActiveMs) return "offline";
  const now = Date.now();
  const diff = now - lastActiveMs;
  if (lastAssistantMs && now - lastAssistantMs < 3 * 60 * 1000) return "active";
  if (diff < 10 * 60 * 1000) return "online";
  if (diff < 24 * 60 * 60 * 1000) return "idle";
  return "offline";
}

function scanAgentActivity(agentId: string): { lastActiveMs: number | null; lastAssistantMs: number | null; messageCount: number } {
  const sessionsDir = path.join(OPENCLAW_HOME, "agents", agentId, "sessions");
  let lastActiveMs: number | null = null;
  let lastAssistantMs: number | null = null;
  let messageCount = 0;

  try {
    const sessionsPath = path.join(sessionsDir, "sessions.json");
    const sessions = JSON.parse(fs.readFileSync(sessionsPath, "utf-8"));
    for (const val of Object.values(sessions)) {
      const ts = (val as any).updatedAt || 0;
      if (ts > (lastActiveMs || 0)) lastActiveMs = ts;
    }
  } catch {}

  try {
    const files = fs
      .readdirSync(sessionsDir)
      .filter((f) => f.endsWith(".jsonl") && !f.includes(".deleted."))
      .map((f) => ({ name: f, mtime: fs.statSync(path.join(sessionsDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 10);

    for (const file of files) {
      const content = fs.readFileSync(path.join(sessionsDir, file.name), "utf-8");
      const lines = content.trim().split("\n");
      messageCount += lines.length;
      for (let i = lines.length - 1; i >= Math.max(0, lines.length - 20); i--) {
        try {
          const entry = JSON.parse(lines[i]);
          if (entry.type === "message" && entry.message?.role === "assistant" && entry.timestamp) {
            const ts = new Date(entry.timestamp).getTime();
            if (!lastAssistantMs || ts > lastAssistantMs) lastAssistantMs = ts;
            if (ts > (lastActiveMs || 0)) lastActiveMs = ts;
          }
        } catch {}
      }
    }
  } catch {}

  return { lastActiveMs, lastAssistantMs, messageCount };
}

export const openclawAdapter: RuntimeAdapter = {
  id: "openclaw" as RuntimeId,

  capabilities: {
    runtime: "openclaw",
    canListEntities: true,
    canListSessions: true,
    canResume: false,
    canFork: false,
    canViewTranscript: true,
  } satisfies CapabilitySummary,

  async health(): Promise<RuntimeHealth> {
    const homeExists = fs.existsSync(OPENCLAW_HOME);
    const configExists = fs.existsSync(path.join(OPENCLAW_HOME, "openclaw.json"));
    if (!homeExists) {
      return { runtime: "openclaw", status: "offline", homeFound: false, cliFound: false };
    }
    return {
      runtime: "openclaw",
      status: configExists ? "online" : "idle",
      homeFound: true,
      cliFound: configExists,
    };
  },

  async listEntities(): Promise<EntitySummary[]> {
    const agentsDir = path.join(OPENCLAW_HOME, "agents");
    let agentIds: string[];
    try {
      agentIds = fs
        .readdirSync(agentsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith("."))
        .map((d) => d.name);
    } catch {
      return [];
    }

    return agentIds.map((id): EntitySummary => {
      const { lastActiveMs, lastAssistantMs } = scanAgentActivity(id);
      return {
        id,
        runtime: "openclaw",
        label: id,
        workspacePath: path.join(OPENCLAW_HOME, "agents", id),
        status: agentStatus(lastActiveMs, lastAssistantMs),
        lastActiveAt: lastActiveMs ? new Date(lastActiveMs).toISOString() : undefined,
        meta: { type: "agent" },
      };
    });
  },

  async listSessions(entityId: string | null): Promise<SessionSummary[]> {
    const agentIds = entityId
      ? [entityId]
      : (() => {
          try {
            return fs
              .readdirSync(path.join(OPENCLAW_HOME, "agents"), { withFileTypes: true })
              .filter((d) => d.isDirectory())
              .map((d) => d.name);
          } catch {
            return [];
          }
        })();

    const results: SessionSummary[] = [];
    for (const agentId of agentIds) {
      const sessionsDir = path.join(OPENCLAW_HOME, "agents", agentId, "sessions");
      try {
        const raw = fs.readFileSync(path.join(sessionsDir, "sessions.json"), "utf-8");
        const index = JSON.parse(raw);
        for (const [sid, val] of Object.entries(index)) {
          const v = val as any;
          results.push({
            id: sid,
            entityId: agentId,
            runtime: "openclaw",
            type: "interactive",
            title: v.title || sid,
            lastActiveAt: v.updatedAt ? new Date(v.updatedAt).toISOString() : undefined,
            usage: { messageCount: v.messageCount },
          });
        }
      } catch {}
    }
    return results;
  },

  async entityStats(entityId: string): Promise<EntityStats | null> {
    const { lastActiveMs, messageCount } = scanAgentActivity(entityId);
    const sessionsDir = path.join(OPENCLAW_HOME, "agents", entityId, "sessions");
    let sessionCount = 0;
    try {
      const raw = fs.readFileSync(path.join(sessionsDir, "sessions.json"), "utf-8");
      sessionCount = Object.keys(JSON.parse(raw)).length;
    } catch {}
    return {
      entityId,
      runtime: "openclaw",
      sessionCount,
      totalMessages: messageCount,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      lastActiveAt: lastActiveMs ? new Date(lastActiveMs).toISOString() : undefined,
    };
  },
};
