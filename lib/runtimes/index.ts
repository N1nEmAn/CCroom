// Register all runtime adapters on first import.
// Import this file once (e.g. in API route handlers) to ensure all adapters are available.
import { registerAdapter } from "./registry";
import { openclawAdapter } from "./openclaw/adapter";
import { claudeAdapter } from "./claude/adapter";
import { codexAdapter } from "./codex/adapter";

registerAdapter(openclawAdapter);
registerAdapter(claudeAdapter);
registerAdapter(codexAdapter);

export { openclawAdapter, claudeAdapter, codexAdapter };
export { getAdapter, getAllAdapters, getAllHealthStatuses } from "./registry";
export type { RuntimeAdapter } from "./adapter";
