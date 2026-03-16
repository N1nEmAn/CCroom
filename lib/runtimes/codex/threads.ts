import { findCodexStateDb } from "./paths";
import { sqliteQuery } from "./sqlite";

export interface CodexThread {
  id: string;
  cwd?: string;
  title?: string;
  createdAt?: number;
  updatedAt?: number;
  archived: boolean;
  messageCount: number;
}

export async function listCodexThreads(): Promise<CodexThread[]> {
  const dbPath = findCodexStateDb();
  if (!dbPath) return [];

  // Try common Codex thread table schemas
  const rows = await sqliteQuery(
    dbPath,
    `SELECT id,
            cwd,
            title,
            created_at,
            updated_at,
            archived,
            message_count
     FROM threads
     ORDER BY updated_at DESC
     LIMIT 500`
  );

  return rows.map((r) => ({
    id: r.id || "",
    cwd: r.cwd || undefined,
    title: r.title || undefined,
    createdAt: r.created_at ? Number(r.created_at) : undefined,
    updatedAt: r.updated_at ? Number(r.updated_at) : undefined,
    archived: r.archived === "1" || r.archived === "true",
    messageCount: r.message_count ? Number(r.message_count) : 0,
  }));
}

export async function listCodexStage1Outputs(threadId: string): Promise<string[]> {
  const dbPath = findCodexStateDb();
  if (!dbPath) return [];
  const rows = await sqliteQuery(
    dbPath,
    `SELECT output FROM stage1_outputs WHERE thread_id = '${threadId.replace(/'/g, "''")}'`
  );
  return rows.map((r) => r.output || "").filter(Boolean);
}
