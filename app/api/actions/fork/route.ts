import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * POST /api/actions/fork
 * Body: { runtime: "codex", sessionId: string }
 *
 * Forks a Codex thread into a new session.
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

  if (runtime !== "codex") {
    return NextResponse.json(
      { error: `runtime '${runtime}' does not support fork` },
      { status: 400 }
    );
  }

  if (typeof sessionId !== "string" || !sessionId.trim()) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  // Sanitize: sessionId must be alphanumeric/dash/underscore only
  if (!/^[\w-]+$/.test(sessionId)) {
    return NextResponse.json({ error: "invalid sessionId format" }, { status: 400 });
  }

  const cmd = `codex fork ${sessionId}`;

  try {
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
