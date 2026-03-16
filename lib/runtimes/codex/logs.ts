import { findCodexLogsDb } from "./paths";
import { sqliteQuery } from "./sqlite";

export interface CodexLogEntry {
  id: string;
  threadId?: string;
  target?: string;
  level?: string;
  message?: string;
  timestamp?: number;
}

export async function listCodexLogs(threadId?: string): Promise<CodexLogEntry[]> {
  const dbPath = findCodexLogsDb();
  if (!dbPath) return [];

  const where = threadId
    ? `WHERE thread_id = '${threadId.replace(/'/g, "''")}' `
    : "";

  const rows = await sqliteQuery(
    dbPath,
    `SELECT id, thread_id, target, level, message, timestamp
     FROM logs
     ${where}
     ORDER BY timestamp DESC
     LIMIT 1000`
  );

  return rows.map((r) => ({
    id: r.id || "",
    threadId: r.thread_id || undefined,
    target: r.target || undefined,
    level: r.level || undefined,
    message: r.message || undefined,
    timestamp: r.timestamp ? Number(r.timestamp) : undefined,
  }));
}

export async function latestLogTimestamp(threadId: string): Promise<number | undefined> {
  const dbPath = findCodexLogsDb();
  if (!dbPath) return undefined;
  const rows = await sqliteQuery(
    dbPath,
    `SELECT MAX(timestamp) as ts FROM logs WHERE thread_id = '${threadId.replace(/'/g, "''")}' LIMIT 1`
  );
  return rows[0]?.ts ? Number(rows[0].ts) : undefined;
}
