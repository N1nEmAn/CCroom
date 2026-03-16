import type { RuntimeAdapter } from "../adapter";
import type {
  RuntimeHealth,
  CapabilitySummary,
  EntitySummary,
  SessionSummary,
  EntityStats,
  RuntimeStatus,
} from "@/lib/core/types";
import { listClaudeProjects } from "./projects";
import { listSessionsForProject, listAllClaudeSessions } from "./sessions";
import { checkClaudeHealth } from "./health";
import { claudeActions } from "./actions";
import { cached, cachedSync } from "@/lib/cache";

const HEALTH_TTL = 30_000;
const SESSIONS_TTL = 10_000;

function projectStatus(lastActiveAt: number | undefined): RuntimeStatus {
  if (!lastActiveAt) return "offline";
  const diff = Date.now() - lastActiveAt;
  if (diff < 5 * 60 * 1000) return "active";
  if (diff < 24 * 60 * 60 * 1000) return "idle";
  return "offline";
}

export const claudeAdapter: RuntimeAdapter = {
  id: "claude",

  capabilities: {
    runtime: "claude",
    canListEntities: true,
    canListSessions: true,
    canResume: true,
    canFork: false,
    canViewTranscript: true,
  },

  async health(): Promise<RuntimeHealth> {
    return cached("claude:health", HEALTH_TTL, () => checkClaudeHealth());
  },

  async listEntities(): Promise<EntitySummary[]> {
    const projects = cachedSync("claude:projects", SESSIONS_TTL, () => listClaudeProjects());
    return projects.map((p) => ({
      id: p.slug,
      runtime: "claude",
      label: p.firstPrompt ? p.firstPrompt.slice(0, 60) : p.slug,
      workspacePath: p.workspacePath,
      status: projectStatus(p.lastActiveAt),
      lastActiveAt: p.lastActiveAt ? new Date(p.lastActiveAt).toISOString() : undefined,
      sessionCount: p.sessionCount,
      type: "project",
      actions: claudeActions(),
    }));
  },

  async listSessions({ entityId, limit }: import("@/lib/core/types").SessionFilter = {}): Promise<SessionSummary[]> {
    const cacheKey = entityId ? `claude:sessions:${entityId}` : "claude:sessions:all";
    const sessions = cachedSync(cacheKey, SESSIONS_TTL, () =>
      entityId ? listSessionsForProject(entityId) : listAllClaudeSessions()
    );

    const mapped = sessions.map((s) => ({
      id: s.sessionId,
      entityId: s.projectSlug,
      runtime: "claude" as const,
      type: "project-session" as const,
      title: s.firstUserMessage ? s.firstUserMessage.slice(0, 80) : s.sessionId,
      lastActiveAt: s.lastActiveAt ? new Date(s.lastActiveAt).toISOString() : undefined,
      lastActiveMs: s.lastActiveAt,
      usage: {
        messageCount: s.messageCount,
        inputTokens: s.totalInputTokens,
        outputTokens: s.totalOutputTokens,
        totalTokens: s.totalInputTokens + s.totalOutputTokens,
      },
    }));
    mapped.sort((a, b) => (b.lastActiveMs ?? 0) - (a.lastActiveMs ?? 0));
    return limit ? mapped.slice(0, limit) : mapped;
  },

  async entityStats(entityId: string): Promise<EntityStats | null> {
    const projects = cachedSync("claude:projects", SESSIONS_TTL, () => listClaudeProjects());
    const project = projects.find((p) => p.slug === entityId);
    if (!project) return null;
    return {
      entityId,
      runtime: "claude",
      sessionCount: project.sessionCount,
      totalMessages: project.totalMessages,
      totalInputTokens: project.totalInputTokens,
      totalOutputTokens: project.totalOutputTokens,
      lastActiveAt: project.lastActiveAt ? new Date(project.lastActiveAt).toISOString() : undefined,
    };
  },
};
