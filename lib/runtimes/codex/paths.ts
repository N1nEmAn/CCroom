import fs from "fs";
import path from "path";
import os from "os";

const home = os.homedir();

export const CODEX_HOME =
  process.env.CCROOM_CODEX_HOME ||
  path.join(home, ".codex");

/** Find the latest state_*.sqlite file */
export function findCodexStateDb(): string | null {
  try {
    const files = fs
      .readdirSync(CODEX_HOME)
      .filter((f) => /^state_\d+\.sqlite$/.test(f))
      .sort()
      .reverse();
    return files.length > 0 ? path.join(CODEX_HOME, files[0]) : null;
  } catch {
    return null;
  }
}

/** Find the latest logs_*.sqlite file */
export function findCodexLogsDb(): string | null {
  try {
    const files = fs
      .readdirSync(CODEX_HOME)
      .filter((f) => /^logs_\d+\.sqlite$/.test(f))
      .sort()
      .reverse();
    return files.length > 0 ? path.join(CODEX_HOME, files[0]) : null;
  } catch {
    return null;
  }
}

export function codexHomeExists(): boolean {
  try {
    return fs.statSync(CODEX_HOME).isDirectory();
  } catch {
    return false;
  }
}
