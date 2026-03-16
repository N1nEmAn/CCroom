// Unified domain types for CCroom multi-runtime dashboard

export type RuntimeId = "openclaw" | "claude" | "codex";

export type RuntimeStatus = "online" | "active" | "idle" | "archived" | "offline" | "error";

export type SessionType =
  | "interactive"
  | "direct"
  | "group"
  | "cron"
  | "thread"
  | "project-session"
  | "unknown";

export type ActionKind =
  | "open_transcript"
  | "resume"
  | "fork"
  | "probe"
  | "open_workspace"
  | "open_runtime_home";

export interface UsageSummary {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  contextTokens?: number;
  messageCount?: number;
  avgResponseMs?: number;
}

export interface ModelSummary {
  id: string;
  provider?: string;
  label?: string;
  /** e.g. 'api_key' | 'oauth' | 'unknown' */
  mode?: string;
  status?: RuntimeStatus;
}

export interface ActionDescriptor {
  kind: ActionKind;
  label: string;
  /** CLI command or URL hint */
  hint?: string;
}

export interface RuntimeHealth {
  runtime: RuntimeId;
  status: RuntimeStatus;
  /** CLI binary present */
  cliFound?: boolean;
  /** Config/home dir present */
  homeFound?: boolean;
  /** Version string if available */
  version?: string;
  error?: string;
}

export interface CapabilitySummary {
  runtime: RuntimeId;
  canListEntities: boolean;
  canListSessions: boolean;
  canResume: boolean;
  canFork: boolean;
  canViewTranscript: boolean;
}

export interface WorkspaceSummary {
  id: string;
  runtime: RuntimeId;
  /** Filesystem path for this workspace */
  path: string;
  label?: string;
  entityCount?: number;
  sessionCount?: number;
  lastActiveAt?: string;
  status?: RuntimeStatus;
}

export interface EntitySummary {
  id: string;
  runtime: RuntimeId;
  /** Display name (agent name, project slug, thread group) */
  label: string;
  /** Local filesystem path associated with this entity */
  workspacePath?: string;
  sessionCount?: number;
  lastActiveAt?: string;
  status?: RuntimeStatus;
  usage?: UsageSummary;
  model?: ModelSummary;
  actions?: ActionDescriptor[];
  /** Raw runtime-specific metadata */
  meta?: Record<string, unknown>;
}

export interface SessionFilter {
  entityId?: string;
  limit?: number;
}

export interface SessionSummary {
  id: string;
  runtime: RuntimeId;
  entityId?: string;
  type: SessionType;
  title?: string;
  startedAt?: string;
  lastActiveAt?: string;
  /** Numeric epoch ms for sort performance */
  lastActiveMs?: number;
  status?: RuntimeStatus;
  usage?: UsageSummary;
  model?: ModelSummary;
  actions?: ActionDescriptor[];
  /** Raw runtime-specific metadata */
  meta?: Record<string, unknown>;
}

export interface EntityStats {
  entityId: string;
  runtime: RuntimeId;
  sessionCount: number;
  totalMessages: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  avgResponseMs?: number;
  firstSeenAt?: string;
  lastActiveAt?: string;
}
