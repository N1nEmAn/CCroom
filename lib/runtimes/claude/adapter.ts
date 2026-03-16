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
    return checkClaudeHealth();
  },

  async listEntities(): Promise<EntitySummary[]> {
    const projects = listClaudeProjects();
    return projects.map((p) => ({
      id: p.slug,
      runtime: "claude",
      displayName: p.firstPrompt ? p.firstPrompt.slice(0, 60) : p.slug,
      workspacePath: p.workspacePath,
      status: projectStatus(p.lastActiveAt),
      lastActiveAt: p.lastActiveAt ? new Date(p.lastActiveAt).toISOString() : undefined,
      sessionCount: p.sessionCount,
      type: "project",
      actions: claudeActions(),
    }));
  },

  async listSessions(entityId: string | null): Promise<SessionSummary[]> {
    const sessions = entityId
      ? listSessionsForProject(entityId)
      : listAllClaudeSessions();

    return sessions.map((s) => ({
      id: s.sessionId,
      entityId: s.projectSlug,
      runtime: "claude",
      type: "project-session",
      label: s.firstUserMessage ? s.firstUserMessage.slice(0, 80) : s.sessionId,
      lastActiveAt: s.lastActiveAt ? new Date(s.lastActiveAt).toISOString() : undefined,
      usage: {
        messageCount: s.messageCount,
        inputTokens: s.totalInputTokens,
        outputTokens: s.totalOutputTokens,
        totalTokens: s.totalInputTokens + s.totalOutputTokens,
      },
    }));
  },

  async entityStats(entityId: string): Promise<EntityStats | null> {
    const projects = listClaudeProjects();
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
