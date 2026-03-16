import path from "path";
import { CLAUDE_PROJECTS_DIR, jsonlFilesInDir } from "./paths";
import { parseJsonlFile } from "./parser";
import type { ParsedClaudeSession } from "./parser";

export interface ClaudeSessionInfo extends ParsedClaudeSession {
  projectSlug: string;
  filePath: string;
  messageCount: number;
}

export function listSessionsForProject(projectSlug: string): ClaudeSessionInfo[] {
  const dir = path.join(CLAUDE_PROJECTS_DIR, projectSlug);
  const files = jsonlFilesInDir(dir);
  return files.map((f) => {
    const parsed = parseJsonlFile(f);
    return {
      ...parsed,
      projectSlug,
      filePath: f,
      messageCount: parsed.messages.length,
    };
  });
}

export function listAllClaudeSessions(): ClaudeSessionInfo[] {
  const { claudeProjectDirs } = require("./paths");
  const dirs: string[] = claudeProjectDirs();
  const results: ClaudeSessionInfo[] = [];
  for (const dir of dirs) {
    const slug = path.basename(dir);
    results.push(...listSessionsForProject(slug));
  }
  return results;
}
