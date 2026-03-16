// Register all runtime adapters at startup.
// Import this file once in the server-side bootstrap (e.g. API routes or server components).
import { registerAdapter } from "./registry";
import { openclawAdapter } from "./openclaw/adapter";
import { claudeAdapter } from "./claude/adapter";
import { codexAdapter } from "./codex/adapter";

let _bootstrapped = false;

export function bootstrapAdapters(): void {
  if (_bootstrapped) return;
  _bootstrapped = true;
  registerAdapter(openclawAdapter);
  registerAdapter(claudeAdapter);
  registerAdapter(codexAdapter);
}
