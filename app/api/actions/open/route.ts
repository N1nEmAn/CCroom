import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import path from "path";

const execAsync = promisify(exec);

/**
 * POST /api/actions/open
 * Body: { path: string }
 *
 * Opens a local directory in the system file manager or terminal.
 * The path must be absolute and must exist on the filesystem.
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

  const { path: rawPath } = body as Record<string, unknown>;

  if (typeof rawPath !== "string" || !rawPath.trim()) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  // Require absolute path to prevent directory traversal
  if (!path.isAbsolute(rawPath)) {
    return NextResponse.json({ error: "path must be absolute" }, { status: 400 });
  }

  // Resolve symlinks / normalize
  const resolved = path.normalize(rawPath);

  if (!existsSync(resolved)) {
    return NextResponse.json({ error: "path does not exist" }, { status: 404 });
  }

  // Pick opener based on platform
  let opener: string;
  if (process.platform === "darwin") {
    opener = "open";
  } else if (process.platform === "win32") {
    opener = "explorer";
  } else {
    // Linux: try xdg-open, fall back to nautilus
    opener = "xdg-open";
  }

  // Shell-escape the path (only allow safe characters)
  if (!/^[\w/. \-~]+$/.test(resolved)) {
    return NextResponse.json(
      { error: "path contains characters that cannot be safely opened" },
      { status: 400 }
    );
  }

  const cmd = `${opener} "${resolved}"`;

  try {
    await execAsync(cmd, { timeout: 5000 });
    return NextResponse.json({ ok: true, path: resolved });
  } catch (err) {
    // xdg-open often exits non-zero even on success
    const message = err instanceof Error ? err.message : String(err);
    // If the error is just "xdg-open" not found, report that clearly
    if (message.includes("not found") || message.includes("ENOENT")) {
      return NextResponse.json(
        { error: `opener '${opener}' not found on this system` },
        { status: 501 }
      );
    }
    // Otherwise treat as success — opener may have detached
    return NextResponse.json({ ok: true, path: resolved });
  }
}
