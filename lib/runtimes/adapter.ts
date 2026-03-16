// Runtime adapter interface — every runtime (openclaw, claude, codex) must implement this.
import type {
  RuntimeId,
  RuntimeHealth,
  CapabilitySummary,
  EntitySummary,
  SessionSummary,
  SessionFilter,
  EntityStats,
} from "@/lib/core/types";

export interface RuntimeAdapter {
  readonly id: RuntimeId;
  readonly capabilities: CapabilitySummary;

  /** Check whether this runtime is installed and accessible. */
  health(): Promise<RuntimeHealth>;

  /** List top-level entities (agents, projects, workspaces). */
  listEntities(): Promise<EntitySummary[]>;

  /** List sessions, optionally filtered. */
  listSessions(filter: SessionFilter): Promise<SessionSummary[]>;

  /** Aggregate stats for a given entity. */
  entityStats(entityId: string): Promise<EntityStats | null>;
}
