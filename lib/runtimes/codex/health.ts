import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { CODEX_HOME, codexHomeExists, findCodexStateDb } from "./paths";
import type { RuntimeHealth } from "@/lib/core/types";

const execFileAsync = promisify(execFile);

export async function checkCodexHealth(): Promise<RuntimeHealth> {
  const homeFound = codexHomeExists();
  const hasStateDb = !!findCodexStateDb();
  let cliFound = false;
  let version: string | undefined;
  let error: string | undefined;

  try {
    const { stdout } = await execFileAsync("codex", ["--version"], { timeout: 5000 });
    cliFound = true;
    version = stdout.trim().split("\n")[0];
  } catch (e: any) {
    error = e?.message || String(e);
  }

  let status: RuntimeHealth["status"] = "offline";
  if (cliFound && homeFound) status = "online";
  else if (homeFound && hasStateDb) status = "idle";
  else if (!homeFound) status = "offline";

  return {
    runtime: "codex",
    status,
    cliFound,
    homeFound,
    version,
    error,
  };
}
