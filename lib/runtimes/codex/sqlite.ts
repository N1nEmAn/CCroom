// Lightweight SQLite reader using Node.js child_process to call sqlite3 CLI.
// Falls back gracefully if sqlite3 binary is not available.
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface SqliteRow {
  [column: string]: string;
}

/**
 * Run a SQL query against a SQLite file using the sqlite3 CLI.
 * Returns rows as plain objects with string values.
 */
export async function sqliteQuery(dbPath: string, sql: string): Promise<SqliteRow[]> {
  try {
    const { stdout } = await execFileAsync(
      "sqlite3",
      ["-json", dbPath, sql],
      { timeout: 10000, maxBuffer: 10 * 1024 * 1024 }
    );
    if (!stdout.trim()) return [];
    return JSON.parse(stdout) as SqliteRow[];
  } catch {
    return [];
  }
}

/** Check if sqlite3 CLI is available */
export async function isSqliteAvailable(): Promise<boolean> {
  try {
    await execFileAsync("sqlite3", ["--version"], { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
