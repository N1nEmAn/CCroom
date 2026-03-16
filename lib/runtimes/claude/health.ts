import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { CLAUDE_HOME } from "./paths";
import type { RuntimeHealth } from "@/lib/core/types";

const execFileAsync = promisify(execFile);

export async function checkClaudeHealth(): Promise<RuntimeHealth> {
  const homeFound = fs.existsSync(CLAUDE_HOME);
  let cliFound = false;
  let version: string | undefined;
  let error: string | undefined;

  try {
    const { stdout } = await execFileAsync("claude", ["--version"], { timeout: 5000 });
    cliFound = true;
    version = stdout.trim().split("\n")[0];
  } catch (e: any) {
    error = e?.message || String(e);
  }

  const status = cliFound && homeFound ? "online" : homeFound ? "idle" : "offline";

  return {
    runtime: "claude",
    status,
    cliFound,
    homeFound,
    version,
    error,
  };
}
