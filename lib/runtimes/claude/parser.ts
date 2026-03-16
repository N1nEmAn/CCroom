import fs from "fs";

export interface ClaudeMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
  inputTokens?: number;
  outputTokens?: number;
}

export interface ParsedClaudeSession {
  sessionId: string;
  messages: ClaudeMessage[];
  firstUserMessage?: string;
  lastActiveAt?: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export function parseJsonlFile(filePath: string): ParsedClaudeSession {
  const sessionId = require("path").basename(filePath, ".jsonl");
  const messages: ClaudeMessage[] = [];
  let firstUserMessage: string | undefined;
  let lastActiveAt: number | undefined;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        // Claude Code JSONL format: each line is a conversation turn
        const role = entry.role as "user" | "assistant" | "system";
        if (!role) continue;

        let content = "";
        if (typeof entry.content === "string") {
          content = entry.content;
        } else if (Array.isArray(entry.content)) {
          content = entry.content
            .map((c: any) => (typeof c === "string" ? c : c?.text || ""))
            .join("");
        }

        const ts: number | undefined =
          entry.timestamp ||
          (entry.message?.created_at
            ? new Date(entry.message.created_at).getTime()
            : undefined);

        const inputTok: number =
          entry.usage?.input_tokens ||
          entry.message?.usage?.input_tokens ||
          0;
        const outputTok: number =
          entry.usage?.output_tokens ||
          entry.message?.usage?.output_tokens ||
          0;

        totalInputTokens += inputTok;
        totalOutputTokens += outputTok;

        if (ts && ts > (lastActiveAt || 0)) lastActiveAt = ts;
        if (role === "user" && !firstUserMessage && content) {
          firstUserMessage = content.slice(0, 120);
        }

        messages.push({ role, content, timestamp: ts, inputTokens: inputTok, outputTokens: outputTok });
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // file unreadable
  }

  return { sessionId, messages, firstUserMessage, lastActiveAt, totalInputTokens, totalOutputTokens };
}
