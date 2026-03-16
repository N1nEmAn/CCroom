import fs from "fs";
import path from "path";
import { claudeProjectDirs, jsonlFilesInDir } from "./paths";
import { parseJsonlFile } from "./parser";

export interface ClaudeProjectInfo {
  slug: string;
  dirPath: string;
  /** Reconstructed workspace path: slug uses '-' for '/' so we reverse it */
  workspacePath: string;
  sessionFiles: string[];
  sessionCount: number;
  totalMessages: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  lastActiveAt?: number;
  firstPrompt?: string;
}

function slugToPath(slug: string): string {
  // Claude stores project dirs as sanitized slugs like "-home-user-myproject"
  // Attempt a best-effort reconstruction
  return slug.replace(/^-/, "/").replace(/-/g, "/");
}

export function listClaudeProjects(): ClaudeProjectInfo[] {
  const dirs = claudeProjectDirs();
  const projects: ClaudeProjectInfo[] = [];

  for (const dirPath of dirs) {
    const slug = path.basename(dirPath);
    const sessionFiles = jsonlFilesInDir(dirPath);

    let totalMessages = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let lastActiveAt: number | undefined;
    let firstPrompt: string | undefined;

    for (const f of sessionFiles) {
      const parsed = parseJsonlFile(f);
      totalMessages += parsed.messages.length;
      totalInputTokens += parsed.totalInputTokens;
      totalOutputTokens += parsed.totalOutputTokens;
      if (parsed.lastActiveAt && parsed.lastActiveAt > (lastActiveAt || 0)) {
        lastActiveAt = parsed.lastActiveAt;
      }
      if (!firstPrompt && parsed.firstUserMessage) {
        firstPrompt = parsed.firstUserMessage;
      }
    }

    projects.push({
      slug,
      dirPath,
      workspacePath: slugToPath(slug),
      sessionFiles,
      sessionCount: sessionFiles.length,
      totalMessages,
      totalInputTokens,
      totalOutputTokens,
      lastActiveAt,
      firstPrompt,
    });
  }

  return projects;
}
