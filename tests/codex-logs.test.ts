import { describe, it, expect } from "vitest";

// Test the pure data-mapping logic from listCodexLogs row mapper.
function mapLogRow(r: Record<string, unknown>) {
  return {
    id: r.id || "",
    threadId: r.thread_id || undefined,
    target: r.target || undefined,
    level: r.level || undefined,
    message: r.message || undefined,
    timestamp: r.timestamp ? Number(r.timestamp) : undefined,
  };
}

describe("Codex log row mapper", () => {
  it("maps a full row correctly", () => {
    const row = {
      id: "log-1",
      thread_id: "thread-abc",
      target: "codex::agent",
      level: "info",
      message: "Task started",
      timestamp: "1700000000000",
    };
    const result = mapLogRow(row);
    expect(result.id).toBe("log-1");
    expect(result.threadId).toBe("thread-abc");
    expect(result.target).toBe("codex::agent");
    expect(result.level).toBe("info");
    expect(result.message).toBe("Task started");
    expect(result.timestamp).toBe(1700000000000);
  });

  it("returns empty id when id is missing", () => {
    expect(mapLogRow({}).id).toBe("");
  });

  it("returns undefined threadId when thread_id is missing", () => {
    expect(mapLogRow({}).threadId).toBeUndefined();
  });

  it("returns undefined timestamp when timestamp is missing", () => {
    expect(mapLogRow({}).timestamp).toBeUndefined();
  });

  it("coerces numeric timestamp to number", () => {
    expect(mapLogRow({ timestamp: 9999 }).timestamp).toBe(9999);
  });

  it("returns undefined message when message is empty string", () => {
    // empty string is falsy, so it becomes undefined
    expect(mapLogRow({ message: "" }).message).toBeUndefined();
  });

  it("returns the message when present", () => {
    expect(mapLogRow({ message: "hello" }).message).toBe("hello");
  });
});

describe("latestLogTimestamp row extraction", () => {
  // Test the tiny extraction logic from latestLogTimestamp
  function extractTs(rows: Array<Record<string, unknown>>): number | undefined {
    return rows[0]?.ts ? Number(rows[0].ts) : undefined;
  }

  it("returns the timestamp when present", () => {
    expect(extractTs([{ ts: "1700000000000" }])).toBe(1700000000000);
  });

  it("returns undefined when ts is falsy", () => {
    expect(extractTs([{ ts: null }])).toBeUndefined();
    expect(extractTs([{ ts: 0 }])).toBeUndefined();
  });

  it("returns undefined when rows is empty", () => {
    expect(extractTs([])).toBeUndefined();
  });
});
