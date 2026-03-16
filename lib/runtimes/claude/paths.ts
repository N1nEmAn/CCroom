import fs from "fs";
import path from "path";
import os from "os";

const home = os.homedir();

export const CLAUDE_HOME =
  process.env.CCROOM_CLAUDE_HOME ||
  path.join(home, ".claude");

export const CLAUDE_PROJECTS_DIR = path.join(CLAUDE_HOME, "projects");

export function claudeProjectDirs(): string[] {
  try {
    return fs
      .readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(CLAUDE_PROJECTS_DIR, d.name));
  } catch {
    return [];
  }
}

export function jsonlFilesInDir(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}
