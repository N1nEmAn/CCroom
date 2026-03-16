import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * POST /api/actions/resume
 * Body: { runtime: "claude" | "codex", sessionId: string }
 *
 * Launches a resume command in a detached shell so the session
 * continues running after the response is sent.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "body must be an object" }, { status: 400 });
  }

  const { runtime, sessionId } = body as Record<string, unknown>;

  if (typeof sessionId !== "string" || !sessionId.trim()) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  // Sanitize: sessionId must be alphanumeric/dash/underscore only
  if (!/^[\w-]+$/.test(sessionId)) {
    return NextResponse.json({ error: "invalid sessionId format" }, { status: 400 });
  }

  let cmd: string;
  if (runtime === "claude") {
    cmd = `claude -r ${sessionId}`;
  } else if (runtime === "codex") {
    cmd = `codex resume ${sessionId}`;
  } else {
    return NextResponse.json(
      { error: `runtime '${runtime}' does not support resume` },
      { status: 400 }
    );
  }

  try {
    // Run in a new terminal if possible; fall back to background exec
    const termCmd = process.env.TERMINAL
      ? `${process.env.TERMINAL} -e '${cmd}'`
      : `nohup ${cmd} &`;
    await execAsync(termCmd, { timeout: 3000 }).catch(() => {
      // Ignore timeout/exit errors — process is detached
    });
    return NextResponse.json({ ok: true, cmd });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
